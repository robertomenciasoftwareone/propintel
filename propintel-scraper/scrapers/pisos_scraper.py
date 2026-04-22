"""
Scraper de Pisos.com usando Playwright.
Tercer portal para triangular precios junto a Idealista y Fotocasa.
Anti-bot moderado — delays 3-6s, user-agent rotation.
"""
import asyncio
import random
import re
import unicodedata
from datetime import datetime
from typing import Optional
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from playwright.async_api import async_playwright, Page
from models.schemas import AnuncioPortal, FuentePrecio, TipoInmueble
from config.settings import settings


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

# Zonas por ciudad — slugs de pisos.com
# URL formato: pisos.com/comprar/{slug}/casas-y-pisos/
ZONAS_PISOS: dict[str, list[dict]] = {
    "madrid": [
        {"slug": "madrid",                    "ciudad": "madrid",    "zona": "Madrid"},
        {"slug": "madrid/salamanca",          "ciudad": "madrid",    "zona": "Salamanca"},
        {"slug": "madrid/chamberi",           "ciudad": "madrid",    "zona": "Chamberí"},
        {"slug": "madrid/chamartin",          "ciudad": "madrid",    "zona": "Chamartín"},
        {"slug": "madrid/retiro",             "ciudad": "madrid",    "zona": "Retiro"},
        {"slug": "madrid/centro",             "ciudad": "madrid",    "zona": "Centro"},
        {"slug": "madrid/carabanchel",        "ciudad": "madrid",    "zona": "Carabanchel"},
        {"slug": "madrid/vallecas",           "ciudad": "madrid",    "zona": "Vallecas"},
        {"slug": "madrid/tetuan",             "ciudad": "madrid",    "zona": "Tetuán"},
        {"slug": "madrid/moncloa-aravaca",    "ciudad": "madrid",    "zona": "Moncloa"},
        {"slug": "madrid/latina",             "ciudad": "madrid",    "zona": "Latina"},
        {"slug": "madrid/arganzuela",         "ciudad": "madrid",    "zona": "Arganzuela"},
        {"slug": "madrid/ciudad-lineal",      "ciudad": "madrid",    "zona": "Ciudad Lineal"},
        {"slug": "madrid/hortaleza",          "ciudad": "madrid",    "zona": "Hortaleza"},
        {"slug": "madrid/fuencarral",         "ciudad": "madrid",    "zona": "Fuencarral"},
    ],
    "barcelona": [
        {"slug": "barcelona",                 "ciudad": "barcelona", "zona": "Barcelona"},
        {"slug": "barcelona/eixample",        "ciudad": "barcelona", "zona": "Eixample"},
        {"slug": "barcelona/gracia",          "ciudad": "barcelona", "zona": "Gràcia"},
        {"slug": "barcelona/sant-marti",      "ciudad": "barcelona", "zona": "Sant Martí"},
        {"slug": "barcelona/sants-montjuic",  "ciudad": "barcelona", "zona": "Sants"},
        {"slug": "barcelona/nou-barris",      "ciudad": "barcelona", "zona": "Nou Barris"},
        {"slug": "barcelona/horta-guinardo",  "ciudad": "barcelona", "zona": "Horta-Guinardó"},
        {"slug": "barcelona/les-corts",       "ciudad": "barcelona", "zona": "Les Corts"},
    ],
    "valencia": [
        {"slug": "valencia",                  "ciudad": "valencia",  "zona": "Valencia"},
        {"slug": "valencia/eixample",         "ciudad": "valencia",  "zona": "L'Eixample"},
        {"slug": "valencia/rascanya",         "ciudad": "valencia",  "zona": "Rascanya"},
        {"slug": "valencia/campanar",         "ciudad": "valencia",  "zona": "Campanar"},
        {"slug": "valencia/benimaclet",       "ciudad": "valencia",  "zona": "Benimaclet"},
    ],
    "sevilla": [
        {"slug": "sevilla",                   "ciudad": "sevilla",   "zona": "Sevilla"},
        {"slug": "sevilla/triana",            "ciudad": "sevilla",   "zona": "Triana"},
        {"slug": "sevilla/los-remedios",      "ciudad": "sevilla",   "zona": "Los Remedios"},
        {"slug": "sevilla/nervion",           "ciudad": "sevilla",   "zona": "Nervión"},
    ],
    "malaga": [
        {"slug": "malaga",                    "ciudad": "malaga",    "zona": "Málaga"},
        {"slug": "malaga/centro",             "ciudad": "malaga",    "zona": "Centro"},
    ],
}

_TIPO_PATTERNS = [
    (re.compile(r"\bático\b", re.IGNORECASE), TipoInmueble.ATICO),
    (re.compile(r"\bestudio\b", re.IGNORECASE), TipoInmueble.ESTUDIO),
    (re.compile(r"\bdúplex\b", re.IGNORECASE), TipoInmueble.DUPLEX),
    (re.compile(r"\bcasa\b|\bchalet\b|\bvilla\b|\bunifamiliar\b", re.IGNORECASE), TipoInmueble.CASA),
    (re.compile(r"\bpiso\b|\bapartamento\b|\bvivienda\b", re.IGNORECASE), TipoInmueble.PISO),
]


def _detectar_tipo(titulo: str) -> TipoInmueble:
    for pattern, tipo in _TIPO_PATTERNS:
        if pattern.search(titulo):
            return tipo
    return TipoInmueble.PISO


def _parse_precio(texto: str) -> Optional[int]:
    """Extrae precio numérico de strings como '285.000 €' o '1.200.000€'."""
    nums = re.sub(r'[^\d]', '', texto)
    return int(nums) if nums and 10000 <= int(nums) <= 20_000_000 else None


def _parse_m2(texto: str) -> Optional[float]:
    m = re.search(r'(\d+(?:[.,]\d+)?)\s*m[²2]', texto, re.IGNORECASE)
    if m:
        return float(m.group(1).replace(',', '.'))
    return None


def _parse_habitaciones(texto: str) -> Optional[int]:
    m = re.search(r'(\d+)\s*hab', texto, re.IGNORECASE)
    return int(m.group(1)) if m else None


class PisosScraper:

    BASE = "https://www.pisos.com/comprar"

    def __init__(self):
        self._delay_min = 3.0
        self._delay_max = 6.0

    async def _delay(self):
        await asyncio.sleep(random.uniform(self._delay_min, self._delay_max))

    def _build_url(self, slug: str, pagina: int = 1) -> str:
        url = f"{self.BASE}/{slug}/casas-y-pisos/"
        if pagina > 1:
            url += f"?pagina={pagina}"
        return url

    async def _setup_page(self, page: Page) -> None:
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en'] });
            window.chrome = { runtime: {} };
        """)
        await page.set_extra_http_headers({
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        })

    def _es_bloqueado(self, html: str) -> bool:
        indicadores = [
            'captcha', 'cloudflare', 'access denied', 'too many requests',
            'robot', 'bloqueado', 'blocked',
        ]
        lower = html.lower()
        return any(ind in lower for ind in indicadores)

    async def scrape_zona(
        self,
        zona: dict,
        max_paginas: int = 3
    ) -> list[AnuncioPortal]:
        """Scrape una zona específica de pisos.com."""
        anuncios: list[AnuncioPortal] = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=settings.headless_browser,
                args=['--no-sandbox', '--disable-blink-features=AutomationControlled']
            )
            context = await browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={'width': 1280, 'height': 900},
                locale='es-ES',
            )
            page = await context.new_page()
            await self._setup_page(page)

            try:
                for n_pag in range(1, max_paginas + 1):
                    url = self._build_url(zona['slug'], n_pag)
                    logger.info(f"[Pisos.com] {zona['zona']} pág {n_pag}: {url}")

                    try:
                        await page.goto(url, wait_until='domcontentloaded', timeout=30_000)
                        await self._delay()

                        html = await page.content()
                        if self._es_bloqueado(html):
                            logger.warning(f"[Pisos.com] Bloqueado en {zona['zona']} pág {n_pag}")
                            break

                        # Extraer tarjetas de anuncios
                        cards = await page.query_selector_all('article[data-element-id], .prop-card, [class*="PropertyCard"], [class*="property-card"]')
                        if not cards:
                            # Fallback: buscar por estructura común
                            cards = await page.query_selector_all('li.propcard, .listing-item, article.result-card')

                        if not cards:
                            logger.info(f"[Pisos.com] Sin tarjetas en {zona['zona']} pág {n_pag} — fin de resultados")
                            break

                        nuevos = 0
                        for card in cards:
                            anuncio = await self._parse_card(card, zona)
                            if anuncio:
                                anuncios.append(anuncio)
                                nuevos += 1

                        logger.info(f"[Pisos.com] {zona['zona']} pág {n_pag}: {nuevos} anuncios extraídos")

                        if nuevos == 0:
                            break

                    except Exception as e:
                        logger.error(f"[Pisos.com] Error en {zona['zona']} pág {n_pag}: {e}")
                        break

            finally:
                await browser.close()

        return anuncios

    async def _parse_card(self, card, zona: dict) -> Optional[AnuncioPortal]:
        try:
            # Precio
            precio_el = await card.query_selector('[class*="price"], [class*="precio"], .price, .prop-price')
            precio_txt = await precio_el.inner_text() if precio_el else ''
            precio = _parse_precio(precio_txt)
            if not precio:
                return None

            # Título
            titulo_el = await card.query_selector('h2, h3, [class*="title"], [class*="titulo"]')
            titulo = (await titulo_el.inner_text()).strip() if titulo_el else ''

            # Superficie y habitaciones
            detalles_el = await card.query_selector_all('[class*="detail"], [class*="feature"], [class*="caracteristica"], li')
            superficie = None
            habitaciones = None
            for d in detalles_el:
                txt = await d.inner_text()
                if superficie is None:
                    superficie = _parse_m2(txt)
                if habitaciones is None:
                    habitaciones = _parse_habitaciones(txt)

            # URL del anuncio
            link_el = await card.query_selector('a[href]')
            href = await link_el.get_attribute('href') if link_el else ''
            url = f"https://www.pisos.com{href}" if href and href.startswith('/') else href

            # Foto
            img_el = await card.query_selector('img[src], img[data-src]')
            foto = None
            if img_el:
                foto = await img_el.get_attribute('src') or await img_el.get_attribute('data-src')

            # ID externo desde URL
            id_externo = None
            if url:
                m = re.search(r'/(\d{6,})', url)
                id_externo = m.group(1) if m else None

            precio_m2 = round(precio / superficie, 2) if precio and superficie and superficie > 0 else None
            tipo = _detectar_tipo(titulo)

            return AnuncioPortal(
                id_externo=id_externo or (url[-20:] if url else titulo[:20]),
                fuente=FuentePrecio.PISOS_COM,
                titulo=titulo[:500] if titulo else 'Sin título',
                precio_total=precio,
                precio_m2=precio_m2,
                superficie_m2=superficie,
                habitaciones=habitaciones,
                ciudad=zona['ciudad'],
                distrito=zona['zona'],
                codigo_postal=None,
                url=url or '',
                foto_principal=foto,
                tipo=tipo,
                fecha_scraping=datetime.utcnow(),
                lat=None,
                lon=None,
                planta=None,
            )

        except Exception as e:
            logger.debug(f"[Pisos.com] Error parseando card: {e}")
            return None

    async def scrape_ciudad(self, ciudad: str, max_paginas: int = 3) -> list[AnuncioPortal]:
        """Scrape todas las zonas de una ciudad."""
        zonas = ZONAS_PISOS.get(ciudad.lower(), [])
        if not zonas:
            logger.warning(f"[Pisos.com] Ciudad '{ciudad}' no configurada. Usando slug genérico.")
            zonas = [{"slug": ciudad.lower(), "ciudad": ciudad.lower(), "zona": ciudad.title()}]

        todos: list[AnuncioPortal] = []
        for zona in zonas:
            try:
                anuncios = await self.scrape_zona(zona, max_paginas)
                todos.extend(anuncios)
                logger.info(f"[Pisos.com] {zona['zona']}: {len(anuncios)} anuncios")
                # Pausa entre zonas
                await asyncio.sleep(random.uniform(5, 10))
            except Exception as e:
                logger.error(f"[Pisos.com] Error en zona {zona['zona']}: {e}")

        logger.info(f"[Pisos.com] Total ciudad '{ciudad}': {len(todos)} anuncios")
        return todos
