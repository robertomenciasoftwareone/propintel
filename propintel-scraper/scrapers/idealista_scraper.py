"""
Scraper de Idealista usando Playwright (renderiza JS).
Enfoque "compliance-first":
  - identidad de bot estable,
  - rate limiting estricto con jitter,
  - caché temporal por URL para evitar peticiones repetidas,
  - parada automática al detectar bloqueos consecutivos.
"""
import asyncio
import time
import random
import re
from typing import Optional
from loguru import logger

from playwright.async_api import async_playwright, Page
from models.schemas import AnuncioPortal, FuentePrecio, TipoInmueble
from config.settings import settings

BLOCK_INDICATORS = (
    "captcha",
    "access denied",
    "403 forbidden",
    "429 too many requests",
    "too many requests",
    "just a moment",
    "checking your browser",
    "acceso denegado",
    "forbidden",
)

# Zonas de búsqueda por ciudad (slugs de Idealista)
ZONAS_IDEALISTA: dict[str, list[dict]] = {
    "madrid": [
        {"slug": "madrid-capital",            "ciudad": "madrid", "zona": "Madrid"},
        {"slug": "salamanca-madrid",          "ciudad": "madrid", "zona": "Salamanca"},
        {"slug": "chamberi-madrid",           "ciudad": "madrid", "zona": "Chamberí"},
        {"slug": "tetuan-madrid",             "ciudad": "madrid", "zona": "Tetuán"},
        {"slug": "carabanchel-madrid",        "ciudad": "madrid", "zona": "Carabanchel"},
        {"slug": "retiro-madrid",             "ciudad": "madrid", "zona": "Retiro"},
        {"slug": "centro-madrid",             "ciudad": "madrid", "zona": "Centro"},
        {"slug": "arganzuela-madrid",         "ciudad": "madrid", "zona": "Arganzuela"},
        {"slug": "moncloa-aravaca-madrid",    "ciudad": "madrid", "zona": "Moncloa"},
        {"slug": "moratalaz-madrid",          "ciudad": "madrid", "zona": "Moratalaz"},
        {"slug": "vallecas-madrid",           "ciudad": "madrid", "zona": "Vallecas"},
        {"slug": "ciudad-lineal-madrid",      "ciudad": "madrid", "zona": "Ciudad Lineal"},
        {"slug": "hortaleza-madrid",          "ciudad": "madrid", "zona": "Hortaleza"},
        {"slug": "fuencarral-madrid",         "ciudad": "madrid", "zona": "Fuencarral"},
        {"slug": "latina-madrid",             "ciudad": "madrid", "zona": "Latina"},
    ],
    "barcelona": [
        {"slug": "barcelona-capital",         "ciudad": "barcelona", "zona": "Barcelona"},
        {"slug": "eixample-barcelona",        "ciudad": "barcelona", "zona": "Eixample"},
        {"slug": "gracia-barcelona",          "ciudad": "barcelona", "zona": "Gràcia"},
        {"slug": "sant-marti-barcelona",      "ciudad": "barcelona", "zona": "Sant Martí"},
        {"slug": "sarria-sant-gervasi-barcelona", "ciudad": "barcelona", "zona": "Sarrià"},
        {"slug": "les-corts-barcelona",       "ciudad": "barcelona", "zona": "Les Corts"},
        {"slug": "sants-montjuic-barcelona",  "ciudad": "barcelona", "zona": "Sants"},
        {"slug": "nou-barris-barcelona",      "ciudad": "barcelona", "zona": "Nou Barris"},
        {"slug": "horta-guinardo-barcelona",  "ciudad": "barcelona", "zona": "Horta-Guinardó"},
        {"slug": "sant-andreu-barcelona",     "ciudad": "barcelona", "zona": "Sant Andreu"},
        {"slug": "ciudad-vella-barcelona",    "ciudad": "barcelona", "zona": "Ciutat Vella"},
    ],
    "asturias": [
        {"slug": "oviedo",  "ciudad": "asturias", "zona": "Oviedo"},
        {"slug": "gijon",   "ciudad": "asturias", "zona": "Gijón"},
        {"slug": "aviles",  "ciudad": "asturias", "zona": "Avilés"},
        {"slug": "siero",   "ciudad": "asturias", "zona": "Siero"},
        {"slug": "llanera", "ciudad": "asturias", "zona": "Llanera"},
    ],
    "valencia": [
        {"slug": "valencia-capital",          "ciudad": "valencia", "zona": "Valencia"},
        {"slug": "ruzafa-valencia",           "ciudad": "valencia", "zona": "Ruzafa"},
        {"slug": "l-eixample-valencia",       "ciudad": "valencia", "zona": "L'Eixample"},
        {"slug": "campanar-valencia",         "ciudad": "valencia", "zona": "Campanar"},
        {"slug": "quatre-carreres-valencia",  "ciudad": "valencia", "zona": "Quatre Carreres"},
        {"slug": "poblats-maritims-valencia", "ciudad": "valencia", "zona": "Poblats Marítims"},
        {"slug": "extramurs-valencia",        "ciudad": "valencia", "zona": "Extramurs"},
        {"slug": "benimaclet-valencia",       "ciudad": "valencia", "zona": "Benimaclet"},
    ],
    "sevilla": [
        {"slug": "sevilla-capital",           "ciudad": "sevilla", "zona": "Sevilla"},
        {"slug": "triana-sevilla",            "ciudad": "sevilla", "zona": "Triana"},
        {"slug": "los-remedios-sevilla",      "ciudad": "sevilla", "zona": "Los Remedios"},
        {"slug": "nervion-sevilla",           "ciudad": "sevilla", "zona": "Nervión"},
        {"slug": "macarena-sevilla",          "ciudad": "sevilla", "zona": "Macarena"},
        {"slug": "casco-antiguo-sevilla",     "ciudad": "sevilla", "zona": "Casco Antiguo"},
        {"slug": "palmete-sevilla",           "ciudad": "sevilla", "zona": "Sur"},
    ],
}


class IdealistaScraper:

    BASE = "https://www.idealista.com/venta-viviendas"

    # Patrones para detectar tipo de inmueble desde el título
    _TIPO_PATTERNS = [
        (re.compile(r"\bático\b", re.IGNORECASE), TipoInmueble.ATICO),
        (re.compile(r"\bestudio\b", re.IGNORECASE), TipoInmueble.ESTUDIO),
        (re.compile(r"\bdúplex\b", re.IGNORECASE), TipoInmueble.DUPLEX),
        (re.compile(r"\bcasa\b|\bchalet\b|\bvilla\b", re.IGNORECASE), TipoInmueble.CASA),
        (re.compile(r"\bpiso\b|\bapartamento\b", re.IGNORECASE), TipoInmueble.PISO),
    ]

    def __init__(self):
        self._pw = None
        self._last_request_ts = 0.0
        self._consecutive_blocks = 0
        self._page_cache: dict[str, tuple[float, str]] = {}

    async def __aenter__(self):
        self._pw = await async_playwright().start()
        return self

    async def __aexit__(self, *_):
        if self._pw:
            await self._pw.stop()

    async def _nuevo_browser(self):
        """Lanza un browser para una sesión de scraping."""
        return await self._pw.chromium.launch(
            headless=settings.headless_browser,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

    async def _nueva_pagina(self, browser) -> Page:
        context = await browser.new_context(
            user_agent=settings.scraper_user_agent,
            viewport={"width": 1366, "height": 768},
            locale="es-ES",
            timezone_id="Europe/Madrid",
            color_scheme="light",
            extra_http_headers={
                "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            },
        )
        return await context.new_page()

    async def _throttle(self) -> None:
        delay = random.uniform(
            settings.scraper_min_delay_seconds,
            settings.scraper_max_delay_seconds,
        )
        elapsed = time.monotonic() - self._last_request_ts
        to_sleep = max(0.0, delay - elapsed)
        if to_sleep > 0:
            await asyncio.sleep(to_sleep)

    def _is_blocked_content(self, contenido: str) -> bool:
        contenido_l = contenido.lower()
        return any(ind in contenido_l for ind in BLOCK_INDICATORS)

    async def _cargar_url(self, page: Page, url: str) -> Optional[str]:
        now = time.time()
        if settings.scraper_cache_enabled and url in self._page_cache:
            ts, cached_html = self._page_cache[url]
            if (now - ts) <= settings.scraper_cache_ttl_seconds:
                await page.set_content(cached_html, wait_until="domcontentloaded")
                logger.debug(f"Cache hit: {url}")
                return cached_html

        last_error: Exception | None = None
        for intento in range(1, settings.scraper_max_retries + 1):
            try:
                await self._throttle()
                await page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=settings.scraper_timeout_seconds * 1000,
                )
                self._last_request_ts = time.monotonic()
                contenido = await page.content()
                if len(contenido) < 3000 or self._is_blocked_content(contenido):
                    return None
                if settings.scraper_cache_enabled:
                    self._page_cache[url] = (time.time(), contenido)
                return contenido
            except Exception as e:
                last_error = e
                espera = min(30, (2 ** (intento - 1)) + random.uniform(0.5, 1.5))
                logger.warning(
                    f"Error cargando {url} (intento {intento}/{settings.scraper_max_retries}): {e}"
                )
                if intento < settings.scraper_max_retries:
                    await asyncio.sleep(espera)
        if last_error:
            logger.error(f"No se pudo cargar {url}: {last_error}")
        return None

    def _detectar_tipo(self, titulo: str) -> TipoInmueble:
        for pattern, tipo in self._TIPO_PATTERNS:
            if pattern.search(titulo):
                return tipo
        return TipoInmueble.PISO

    async def scrape_zona(
        self,
        slug: str,
        ciudad: str,
        zona: str,
        max_paginas: int = 10,
    ) -> list[AnuncioPortal]:
        """Cada zona usa una sesión de browser aislada y ritmo conservador."""
        anuncios: list[AnuncioPortal] = []
        self._consecutive_blocks = 0
        browser = await self._nuevo_browser()

        try:
            page = await self._nueva_pagina(browser)

            for num_pag in range(1, max_paginas + 1):
                url = (
                    f"{self.BASE}/{slug}/pagina-{num_pag}.htm"
                    if num_pag > 1
                    else f"{self.BASE}/{slug}/"
                )
                logger.debug(f"Idealista → {url}")

                contenido = await self._cargar_url(page, url)
                if not contenido:
                    self._consecutive_blocks += 1
                    logger.warning(
                        f"Bloqueo o contenido inválido en {url} "
                        f"({self._consecutive_blocks}/{settings.scraper_consecutive_block_limit})"
                    )
                    if self._consecutive_blocks >= settings.scraper_consecutive_block_limit:
                        cooldown = settings.scraper_block_cooldown_seconds
                        logger.warning(
                            f"Demasiados bloqueos seguidos en {zona}. "
                            f"Aplicando cooldown de {cooldown}s y saliendo de la zona."
                        )
                        await asyncio.sleep(cooldown)
                        break
                    continue

                self._consecutive_blocks = 0

                items = await page.query_selector_all("article.item")
                if not items:
                    logger.debug(f"Sin resultados en página {num_pag} de {zona}")
                    break

                for item in items:
                    anuncio = await self._parsear_item(item, ciudad, zona)
                    if anuncio:
                        anuncios.append(anuncio)

                logger.info(f"✓ Idealista {zona} p.{num_pag}: {len(items)} anuncios")

        except Exception as e:
            logger.error(f"Error scraping Idealista {zona}: {e}")
        finally:
            await browser.close()

        return anuncios

    async def _parsear_item(
        self, item, ciudad: str, zona: str
    ) -> Optional[AnuncioPortal]:
        try:
            # ── Precio ──────────────────────────────────────────────────
            precio_elem = await item.query_selector(".item-price")
            if not precio_elem:
                return None
            precio_texto = await precio_elem.inner_text()
            precio_total = self._parse_int(precio_texto)
            if not precio_total:
                return None

            # ── Título / URL ─────────────────────────────────────────────
            link_elem = await item.query_selector("a.item-link")
            titulo = await link_elem.inner_text() if link_elem else ""
            href   = await link_elem.get_attribute("href") if link_elem else ""
            url    = f"https://www.idealista.com{href}" if href else ""

            # ── Detalles (superficie, habitaciones) ──────────────────────
            details = await item.query_selector_all(".item-detail")
            superficie = None
            habitaciones = None
            for detail in details:
                texto = await detail.inner_text()
                if "m²" in texto:
                    superficie = self._parse_float(texto.replace("m²", ""))
                elif "hab" in texto.lower():
                    habitaciones = self._parse_int(texto)

            precio_m2 = (
                round(precio_total / superficie, 2)
                if superficie and superficie > 0
                else None
            )

            # ── Foto principal ───────────────────────────────────────────
            foto_principal = None
            img_elem = await item.query_selector("picture img, img.item-multimedia-image, img[data-src]")
            if img_elem:
                foto_principal = (
                    await img_elem.get_attribute("data-src")
                    or await img_elem.get_attribute("src")
                )
                # Descartar placeholders / base64 inline
                if foto_principal and (foto_principal.startswith("data:") or len(foto_principal) < 10):
                    foto_principal = None

            # ── ID externo ───────────────────────────────────────────────
            item_id = await item.get_attribute("data-adid") or url.split("/")[-2]

            return AnuncioPortal(
                id_externo=f"idealista_{item_id}",
                fuente=FuentePrecio.IDEALISTA,
                url=url,
                titulo=titulo.strip(),
                precio_total=precio_total,
                precio_m2=precio_m2,
                superficie_m2=superficie,
                habitaciones=habitaciones,
                ciudad=ciudad,
                distrito=zona,
                tipo=self._detectar_tipo(titulo),
                foto_principal=foto_principal,
            )

        except Exception as e:
            logger.debug(f"Error parseando item: {e}")
            return None

    def _parse_int(self, texto: str) -> Optional[int]:
        try:
            nums = re.sub(r"[^\d]", "", texto.replace(".", "").replace(",", ""))
            return int(nums) if nums else None
        except (ValueError, TypeError):
            return None

    def _parse_float(self, texto: str) -> Optional[float]:
        try:
            limpio = texto.strip().replace(".", "").replace(",", ".").strip()
            nums = re.sub(r"[^\d.]", "", limpio)
            return float(nums) if nums else None
        except (ValueError, TypeError):
            return None

    async def scrape_ciudades(
        self,
        ciudades: list[str] | None = None,
        max_paginas: int = 10,
    ) -> list[AnuncioPortal]:
        """Scraping de todas las zonas de las ciudades indicadas."""
        targets = ciudades or list(ZONAS_IDEALISTA.keys())
        todos: list[AnuncioPortal] = []

        for ciudad in targets:
            zonas = ZONAS_IDEALISTA.get(ciudad, [])
            for z in zonas:
                anuncios = await self.scrape_zona(
                    slug=z["slug"],
                    ciudad=z["ciudad"],
                    zona=z["zona"],
                    max_paginas=max_paginas,
                )
                todos.extend(anuncios)
                pausa = random.uniform(
                    settings.scraper_zone_pause_min_seconds,
                    settings.scraper_zone_pause_max_seconds,
                )
                logger.info(f"⏳ Pausa entre zonas: {pausa:.1f}s")
                await asyncio.sleep(pausa)

        logger.info(f"Idealista scraping completado: {len(todos)} anuncios totales")
        return todos


async def run_idealista_scraper(
    ciudades: list[str] | None = None,
    max_paginas: int = 10,
) -> list[AnuncioPortal]:
    async with IdealistaScraper() as scraper:
        return await scraper.scrape_ciudades(ciudades, max_paginas)


if __name__ == "__main__":
    results = asyncio.run(run_idealista_scraper(["asturias"], max_paginas=1))
    for r in results:
        print(f"{r.distrito}: {r.precio_m2} €/m² — {r.precio_total}€ ({r.superficie_m2}m²)")
