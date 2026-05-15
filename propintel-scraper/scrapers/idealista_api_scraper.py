"""
Scraper de Idealista usando la API oficial v3.5 (OAuth2 client credentials).
Más fiable que Playwright: sin captchas, datos estructurados, lat/lon incluidos.

Geolocalización:
  - La API devuelve latitude/longitude por anuncio cuando Idealista los expone.
  - Para anuncios sin coordenadas (política de privacidad de Idealista),
    geocodificamos con Nominatim usando postalCode → district → ciudad.

Límite de uso: 100 peticiones/mes — el scraper lleva conteo propio en
un fichero JSON local para no pasarse sin querer.

Uso:
    from scrapers.idealista_api_scraper import run_idealista_api_scraper
    anuncios, city_avgs = await run_idealista_api_scraper(ciudades=["madrid"], max_paginas=2)
"""

import asyncio
import base64
import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
from loguru import logger

from config.settings import settings
from models.schemas import AnuncioPortal, FuentePrecio, TipoInmueble
from services.geocoding_service import GeocodingService

# ── Ruta para el estado del quota (contador de peticiones) ────────────────────
_QUOTA_FILE = Path(__file__).parent.parent / ".idealista_api_quota.json"

# ── Ciudades: coordenadas centro + radio (metros) ─────────────────────────────
CIUDADES_API: dict[str, dict] = {
    # ── Comunidad de Madrid (5 zonas) ──────────────────────────────────────
    "madrid": {
        "center": "40.4168,-3.7038",
        "distance": 15000,
        "ciudad": "madrid",
    },
    "madrid_norte": {
        # Alcobendas, San Sebastián de los Reyes, Tres Cantos, Colmenar Viejo
        "center": "40.590,-3.690",
        "distance": 20000,
        "ciudad": "madrid",
    },
    "madrid_sur": {
        # Leganés, Getafe, Fuenlabrada, Parla, Móstoles, Alcorcón
        "center": "40.300,-3.790",
        "distance": 22000,
        "ciudad": "madrid",
    },
    "madrid_este": {
        # Alcalá de Henares, Torrejón de Ardoz, Coslada, Rivas-Vaciamadrid
        "center": "40.430,-3.490",
        "distance": 18000,
        "ciudad": "madrid",
    },
    "madrid_oeste": {
        # Pozuelo de Alarcón, Majadahonda, Las Rozas, Boadilla del Monte
        "center": "40.450,-3.880",
        "distance": 18000,
        "ciudad": "madrid",
    },
    # ── Otras ciudades ──────────────────────────────────────────────────────
    "barcelona": {
        "center": "41.3851,2.1734",
        "distance": 12000,
        "ciudad": "barcelona",
    },
    "valencia": {
        "center": "39.4699,-0.3763",
        "distance": 10000,
        "ciudad": "valencia",
    },
    "sevilla": {
        "center": "37.3886,-5.9823",
        "distance": 10000,
        "ciudad": "sevilla",
    },
    "asturias": {
        "center": "43.3619,-5.8494",   # Oviedo
        "distance": 30000,              # radio amplio para cubrir Gijón/Avilés
        "ciudad": "asturias",
    },
    "malaga": {
        "center": "36.7213,-4.4213",
        "distance": 10000,
        "ciudad": "malaga",
    },
    "bilbao": {
        "center": "43.2630,-2.9350",
        "distance": 8000,
        "ciudad": "bilbao",
    },
    "zaragoza": {
        "center": "41.6488,-0.8891",
        "distance": 10000,
        "ciudad": "zaragoza",
    },
}

# ── Grupos predefinidos de zonas ──────────────────────────────────────────────
GRUPOS_CIUDADES: dict[str, list[str]] = {
    "comunidad_madrid": [
        "madrid", "madrid_norte", "madrid_sur", "madrid_este", "madrid_oeste"
    ],
}

_TIPO_PATTERNS: list[tuple[re.Pattern, TipoInmueble]] = [
    (re.compile(r"\bchalet\b|\bvilla\b|\bunifamiliar\b", re.I), TipoInmueble.CHALET),
    (re.compile(r"\batico\b|á?tico\b",                   re.I), TipoInmueble.ATICO),
    (re.compile(r"\bduplex\b|dúplex\b",                  re.I), TipoInmueble.DUPLEX),
    (re.compile(r"\blocal\b|\bcomercial\b",              re.I), TipoInmueble.LOCAL),
    (re.compile(r"\bgarage\b|\bgaraje\b|\bplaza\b",      re.I), TipoInmueble.GARAJE),
    (re.compile(r"\bpiso\b|\bapartamento\b|\bflat\b",    re.I), TipoInmueble.PISO),
]


def _detectar_tipo(texto: str) -> TipoInmueble:
    for pattern, tipo in _TIPO_PATTERNS:
        if pattern.search(texto):
            return tipo
    return TipoInmueble.PISO


# ── Quota tracker ─────────────────────────────────────────────────────────────

def _load_quota() -> dict:
    if _QUOTA_FILE.exists():
        try:
            return json.loads(_QUOTA_FILE.read_text())
        except Exception:
            pass
    return {"month": "", "count": 0}


def _save_quota(quota: dict) -> None:
    _QUOTA_FILE.write_text(json.dumps(quota))


def _quota_increment() -> int:
    quota = _load_quota()
    current_month = datetime.utcnow().strftime("%Y-%m")
    if quota.get("month") != current_month:
        quota = {"month": current_month, "count": 0}
    quota["count"] += 1
    _save_quota(quota)
    return quota["count"]


def _quota_remaining(max_monthly: int = 95) -> int:
    quota = _load_quota()
    current_month = datetime.utcnow().strftime("%Y-%m")
    if quota.get("month") != current_month:
        return max_monthly
    return max(0, max_monthly - quota.get("count", 0))


# ── Cliente OAuth2 + búsqueda ─────────────────────────────────────────────────

class IdealistaApiClient:
    """
    Wrapper sobre la API oficial de Idealista v3.5.
    Token cacheado en memoria (expira a las 2h según spec OAuth).
    """

    TOKEN_URL  = "https://api.idealista.com/oauth/token"
    SEARCH_URL = "https://api.idealista.com/3.5/es/search"

    def __init__(self) -> None:
        self._apikey  = settings.idealista_api_key
        self._secret  = settings.idealista_api_secret
        self._token: Optional[str] = None
        self._token_expires_at: float = 0.0

    async def _get_token(self, client: httpx.AsyncClient) -> str:
        if self._token and time.monotonic() < self._token_expires_at:
            return self._token

        credentials = base64.b64encode(
            f"{self._apikey}:{self._secret}".encode()
        ).decode()

        resp = await client.post(
            self.TOKEN_URL,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials", "scope": "read"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        self._token = data["access_token"]
        expires_in = int(data.get("expires_in", 7200))
        self._token_expires_at = time.monotonic() + expires_in - 60

        logger.debug(f"Token Idealista OK (expira en {expires_in}s)")
        return self._token

    async def search(
        self,
        client: httpx.AsyncClient,
        center: str,
        distance: int,
        operation: str = "sale",
        property_type: str = "homes",
        num_page: int = 1,
        max_items: int = 50,
    ) -> dict:
        token = await self._get_token(client)
        count = _quota_increment()
        logger.info(f"[Idealista API] Petición #{count} — center={center} page={num_page}")

        resp = await client.post(
            self.SEARCH_URL,
            headers={"Authorization": f"Bearer {token}"},
            data={
                "center":       center,
                "distance":     str(distance),
                "propertyType": property_type,
                "operation":    operation,
                "numPage":      str(num_page),
                "maxItems":     str(max_items),
                "language":     "es",
                "country":      "es",
            },
            timeout=20,
        )
        resp.raise_for_status()
        return resp.json()


# ── Mapeo API JSON → AnuncioPortal ────────────────────────────────────────────

def _item_to_anuncio(item: dict, ciudad: str) -> Optional[tuple[AnuncioPortal, dict]]:
    """
    Convierte un elemento del JSON de Idealista a (AnuncioPortal, address_hint).
    address_hint contiene campos para geocodificar si lat/lon son None.
    """
    try:
        property_code = str(item.get("propertyCode", ""))
        if not property_code:
            return None

        precio_total = int(item.get("price", 0))
        if precio_total <= 0:
            return None

        superficie = float(item.get("size", 0) or 0) or None
        precio_m2  = float(item.get("priceByArea", 0) or 0) or None
        if precio_m2 is None and precio_total and superficie:
            precio_m2 = round(precio_total / superficie, 2)

        habitaciones = item.get("rooms")
        titulo       = (
            item.get("suggestedTexts", {}).get("title")
            or item.get("address")
            or ""
        )
        distrito     = item.get("district") or item.get("neighborhood")
        cp           = item.get("postalCode") or None

        lat = float(item["latitude"])  if item.get("latitude")  else None
        lon = float(item["longitude"]) if item.get("longitude") else None

        foto = item.get("thumbnail") or None
        url  = item.get("url") or f"https://www.idealista.com/inmueble/{property_code}/"

        # Datos de dirección para geocoding de respaldo
        address_hint = {
            "calle":          item.get("address") or None,
            "codigo_postal":  cp,
            "distrito":       distrito,
            "ciudad":         ciudad,
        }

        anuncio = AnuncioPortal(
            id_externo    = f"idealista_{property_code}",
            fuente        = FuentePrecio.IDEALISTA,
            url           = url,
            titulo        = titulo[:200],
            precio_total  = precio_total,
            precio_m2     = precio_m2,
            superficie_m2 = superficie,
            habitaciones  = int(habitaciones) if habitaciones is not None else None,
            planta        = item.get("floor"),
            ciudad        = ciudad,
            distrito      = distrito,
            codigo_postal = cp,
            lat           = lat,
            lon           = lon,
            tipo          = _detectar_tipo(titulo),
            foto_principal= foto,
        )
        return anuncio, address_hint

    except Exception as e:
        logger.warning(f"Error mapeando item {item.get('propertyCode')}: {e}")
        return None


# ── Geocodificación de respaldo ───────────────────────────────────────────────

async def _geocodificar_sin_coords(
    anuncios_sin_coords: list[tuple[AnuncioPortal, dict]],
) -> None:
    """
    Para anuncios que la API devolvió sin lat/lon, geocodifica usando
    Nominatim con CP → distrito → ciudad, en orden de precisión.
    Modifica los objetos AnuncioPortal in-place.
    """
    if not anuncios_sin_coords:
        return

    logger.info(
        f"[Idealista API] Geocodificando {len(anuncios_sin_coords)} anuncios sin coordenadas..."
    )

    geo = GeocodingService()
    geocodificados = 0

    try:
        for anuncio, hint in anuncios_sin_coords:
            coords = await geo.geocodificar(
                calle=hint.get("calle"),
                codigo_postal=hint.get("codigo_postal"),
                distrito=hint.get("distrito"),
                ciudad=hint.get("ciudad") or anuncio.ciudad,
            )
            if coords:
                anuncio.lat = coords[0]
                anuncio.lon = coords[1]
                geocodificados += 1
    finally:
        await geo.close()

    logger.info(
        f"[Idealista API] Geocodificados {geocodificados}/{len(anuncios_sin_coords)} anuncios"
    )


# ── Función pública ───────────────────────────────────────────────────────────

async def run_idealista_api_scraper(
    ciudades: Optional[list[str]] = None,
    max_paginas: int = 2,
    operation: str = "sale",
) -> tuple[list[AnuncioPortal], dict[str, float]]:
    """
    Descarga anuncios de Idealista vía API oficial.

    Args:
        ciudades:    Lista de claves de CIUDADES_API. None = todas.
        max_paginas: Max páginas por ciudad (50 items/pág → 100 items/ciudad con 2 págs).
        operation:   'sale' o 'rent'

    Returns:
        Tupla (anuncios, city_avg_prices):
          - anuncios: lista de AnuncioPortal con lat/lon (exacto o geocodificado).
          - city_avg_prices: dict {ciudad → avgPriceByArea €/m²}.
    """
    if not settings.idealista_api_key or not settings.idealista_api_secret:
        logger.warning(
            "idealista_api_key / idealista_api_secret no configurados — saltando API scraper"
        )
        return [], {}

    remaining = _quota_remaining()
    if remaining <= 0:
        logger.warning("Quota mensual de Idealista API agotada — saltando")
        return [], {}

    # Expandir grupos (ej: 'comunidad_madrid' → 5 claves)
    claves_expandidas: list[str] | None = None
    if ciudades is not None:
        claves_expandidas = []
        for c in ciudades:
            if c in GRUPOS_CIUDADES:
                claves_expandidas.extend(GRUPOS_CIUDADES[c])
            else:
                claves_expandidas.append(c)

    zonas_seleccionadas = {
        k: v for k, v in CIUDADES_API.items()
        if claves_expandidas is None or k in claves_expandidas
    }

    peticiones_necesarias = len(zonas_seleccionadas) * max_paginas
    if peticiones_necesarias > remaining:
        max_paginas = max(1, remaining // max(1, len(zonas_seleccionadas)))
        logger.warning(
            f"Ajustando max_paginas a {max_paginas} para respetar quota "
            f"(restantes: {remaining}, ciudades: {len(zonas_seleccionadas)})"
        )

    client_api = IdealistaApiClient()
    todos_anuncios: list[AnuncioPortal] = []
    sin_coords: list[tuple[AnuncioPortal, dict]] = []  # para geocodificar después
    city_avg_prices: dict[str, float] = {}

    async with httpx.AsyncClient() as http:
        for clave, cfg in zonas_seleccionadas.items():
            ciudad   = cfg["ciudad"]
            center   = cfg["center"]
            distance = cfg["distance"]

            logger.info(f"[Idealista API] Ciudad: {clave} — center={center} dist={distance}m")

            for pagina in range(1, max_paginas + 1):
                try:
                    data = await client_api.search(
                        http,
                        center       = center,
                        distance     = distance,
                        operation    = operation,
                        num_page     = pagina,
                        max_items    = 50,
                    )
                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP {e.response.status_code} en {clave} pág {pagina}: {e}")
                    break
                except Exception as e:
                    logger.error(f"Error en {clave} pág {pagina}: {e}")
                    break

                items = data.get("elementList", [])
                total_pages = data.get("totalPages", 1)

                avg_pba = data.get("avgPriceByArea")
                if avg_pba and float(avg_pba) > 0:
                    city_avg_prices[ciudad] = float(avg_pba)

                for it in items:
                    result = _item_to_anuncio(it, ciudad)
                    if result is None:
                        continue
                    anuncio, address_hint = result
                    todos_anuncios.append(anuncio)
                    if anuncio.lat is None or anuncio.lon is None:
                        sin_coords.append((anuncio, address_hint))

                logger.info(
                    f"  pág {pagina}/{total_pages} → {len(items)} anuncios "
                    f"(total acum: {len(todos_anuncios)}, sin coords: {len(sin_coords)})"
                )

                if pagina >= total_pages:
                    break

                await asyncio.sleep(1.0)

            await asyncio.sleep(2.0)

    # Geocodificar anuncios sin coordenadas usando CP/distrito/ciudad
    await _geocodificar_sin_coords(sin_coords)

    con_coords = sum(1 for a in todos_anuncios if a.lat is not None)
    logger.info(
        f"[Idealista API] Completado: {len(todos_anuncios)} anuncios "
        f"({con_coords} con coords exactas o geocodificadas). "
        f"Quota restante: {_quota_remaining()}"
    )
    if city_avg_prices:
        logger.info(
            f"[Idealista API] Precios medios zona: "
            f"{ {k: f'{v:.0f} €/m²' for k, v in city_avg_prices.items()} }"
        )

    return todos_anuncios, city_avg_prices
