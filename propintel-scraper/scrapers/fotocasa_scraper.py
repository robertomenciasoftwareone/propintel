"""
Scraper de Fotocasa usando Playwright (renderiza JS).
Respeta rate limits — solo datos públicos.

Fotocasa es una app Next.js — los datos de cada listing están en
<script id="__NEXT_DATA__"> como JSON embebido.

Geolocalización exacta:
  - accuracy=1 → coordenada exacta del inmueble ✓
  - accuracy=0 → centroide de zona (puede estar km lejos) ✗
  - Sin coords  → geocodificamos via Nominatim con CP/calle/distrito
"""
import asyncio
import json
import random
import re
import unicodedata
from typing import Optional
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from playwright.async_api import async_playwright, Page, Browser
from models.schemas import AnuncioPortal, FuentePrecio, TipoInmueble
from config.settings import settings
from services.geocoding_service import GeocodingService


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
        {"slug": "madrid/salamanca",            "ciudad": "madrid",    "zona": "Salamanca"},
        {"slug": "madrid/chamartin",            "ciudad": "madrid",    "zona": "Chamartín"},
        {"slug": "madrid/san-blas-canillejas",  "ciudad": "madrid",    "zona": "San Blas"},
        {"slug": "madrid/villaverde",           "ciudad": "madrid",    "zona": "Villaverde"},
        {"slug": "madrid/villa-de-vallecas",    "ciudad": "madrid",    "zona": "Villa de Vallecas"},
        {"slug": "madrid/vicalvaro",            "ciudad": "madrid",    "zona": "Vicálvaro"},
        {"slug": "madrid/barajas",              "ciudad": "madrid",    "zona": "Barajas"},
        {"slug": "madrid/moratalaz",            "ciudad": "madrid",    "zona": "Moratalaz"},
    ],
    "barcelona": [
        {"slug": "barcelona",                    "ciudad": "barcelona", "zona": "Barcelona"},
        {"slug": "barcelona/eixample",           "ciudad": "barcelona", "zona": "Eixample"},
        {"slug": "barcelona/gracia",             "ciudad": "barcelona", "zona": "Gràcia"},
        {"slug": "barcelona/sant-marti",         "ciudad": "barcelona", "zona": "Sant Martí"},
        {"slug": "barcelona/sarria-sant-gervasi","ciudad": "barcelona", "zona": "Sarrià"},
        {"slug": "barcelona/les-corts",          "ciudad": "barcelona", "zona": "Les Corts"},
        {"slug": "barcelona/sants-montjuic",     "ciudad": "barcelona", "zona": "Sants"},
        {"slug": "barcelona/nou-barris",         "ciudad": "barcelona", "zona": "Nou Barris"},
        {"slug": "barcelona/horta-guinardo",     "ciudad": "barcelona", "zona": "Horta-Guinardó"},
        {"slug": "barcelona/sant-andreu",        "ciudad": "barcelona", "zona": "Sant Andreu"},
        {"slug": "barcelona/ciudad-vieja",       "ciudad": "barcelona", "zona": "Ciutat Vella"},
    ],
    "asturias": [
        {"slug": "oviedo",  "ciudad": "asturias", "zona": "Oviedo"},
        {"slug": "gijon",   "ciudad": "asturias", "zona": "Gijón"},
        {"slug": "aviles",  "ciudad": "asturias", "zona": "Avilés"},
        {"slug": "siero",   "ciudad": "asturias", "zona": "Siero"},
        {"slug": "llanera", "ciudad": "asturias", "zona": "Llanera"},
    ],
    "valencia": [
        {"slug": "valencia",                 "ciudad": "valencia", "zona": "Valencia"},
        {"slug": "valencia/eixample",        "ciudad": "valencia", "zona": "L'Eixample"},
        {"slug": "valencia/rascanya",        "ciudad": "valencia", "zona": "Rascanya"},
        {"slug": "valencia/quatre-carreres", "ciudad": "valencia", "zona": "Quatre Carreres"},
        {"slug": "valencia/poblats-maritims","ciudad": "valencia", "zona": "Poblats Marítims"},
        {"slug": "valencia/campanar",        "ciudad": "valencia", "zona": "Campanar"},
        {"slug": "valencia/benimaclet",      "ciudad": "valencia", "zona": "Benimaclet"},
        {"slug": "valencia/extramurs",       "ciudad": "valencia", "zona": "Extramurs"},
    ],
    "sevilla": [
        {"slug": "sevilla",               "ciudad": "sevilla", "zona": "Sevilla"},
        {"slug": "sevilla/triana",        "ciudad": "sevilla", "zona": "Triana"},
        {"slug": "sevilla/los-remedios",  "ciudad": "sevilla", "zona": "Los Remedios"},
        {"slug": "sevilla/nervion",       "ciudad": "sevilla", "zona": "Nervión"},
        {"slug": "sevilla/macarena",      "ciudad": "sevilla", "zona": "Macarena"},
        {"slug": "sevilla/casco-antiguo", "ciudad": "sevilla", "zona": "Casco Antiguo"},
        {"slug": "sevilla/sur",           "ciudad": "sevilla", "zona": "Sur"},
    ],
}

# Script para ocultar fingerprints del navegador automático
_STEALTH_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en'] });
    window.chrome = { runtime: {} };
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters)
    );
"""

# JS para extraer coordenadas y datos de ubicación del JSON embebido de Fotocasa
_EXTRACT_COORDS_JS = """
() => {
    const result = {};

    function collect(obj, depth) {
        if (depth > 15 || !obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            for (const item of obj) {
                if (item && item.detailUrl && item.coordinates) {
                    // Extraer ID del anuncio desde la URL de detalle
                    const m = String(item.detailUrl).match(/\\/([0-9]+)\\/d(?:[?#].*)?$/);
                    if (m) {
                        const addr = item.address || {};
                        const coords = item.coordinates;
                        result[m[1]] = {
                            lat:          coords.latitude  ?? null,
                            lon:          coords.longitude ?? null,
                            accuracy:     coords.accuracy  ?? 0,
                            street:       addr.name || addr.street || null,
                            district:     addr.district    || null,
                            neighborhood: addr.neighborhood || null,
                            zipCode:      addr.zipCode     || null,
                        };
                    }
                }
                collect(item, depth + 1);
            }
        } else {
            for (const v of Object.values(obj)) collect(v, depth + 1);
        }
    }

    // Intento 1: __NEXT_DATA__ (Next.js — más rápido y fiable)
    const nextEl = document.getElementById('__NEXT_DATA__');
    if (nextEl) {
        try {
            collect(JSON.parse(nextEl.textContent || ''), 0);
            if (Object.keys(result).length > 0) return result;
        } catch(_) {}
    }

    // Intento 2: escanear todos los scripts inline como fallback
    for (const script of document.querySelectorAll('script:not([src])')) {
        const t = script.textContent || '';
        if (t.length < 200 || !t.includes('"latitude"') || !t.includes('"detailUrl"')) continue;
        try {
            collect(JSON.parse(t), 0);
            if (Object.keys(result).length > 0) return result;
        } catch(_) {}
    }

    return result;
}
"""


def slug_desde_nombre(nombre: str) -> str:
    """
    Genera un slug de URL para Fotocasa a partir del nombre del municipio.
    Ejemplo: "L'Hospitalet de Llobregat" → "lhospitalet-de-llobregat"
    """
    nfkd = unicodedata.normalize("NFKD", nombre)
    sin_tildes = "".join(c for c in nfkd if not unicodedata.combining(c))
    norm = sin_tildes.lower().strip()
    norm = norm.replace("'", "").replace("'", "").replace("'", "")
    norm = norm.replace("/", "-").replace("(", "").replace(")", "")
    norm = norm.replace("·", "").replace(".", "")
    return "-".join(norm.split())


class FotocasaScraper:

    BASE = "https://www.fotocasa.es/es/comprar/viviendas"

    _TIPO_PATTERNS = [
        (re.compile(r"\bático\b",                          re.IGNORECASE), TipoInmueble.ATICO),
        (re.compile(r"\bestudio\b",                        re.IGNORECASE), TipoInmueble.ESTUDIO),
        (re.compile(r"\bdúplex\b",                         re.IGNORECASE), TipoInmueble.DUPLEX),
        (re.compile(r"\bcasa\b|\bchalet\b|\bvilla\b",      re.IGNORECASE), TipoInmueble.CASA),
        (re.compile(r"\bpiso\b|\bapartamento\b",           re.IGNORECASE), TipoInmueble.PISO),
    ]

    def __init__(self):
        self.browser: Optional[Browser] = None
        self._pw = None
        self._geo: Optional[GeocodingService] = None

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
        self._geo = GeocodingService()
        return self

    async def __aexit__(self, *_):
        if self.browser:
            await self.browser.close()
        if self._pw:
            await self._pw.stop()
        if self._geo:
            await self._geo.close()

    async def _nueva_pagina(self) -> Page:
        context = await self.browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": random.randint(1280, 1920), "height": random.randint(768, 1080)},
            locale="es-ES",
            timezone_id="Europe/Madrid",
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
        if "challenge" in url or "captcha" in url.lower():
            return True
        indicadores = ["Just a moment", "Checking your browser", "Enable JavaScript and cookies",
                       "Access denied", "403 Forbidden"]
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
                if num_pag == 1:
                    url = f"{self.BASE}/{slug}/todas-las-zonas/l"
                else:
                    url = f"{self.BASE}/{slug}/todas-las-zonas/l/{num_pag}"

                logger.debug(f"Fotocasa → {url}")

                response = await page.goto(url, wait_until="domcontentloaded", timeout=45000)
                await asyncio.sleep(random.uniform(2.0, 3.0))

                # Scroll para activar IntersectionObserver de cada tarjeta
                altura = await page.evaluate("document.body.scrollHeight")
                pos = 0
                while pos < altura:
                    await page.evaluate(f"window.scrollTo(0, {pos})")
                    await asyncio.sleep(0.05)
                    pos += 400
                    altura = await page.evaluate("document.body.scrollHeight")

                await asyncio.sleep(1.5)

                contenido = await page.content()
                if self._detectar_bloqueo(page.url, contenido):
                    logger.warning(f"Bloqueo detectado en Fotocasa {zona} p.{num_pag} — parando zona")
                    break

                if response and response.status in (403, 429):
                    logger.warning(f"HTTP {response.status} en Fotocasa {zona} — parando zona")
                    break

                # Extraer coords/dirección de TODOS los anuncios de la página desde el JSON
                coords_lookup = await self._extraer_coordenadas_pagina(page)
                logger.debug(
                    f"Fotocasa {zona} p.{num_pag}: {len(coords_lookup)} entradas en coords_lookup"
                )

                # Artículos con enlace de detalle (excluir skeletons)
                all_articles = await page.query_selector_all("article")
                items = []
                for art in all_articles:
                    link = await art.query_selector("a[href*='/comprar/vivienda/']")
                    if link:
                        items.append(art)

                if not items:
                    logger.debug(f"Sin resultados Fotocasa en página {num_pag} de {zona}")
                    break

                for item in items:
                    anuncio = await self._parsear_item(item, ciudad, zona, coords_lookup)
                    if anuncio:
                        anuncios.append(anuncio)

                logger.info(f"✓ Fotocasa {zona} p.{num_pag}: {len(items)} anuncios")

                delay_base = max(settings.scraper_delay_seconds, 4.0)
                await asyncio.sleep(random.uniform(delay_base, delay_base * 2.0))

        except Exception as e:
            logger.error(f"Error scraping Fotocasa {zona}: {e}")
        finally:
            await page.context.close()

        return anuncios

    async def _extraer_coordenadas_pagina(self, page: Page) -> dict:
        """
        Extrae lat/lon, accuracy y dirección de cada anuncio desde el JSON embebido.

        accuracy=1 → coordenada exacta del inmueble (usable directamente)
        accuracy=0 → centroide de zona (NO usar para el mapa — geocodificar en su lugar)
        """
        try:
            result = await page.evaluate(_EXTRACT_COORDS_JS)
            return result or {}
        except Exception as e:
            logger.debug(f"Error extrayendo coords de página Fotocasa: {e}")
            return {}

    async def _parsear_item(
        self,
        item,
        ciudad: str,
        zona: str,
        coords_lookup: dict | None = None,
    ) -> Optional[AnuncioPortal]:
        try:
            texto_completo = await item.inner_text()

            # ── Precio ──────────────────────────────────────────────────
            precio_total = None
            precio_elem = await item.query_selector(
                "span[class*='Price'], [data-testid*='price'], span[class*='price']"
            )
            if precio_elem:
                precio_total = self._parse_int((await precio_elem.inner_text()).strip())

            if not precio_total or precio_total < 10_000:
                candidatos = [
                    self._parse_int(p)
                    for p in re.findall(r"([\d]+(?:[.,][\d]+)*)\s*€", texto_completo)
                ]
                candidatos = [p for p in candidatos if p and p >= 10_000]
                precio_total = max(candidatos) if candidatos else None

            if not precio_total or precio_total < 10_000:
                return None

            # ── Título / URL / ID ────────────────────────────────────────
            link_elems = await item.query_selector_all("a[href*='/comprar/vivienda/']")
            titulo = ""
            url = ""
            item_id = ""
            _tipo_kw = re.compile(
                r"\b(piso|casa|chalet|ático|estudio|dúplex|apartamento|villa)\b",
                re.IGNORECASE,
            )
            for le in link_elems:
                href = await le.get_attribute("href") or ""
                if href.endswith("/d"):
                    link_text = (await le.inner_text()).strip()
                    has_tipo = bool(_tipo_kw.search(link_text))
                    prev_has_tipo = bool(_tipo_kw.search(titulo))
                    if has_tipo and not prev_has_tipo:
                        titulo = link_text
                    elif not prev_has_tipo and len(link_text) > len(titulo):
                        titulo = link_text
                    url = f"https://www.fotocasa.es{href}" if href.startswith("/") else href
                    m = re.search(r"/(\d+)/d$", href)
                    if m:
                        item_id = m.group(1)

            if not url:
                return None

            # ── Superficie y habitaciones ────────────────────────────────
            superficie = None
            habitaciones = None

            feature_items = await item.query_selector_all("li.inline")
            for fi in feature_items:
                texto = (await fi.inner_text()).strip()
                if len(texto) > 30:
                    continue
                if "m²" in texto and superficie is None:
                    superficie = self._parse_float(texto.replace("m²", "").strip())
                elif ("hab" in texto.lower() or "dorm" in texto.lower()) and habitaciones is None:
                    habitaciones = self._parse_int(texto)

            if not superficie:
                m2_matches = re.findall(r"(\d{2,4}(?:[.,]\d+)?)\s*m²", texto_completo)
                candidatos_m2 = [self._parse_float(m) for m in m2_matches]
                candidatos_m2 = [m for m in candidatos_m2 if m and 10 < m < 1000]
                if candidatos_m2:
                    superficie = candidatos_m2[0]

            if not habitaciones:
                m_hab = re.search(r"(\d+)\s*(?:hab|dorm)", texto_completo, re.IGNORECASE)
                if m_hab:
                    habitaciones = int(m_hab.group(1))

            precio_m2 = (
                round(precio_total / superficie, 2)
                if superficie and superficie > 10
                else None
            )

            if not item_id:
                item_id = re.sub(r"[^\w]", "", url[-20:])

            # ── Coordenadas exactas desde JSON embebido ──────────────────
            # CRÍTICO: Fotocasa distingue accuracy=1 (coordenada exacta del inmueble)
            # de accuracy=0 (centroide de zona → puede estar km lejos del piso).
            # Solo usamos accuracy>=1; para el resto geocodificamos con Nominatim.
            lat: Optional[float] = None
            lon: Optional[float] = None
            codigo_postal: Optional[str] = None
            calle: Optional[str] = None
            distrito_final = zona

            if coords_lookup and item_id in coords_lookup:
                entry = coords_lookup[item_id]
                accuracy = entry.get("accuracy", 0)

                # Recopilar datos de dirección siempre (útiles para geocoding)
                codigo_postal = entry.get("zipCode") or None
                calle = entry.get("street") or None
                raw_district = entry.get("district") or entry.get("neighborhood") or None
                if raw_district:
                    distrito_final = raw_district

                if accuracy >= 1:
                    # Coordenada exacta del inmueble — usar directamente
                    raw_lat = entry.get("lat")
                    raw_lon = entry.get("lon")
                    if raw_lat is not None and raw_lon is not None:
                        lat = float(raw_lat)
                        lon = float(raw_lon)
                        logger.debug(
                            f"Fotocasa {item_id}: coords exactas accuracy={accuracy} "
                            f"({lat:.4f},{lon:.4f})"
                        )
                else:
                    # accuracy=0 → centroide de zona, demasiado impreciso para el mapa
                    logger.debug(
                        f"Fotocasa {item_id}: accuracy=0 (centroide zona), "
                        f"geocodificando con CP={codigo_postal} barrio={raw_district}"
                    )

            # Geocodificar si no tenemos coordenadas exactas
            if (lat is None or lon is None) and self._geo:
                coords = await self._geo.geocodificar(
                    calle=calle,
                    codigo_postal=codigo_postal,
                    distrito=distrito_final if distrito_final != zona else None,
                    ciudad=ciudad,
                )
                if coords:
                    lat, lon = coords

            # ── Foto principal ───────────────────────────────────────────
            foto_principal = None
            img_elem = await item.query_selector(
                "picture img, img.re-Card-figure-image, img[data-src]"
            )
            if img_elem:
                foto_principal = (
                    await img_elem.get_attribute("data-src")
                    or await img_elem.get_attribute("src")
                )
                if foto_principal and (
                    foto_principal.startswith("data:") or len(foto_principal) < 10
                ):
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
                distrito=distrito_final,
                codigo_postal=codigo_postal,
                lat=lat,
                lon=lon,
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
                if db_service and anuncios:
                    guardados = db_service.guardar_anuncios(anuncios)
                    logger.info(
                        f"  → BD: {guardados} nuevos guardados ({ciudad}/{z['zona']})"
                    )
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
        slug_efectivo = slug or slug_desde_nombre(nombre)
        logger.info(
            f"Fotocasa scraping municipio: {nombre} (INE:{id_ine}) slug:{slug_efectivo}"
        )
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
        geo = f"({r.lat:.4f},{r.lon:.4f})" if r.lat else "sin coords"
        print(f"{r.distrito}: {r.precio_m2} €/m² — {r.precio_total}€ ({r.superficie_m2}m²) {geo}")
