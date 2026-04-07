"""
Scraper de Idealista usando la API oficial v3.5 (OAuth2 client credentials).
Mucho más fiable que Playwright: sin captchas, datos estructurados,
lat/lon y foto incluidos en cada listado.

Límite de uso: 100 peticiones/mes — el scraper lleva conteo propio en
un fichero JSON local para no pasarse sin querer.

Uso:
    from scrapers.idealista_api_scraper import run_idealista_api_scraper
    anuncios = await run_idealista_api_scraper(ciudades=["madrid"], max_paginas=2)
"""

import asyncio
import base64
import json
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import httpx
from loguru import logger

from config.settings import settings
from models.schemas import AnuncioPortal, FuentePrecio, TipoInmueble

# ── Ruta para el estado del quota (contador de peticiones) ────────────────────
_QUOTA_FILE = Path(__file__).parent.parent / ".idealista_api_quota.json"

# ── Ciudades: coordenadas centro + radio (metros) ─────────────────────────────
# Ajustado para máxima cobertura con mínimas peticiones
CIUDADES_API: dict[str, dict] = {
    "madrid": {
        "center": "40.4168,-3.7038",
        "distance": 15000,
        "ciudad": "madrid",
    },
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
    """Incrementa el contador mensual y devuelve el nuevo valor."""
    quota = _load_quota()
    current_month = datetime.utcnow().strftime("%Y-%m")
    if quota.get("month") != current_month:
        quota = {"month": current_month, "count": 0}
    quota["count"] += 1
    _save_quota(quota)
    return quota["count"]


def _quota_remaining(max_monthly: int = 95) -> int:
    """Retorna las peticiones restantes (deja 5 de margen sobre el límite)."""
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

    TOKEN_URL = "https://api.idealista.com/oauth/token"
    SEARCH_URL = "https://api.idealista.com/3.5/es/search"

    def __init__(self) -> None:
        self._apikey  = settings.idealista_api_key
        self._secret  = settings.idealista_api_secret
        self._token: Optional[str] = None
        self._token_expires_at: float = 0.0

    async def _get_token(self, client: httpx.AsyncClient) -> str:
        """Obtiene/renueva el token OAuth2 (client credentials)."""
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
        self._token_expires_at = time.monotonic() + expires_in - 60  # margen 1 min

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
        """Llama al endpoint de búsqueda y devuelve el JSON completo."""
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

def _item_to_anuncio(item: dict, ciudad: str) -> Optional[AnuncioPortal]:
    """Convierte un elemento del JSON de Idealista a AnuncioPortal."""
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

        habitaciones  = item.get("rooms")
        titulo        = item.get("suggestedTexts", {}).get("title") or item.get("address") or ""
        distrito      = item.get("district") or item.get("neighborhood")
        lat           = float(item["latitude"])  if item.get("latitude")  else None
        lon           = float(item["longitude"]) if item.get("longitude") else None
        cp            = item.get("postalCode") or None

        # Foto — usar thumbnail devuelto por la API directamente
        foto = item.get("thumbnail") or None

        url = item.get("url") or f"https://www.idealista.com/inmueble/{property_code}/"

        return AnuncioPortal(
            id_externo     = f"idealista_{property_code}",
            fuente         = FuentePrecio.IDEALISTA,
            url            = url,
            titulo         = titulo[:200],
            precio_total   = precio_total,
            precio_m2      = precio_m2,
            superficie_m2  = superficie,
            habitaciones   = int(habitaciones) if habitaciones is not None else None,
            planta         = item.get("floor"),
            ciudad         = ciudad,
            distrito       = distrito,
            codigo_postal  = cp,
            lat            = lat,
            lon            = lon,
            tipo           = _detectar_tipo(titulo),
            foto_principal = foto,
        )
    except Exception as e:
        logger.warning(f"Error mapeando item {item.get('propertyCode')}: {e}")
        return None


# ── Función pública ───────────────────────────────────────────────────────────

async def run_idealista_api_scraper(
    ciudades: Optional[list[str]] = None,
    max_paginas: int = 2,
    operation: str = "sale",
) -> list[AnuncioPortal]:
    """
    Descarga anuncios de Idealista vía API oficial.

    Args:
        ciudades:    Lista de claves de CIUDADES_API. None = todas.
        max_paginas: Max páginas por ciudad (50 items/pág → 100 items/ciudad con 2 págs).
        operation:   'sale' o 'rent'

    Returns:
        Lista de AnuncioPortal lista para guardar en BD.
    """
    if not settings.idealista_api_key or not settings.idealista_api_secret:
        logger.warning("idealista_api_key / idealista_api_secret no configurados — saltando API scraper")
        return []

    remaining = _quota_remaining()
    if remaining <= 0:
        logger.warning("Quota mensual de Idealista API agotada — saltando")
        return []

    zonas_seleccionadas = {
        k: v for k, v in CIUDADES_API.items()
        if ciudades is None or k in ciudades
    }

    # Calcular cuántas peticiones necesitamos
    peticiones_necesarias = len(zonas_seleccionadas) * max_paginas
    if peticiones_necesarias > remaining:
        # Reducir páginas para no exceder quota
        max_paginas = max(1, remaining // max(1, len(zonas_seleccionadas)))
        logger.warning(
            f"Ajustando max_paginas a {max_paginas} para respetar quota "
            f"(restantes: {remaining}, ciudades: {len(zonas_seleccionadas)})"
        )

    client_api = IdealistaApiClient()
    todos_anuncios: list[AnuncioPortal] = []

    async with httpx.AsyncClient() as http:
        for clave, cfg in zonas_seleccionadas.items():
            ciudad  = cfg["ciudad"]
            center  = cfg["center"]
            distance = cfg["distance"]

            logger.info(f"[Idealista API] Ciudad: {clave} — center={center} dist={distance}m")

            for pagina in range(1, max_paginas + 1):
                try:
                    data = await client_api.search(
                        http,
                        center   = center,
                        distance = distance,
                        operation= operation,
                        num_page = pagina,
                        max_items= 50,
                    )
                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP {e.response.status_code} en {clave} pág {pagina}: {e}")
                    break
                except Exception as e:
                    logger.error(f"Error en {clave} pág {pagina}: {e}")
                    break

                items = data.get("elementList", [])
                total_pages = data.get("totalPages", 1)

                nuevos = [a for a in (_item_to_anuncio(it, ciudad) for it in items) if a]
                todos_anuncios.extend(nuevos)

                logger.info(
                    f"  pág {pagina}/{total_pages} → {len(nuevos)} anuncios "
                    f"(total acum: {len(todos_anuncios)})"
                )

                if pagina >= total_pages:
                    break

                # Pausa cortés entre páginas (no necesaria para API pero respetuosa)
                await asyncio.sleep(1.0)

            # Pausa entre ciudades
            await asyncio.sleep(2.0)

    logger.info(
        f"[Idealista API] Completado: {len(todos_anuncios)} anuncios de "
        f"{len(zonas_seleccionadas)} ciudad(es). "
        f"Quota restante este mes: {_quota_remaining()}"
    )
    return todos_anuncios
