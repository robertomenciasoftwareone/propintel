"""
Scraper de Fotocasa usando Playwright (renderiza JS).
Respeta rate limits — solo datos públicos.
Fotocasa tiene anti-bot más agresivo que Idealista:
  - Delays 4-8s entre peticiones (vs 2.5-4.5s de Idealista)
  - Script adicional para ocultar más fingerprints del navegador
  - Detección de challenge de Cloudflare
"""
import asyncio
import random
import re
import unicodedata
from datetime import datetime
from typing import Optional
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from playwright.async_api import async_playwright, Page, Browser
from models.schemas import AnuncioPortal, FuentePrecio, TipoInmueble
from config.settings import settings


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.86 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

# Zonas de búsqueda por ciudad (slugs de Fotocasa)
# Formato: municipio/zona — se construye como:
#   fotocasa.es/es/comprar/viviendas/{slug}/todas-las-zonas/l
ZONAS_FOTOCASA: dict[str, list[dict]] = {
    "madrid": [
        {"slug": "madrid",                      "ciudad": "madrid",    "zona": "Madrid"},
        {"slug": "madrid/el-retiro",            "ciudad": "madrid",    "zona": "Retiro"},
        {"slug": "madrid/chamberi",             "ciudad": "madrid",    "zona": "Chamberí"},
        {"slug": "madrid/carabanchel",          "ciudad": "madrid",    "zona": "Carabanchel"},
        {"slug": "madrid/tetuan",               "ciudad": "madrid",    "zona": "Tetuán"},
        {"slug": "madrid/vallecas",             "ciudad": "madrid",    "zona": "Vallecas"},
        {"slug": "madrid/ciudad-lineal",        "ciudad": "madrid",    "zona": "Ciudad Lineal"},
        {"slug": "madrid/fuencarral-el-pardo",  "ciudad": "madrid",    "zona": "Fuencarral"},
        {"slug": "madrid/latina",               "ciudad": "madrid",    "zona": "Latina"},
        {"slug": "madrid/moncloa-aravaca",      "ciudad": "madrid",    "zona": "Moncloa"},
        {"slug": "madrid/arganzuela",           "ciudad": "madrid",    "zona": "Arganzuela"},
        {"slug": "madrid/centro",               "ciudad": "madrid",    "zona": "Centro"},
        {"slug": "madrid/hortaleza",            "ciudad": "madrid",    "zona": "Hortaleza"},
        {"slug": "madrid/usera",                "ciudad": "madrid",    "zona": "Usera"},
        {"slug": "madrid/puente-de-vallecas",   "ciudad": "madrid",    "zona": "Puente de Vallecas"},
    ],
    "barcelona": [
        {"slug": "barcelona",                   "ciudad": "barcelona", "zona": "Barcelona"},
        {"slug": "barcelona/eixample",          "ciudad": "barcelona", "zona": "Eixample"},
        {"slug": "barcelona/gracia",            "ciudad": "barcelona", "zona": "Gràcia"},
        {"slug": "barcelona/sant-marti",        "ciudad": "barcelona", "zona": "Sant Martí"},
        {"slug": "barcelona/sarria-sant-gervasi","ciudad": "barcelona", "zona": "Sarrià"},
        {"slug": "barcelona/les-corts",         "ciudad": "barcelona", "zona": "Les Corts"},
        {"slug": "barcelona/sants-montjuic",    "ciudad": "barcelona", "zona": "Sants"},
        {"slug": "barcelona/nou-barris",        "ciudad": "barcelona", "zona": "Nou Barris"},
        {"slug": "barcelona/horta-guinardo",    "ciudad": "barcelona", "zona": "Horta-Guinardó"},
        {"slug": "barcelona/sant-andreu",       "ciudad": "barcelona", "zona": "Sant Andreu"},
        {"slug": "barcelona/ciudad-vieja",      "ciudad": "barcelona", "zona": "Ciutat Vella"},
    ],
    "asturias": [
        {"slug": "oviedo",     "ciudad": "asturias",  "zona": "Oviedo"},
        {"slug": "gijon",      "ciudad": "asturias",  "zona": "Gijón"},
        {"slug": "aviles",     "ciudad": "asturias",  "zona": "Avilés"},
        {"slug": "siero",      "ciudad": "asturias",  "zona": "Siero"},
        {"slug": "llanera",    "ciudad": "asturias",  "zona": "Llanera"},
    ],
    "valencia": [
        {"slug": "valencia",                    "ciudad": "valencia",  "zona": "Valencia"},
        {"slug": "valencia/eixample",           "ciudad": "valencia",  "zona": "L'Eixample"},
        {"slug": "valencia/rascanya",           "ciudad": "valencia",  "zona": "Rascanya"},
        {"slug": "valencia/quatre-carreres",    "ciudad": "valencia",  "zona": "Quatre Carreres"},
        {"slug": "valencia/poblats-maritims",   "ciudad": "valencia",  "zona": "Poblats Marítims"},
        {"slug": "valencia/campanar",           "ciudad": "valencia",  "zona": "Campanar"},
        {"slug": "valencia/benimaclet",         "ciudad": "valencia",  "zona": "Benimaclet"},
        {"slug": "valencia/extramurs",          "ciudad": "valencia",  "zona": "Extramurs"},
    ],
    "sevilla": [
        {"slug": "sevilla",                     "ciudad": "sevilla",   "zona": "Sevilla"},
        {"slug": "sevilla/triana",              "ciudad": "sevilla",   "zona": "Triana"},
        {"slug": "sevilla/los-remedios",        "ciudad": "sevilla",   "zona": "Los Remedios"},
        {"slug": "sevilla/nervion",             "ciudad": "sevilla",   "zona": "Nervión"},
        {"slug": "sevilla/macarena",            "ciudad": "sevilla",   "zona": "Macarena"},
        {"slug": "sevilla/casco-antiguo",       "ciudad": "sevilla",   "zona": "Casco Antiguo"},
        {"slug": "sevilla/sur",                 "ciudad": "sevilla",   "zona": "Sur"},
    ],
}

# Script para ocultar más fingerprints del navegador automático
_STEALTH_SCRIPT = """
    // Ocultar webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // Simular plugins reales
    Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
    });

    // Simular idiomas
    Object.defineProperty(navigator, 'languages', {
        get: () => ['es-ES', 'es', 'en'],
    });

    // Ocultar automatización en Chrome
    window.chrome = { runtime: {} };

    // Permisos — evitar respuestas automáticas que delatan bots
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters)
    );
"""


def slug_desde_nombre(nombre: str) -> str:
    """
    Genera un slug de URL para Fotocasa a partir del nombre del municipio.
    Ejemplo: "L'Hospitalet de Llobregat" → "lhospitalet-de-llobregat"
    """
    # Normalizar Unicode (quitar tildes)
    nfkd = unicodedata.normalize("NFKD", nombre)
    sin_tildes = "".join(c for c in nfkd if not unicodedata.combining(c))
    norm = sin_tildes.lower().strip()

    # Eliminar apóstrofes y caracteres especiales
    norm = norm.replace("'", "").replace("'", "").replace("'", "")
    norm = norm.replace("/", "-").replace("(", "").replace(")", "")
    norm = norm.replace("·", "").replace(".", "")

    # Espacios → guiones
    slug = "-".join(norm.split())
    return slug


class FotocasaScraper:

    BASE = "https://www.fotocasa.es/es/comprar/viviendas"

    # Patrones para detectar tipo de inmueble desde el título
    _TIPO_PATTERNS = [
        (re.compile(r"\bático\b", re.IGNORECASE), TipoInmueble.ATICO),
        (re.compile(r"\bestudio\b", re.IGNORECASE), TipoInmueble.ESTUDIO),
        (re.compile(r"\bdúplex\b", re.IGNORECASE), TipoInmueble.DUPLEX),
        (re.compile(r"\bcasa\b|\bchalet\b|\bvilla\b", re.IGNORECASE), TipoInmueble.CASA),
        (re.compile(r"\bpiso\b|\bapartamento\b", re.IGNORECASE), TipoInmueble.PISO),
    ]

    def __init__(self):
        self.browser: Optional[Browser] = None
        self._pw = None

    async def __aenter__(self):
        self._pw = await async_playwright().start()
        self.browser = await self._pw.chromium.launch(
            headless=settings.headless_browser,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--disable-extensions",
                "--no-first-run",
            ],
        )
        return self

    async def __aexit__(self, *_):
        if self.browser:
            await self.browser.close()
        if self._pw:
            await self._pw.stop()

    async def _nueva_pagina(self) -> Page:
        context = await self.browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": random.randint(1280, 1920), "height": random.randint(768, 1080)},
            locale="es-ES",
            timezone_id="Europe/Madrid",
            # Simular una pantalla con color depth real
            color_scheme="light",
        )
        page = await context.new_page()
        await page.add_init_script(_STEALTH_SCRIPT)
        return page

    def _detectar_tipo(self, titulo: str) -> TipoInmueble:
        for pattern, tipo in self._TIPO_PATTERNS:
            if pattern.search(titulo):
                return tipo
        return TipoInmueble.PISO

    def _detectar_bloqueo(self, url: str, contenido: str) -> bool:
        """Detecta si Fotocasa/Cloudflare nos ha bloqueado."""
        if "challenge" in url or "captcha" in url.lower():
            return True
        indicadores = [
            "Just a moment",
            "Checking your browser",
            "Enable JavaScript and cookies",
            "Access denied",
            "403 Forbidden",
        ]
        return any(ind.lower() in contenido.lower() for ind in indicadores)

    @retry(
        stop=stop_after_attempt(settings.scraper_max_retries),
        wait=wait_exponential(multiplier=2, min=5, max=20),
    )
    async def scrape_zona(
        self,
        slug: str,
        ciudad: str,
        zona: str,
        max_paginas: int = 10,
    ) -> list[AnuncioPortal]:

        page = await self._nueva_pagina()
        anuncios: list[AnuncioPortal] = []

        try:
            for num_pag in range(1, max_paginas + 1):
                # URL de Fotocasa: /es/comprar/viviendas/{slug}/todas-las-zonas/l/{pagina}
                if num_pag == 1:
                    url = f"{self.BASE}/{slug}/todas-las-zonas/l"
                else:
                    url = f"{self.BASE}/{slug}/todas-las-zonas/l/{num_pag}"

                logger.debug(f"Fotocasa → {url}")

                response = await page.goto(url, wait_until="domcontentloaded", timeout=45000)
                await asyncio.sleep(random.uniform(2.0, 3.0))

                # Scroll rápido para activar IntersectionObserver de cada tarjeta
                altura = await page.evaluate("document.body.scrollHeight")
                pos = 0
                while pos < altura:
                    await page.evaluate(f"window.scrollTo(0, {pos})")
                    await asyncio.sleep(0.05)
                    pos += 400
                    altura = await page.evaluate("document.body.scrollHeight")

                await asyncio.sleep(1.5)

                # Comprobar bloqueo / Cloudflare
                contenido = await page.content()
                if self._detectar_bloqueo(page.url, contenido):
                    logger.warning(f"Bloqueo detectado en Fotocasa {zona} p.{num_pag} — parando zona")
                    break

                # Comprobar respuesta HTTP
                if response and response.status in (403, 429):
                    logger.warning(f"HTTP {response.status} en Fotocasa {zona} — parando zona")
                    break

                # Fotocasa: artículos reales tienen link /comprar/vivienda/
                # Los skeleton tienen data-panot-component="skeleton" pero NO link de detalle
                all_articles = await page.query_selector_all("article")
                items = []
                skeletons = 0
                for art in all_articles:
                    link = await art.query_selector("a[href*='/comprar/vivienda/']")
                    if link:
                        items.append(art)
                    else:
                        skeletons += 1

                logger.debug(f"Fotocasa {zona} p.{num_pag}: {len(all_articles)} articles ({len(items)} reales, {skeletons} skeletons)")

                if not items:
                    logger.debug(f"Sin resultados reales Fotocasa en página {num_pag} de {zona}")
                    break

                for item in items:
                    anuncio = await self._parsear_item(item, ciudad, zona)
                    if anuncio:
                        anuncios.append(anuncio)

                logger.info(f"✓ Fotocasa {zona} p.{num_pag}: {len(items)} anuncios")

                # Pausa entre páginas (más larga que Idealista)
                delay_base = max(settings.scraper_delay_seconds, 4.0)
                await asyncio.sleep(random.uniform(delay_base, delay_base * 2.0))

        except Exception as e:
            logger.error(f"Error scraping Fotocasa {zona}: {e}")
        finally:
            await page.context.close()

        return anuncios

    async def _parsear_item(
        self, item, ciudad: str, zona: str
    ) -> Optional[AnuncioPortal]:
        try:
            # ── Full text for fallback extraction ────────────────────────
            texto_completo = await item.inner_text()

            # ── Precio ──────────────────────────────────────────────────
            # Intentar primero con el elemento span de precio directo
            precio_total = None
            precio_elem = await item.query_selector("span[class*='Price'], [data-testid*='price'], span[class*='price']")
            if precio_elem:
                precio_txt = (await precio_elem.inner_text()).strip()
                precio_total = self._parse_int(precio_txt)

            # Fallback: coger el mayor número con € del texto (precio de venta, no bajada)
            if not precio_total or precio_total < 10_000:
                todos_precios = re.findall(r"([\d]+(?:[.,][\d]+)*)\s*€", texto_completo)
                candidatos = [self._parse_int(p) for p in todos_precios]
                candidatos = [p for p in candidatos if p and p >= 10_000]
                precio_total = max(candidatos) if candidatos else None

            if not precio_total or precio_total < 10_000:
                return None

            # ── Título / URL ─────────────────────────────────────────────
            # Links to detail pages end with /{id}/d
            link_elems = await item.query_selector_all("a[href*='/comprar/vivienda/']")
            titulo = ""
            url = ""
            item_id = ""
            _tipo_keywords = re.compile(r"\b(piso|casa|chalet|ático|estudio|dúplex|apartamento|villa)\b", re.IGNORECASE)
            for le in link_elems:
                href = await le.get_attribute("href") or ""
                # Only use the clean detail link (ending with /d, no query params)
                if href.endswith("/d"):
                    link_text = (await le.inner_text()).strip()
                    # Prefer links with property type keywords (e.g. "Piso en...")
                    has_tipo = bool(_tipo_keywords.search(link_text))
                    prev_has_tipo = bool(_tipo_keywords.search(titulo))
                    if has_tipo and not prev_has_tipo:
                        titulo = link_text
                    elif not prev_has_tipo and len(link_text) > len(titulo):
                        titulo = link_text
                    url = f"https://www.fotocasa.es{href}" if href.startswith("/") else href
                    id_match = re.search(r"/(\d+)/d$", href)
                    if id_match:
                        item_id = id_match.group(1)

            if not url:
                return None

            # ── Detalles: superficie y habitaciones ──────────────────────
            superficie = None
            habitaciones = None

            # Features: <li class="inline ..."> con texto corto como "89 m²", "3 habs"
            # Importante: ignorar <li> con texto largo (descripciones)
            feature_items = await item.query_selector_all("li.inline")
            for fi in feature_items:
                texto = (await fi.inner_text()).strip()
                if len(texto) > 30:  # ignorar descripciones largas
                    continue
                if "m²" in texto and superficie is None:
                    superficie = self._parse_float(texto.replace("m²", "").strip())
                elif ("hab" in texto.lower() or "dorm" in texto.lower()) and habitaciones is None:
                    habitaciones = self._parse_int(texto)

            # Fallback: regex en texto completo — coger el primer m² que sea razonable
            if not superficie:
                # Buscar patrón "NN m²" o "NNN m²" (superficie, no trastero)
                m2_matches = re.findall(r"(\d{2,4}(?:[.,]\d+)?)\s*m²", texto_completo)
                candidatos_m2 = [self._parse_float(m) for m in m2_matches]
                candidatos_m2 = [m for m in candidatos_m2 if m and 10 < m < 1000]
                if candidatos_m2:
                    superficie = candidatos_m2[0]  # primera mención suele ser la superficie del piso
            if not habitaciones:
                hab_match = re.search(r"(\d+)\s*(?:hab|dorm)", texto_completo, re.IGNORECASE)
                if hab_match:
                    habitaciones = int(hab_match.group(1))

            precio_m2 = (
                round(precio_total / superficie, 2)
                if superficie and superficie > 10
                else None
            )

            if not item_id:
                item_id = re.sub(r"[^\w]", "", url[-20:])

            # ── Foto principal ───────────────────────────────────────────
            foto_principal = None
            img_elem = await item.query_selector("picture img, img.re-Card-figure-image, img[data-src]")
            if img_elem:
                foto_principal = (
                    await img_elem.get_attribute("data-src")
                    or await img_elem.get_attribute("src")
                )
                if foto_principal and (foto_principal.startswith("data:") or len(foto_principal) < 10):
                    foto_principal = None

            return AnuncioPortal(
                id_externo=f"fotocasa_{item_id}",
                fuente=FuentePrecio.FOTOCASA,
                url=url,
                titulo=titulo.strip()[:200],
                precio_total=precio_total,
                precio_m2=precio_m2,
                superficie_m2=superficie,
                habitaciones=habitaciones,
                planta=None,
                ciudad=ciudad,
                distrito=zona,
                codigo_postal=None,
                lat=None,
                lon=None,
                tipo=self._detectar_tipo(titulo),
                foto_principal=foto_principal,
            )

        except Exception as e:
            logger.debug(f"Error parseando item Fotocasa: {e}")
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
        db_service=None,
    ) -> list[AnuncioPortal]:
        """Scraping de todas las zonas. Guarda en BD por zona si se pasa db_service."""
        targets = ciudades or list(ZONAS_FOTOCASA.keys())
        todos: list[AnuncioPortal] = []

        for ciudad in targets:
            zonas = ZONAS_FOTOCASA.get(ciudad, [])
            if not zonas:
                logger.warning(f"Fotocasa: ciudad '{ciudad}' no tiene zonas configuradas")
                continue

            for z in zonas:
                anuncios = await self.scrape_zona(
                    slug=z["slug"],
                    ciudad=z["ciudad"],
                    zona=z["zona"],
                    max_paginas=max_paginas,
                )
                todos.extend(anuncios)
                # Guardar en BD inmediatamente zona por zona
                if db_service and anuncios:
                    guardados = db_service.guardar_anuncios(anuncios)
                    logger.info(f"  → BD: {guardados} nuevos guardados ({ciudad}/{z['zona']})")
                await asyncio.sleep(random.uniform(3, 6))

        logger.info(f"Fotocasa scraping completado: {len(todos)} anuncios totales")
        return todos

    async def scrape_municipio(
        self,
        id_ine: str,
        nombre: str,
        slug: str | None = None,
        max_paginas: int = 3,
    ) -> list[AnuncioPortal]:
        """
        Scraping de un municipio concreto por su código INE.
        El slug se puede pasar directamente o se calcula desde el nombre.
        """
        slug_efectivo = slug or slug_desde_nombre(nombre)
        logger.info(f"Fotocasa scraping municipio: {nombre} (INE:{id_ine}) slug:{slug_efectivo}")
        return await self.scrape_zona(
            slug=slug_efectivo,
            ciudad=id_ine,
            zona=nombre,
            max_paginas=max_paginas,
        )


async def run_fotocasa_scraper(
    ciudades: list[str] | None = None,
    max_paginas: int = 10,
    db_service=None,
) -> list[AnuncioPortal]:
    async with FotocasaScraper() as scraper:
        return await scraper.scrape_ciudades(ciudades, max_paginas, db_service=db_service)


if __name__ == "__main__":
    results = asyncio.run(run_fotocasa_scraper(["asturias"], max_paginas=1))
    for r in results:
        print(f"{r.distrito}: {r.precio_m2} €/m² — {r.precio_total}€ ({r.superficie_m2}m²)")
