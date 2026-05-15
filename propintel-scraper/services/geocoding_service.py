"""
Servicio de geocodificación via Nominatim (OpenStreetMap).
Convierte direcciones en coordenadas lat/lon exactas para España.

Rate limit: 1 req/seg (política de uso de Nominatim).
Cache en disco (.geocoding_cache.json) — evita re-geocodificar entre ejecuciones.
"""
import asyncio
import hashlib
import json
import logging
import time
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_USER_AGENT = "PropIntel/1.0 (contacto@propintel.es)"
_CACHE_FILE = Path(__file__).parent.parent / ".geocoding_cache.json"
_MIN_INTERVAL = 1.1  # segundos entre peticiones (Nominatim ToS: max 1/seg)


class GeocodingService:
    """
    Geocodificador async con cache en disco y rate limiting.

    Uso típico:
        geo = GeocodingService()
        coords = await geo.geocodificar(codigo_postal="28013", ciudad="madrid")
        await geo.close()

    O como context manager:
        async with GeocodingService() as geo:
            coords = await geo.geocodificar(...)
    """

    def __init__(self) -> None:
        self._cache: dict[str, Optional[list[float]]] = {}
        self._client: Optional[httpx.AsyncClient] = None
        self._last_call: float = 0.0
        self._dirty: bool = False
        self._load_cache()

    # ── Cache ────────────────────────────────────────────────────────────────

    def _load_cache(self) -> None:
        if _CACHE_FILE.exists():
            try:
                self._cache = json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
            except Exception:
                self._cache = {}

    def _save_cache(self) -> None:
        if not self._dirty:
            return
        try:
            _CACHE_FILE.write_text(
                json.dumps(self._cache, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
            self._dirty = False
        except Exception as e:
            logger.debug(f"Cache geocoding no guardado: {e}")

    # ── Lifecycle ────────────────────────────────────────────────────────────

    async def __aenter__(self) -> "GeocodingService":
        return self

    async def __aexit__(self, *_) -> None:
        await self.close()

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
        self._save_cache()

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                headers={"User-Agent": _USER_AGENT},
                timeout=10.0,
            )
        return self._client

    # ── Query ────────────────────────────────────────────────────────────────

    async def _query_nominatim(self, query: str) -> Optional[tuple[float, float]]:
        """Consulta Nominatim respetando el rate limit y usando cache."""
        key = hashlib.md5(query.lower().strip().encode()).hexdigest()

        if key in self._cache:
            cached = self._cache[key]
            return tuple(cached) if cached else None  # type: ignore[return-value]

        # Rate limiting
        elapsed = time.monotonic() - self._last_call
        if elapsed < _MIN_INTERVAL:
            await asyncio.sleep(_MIN_INTERVAL - elapsed)

        result: Optional[tuple[float, float]] = None
        try:
            client = self._get_client()
            resp = await client.get(
                _NOMINATIM_URL,
                params={
                    "q": query,
                    "format": "json",
                    "limit": 1,
                    "countrycodes": "es",
                    "addressdetails": 0,
                },
            )
            self._last_call = time.monotonic()

            if resp.status_code == 200:
                data = resp.json()
                if data:
                    result = (float(data[0]["lat"]), float(data[0]["lon"]))

        except Exception as e:
            logger.debug(f"Nominatim error para '{query}': {e}")

        self._cache[key] = list(result) if result else None
        self._dirty = True

        if result:
            logger.debug(f"Geocodificado: '{query}' → {result[0]:.4f},{result[1]:.4f}")

        return result

    # ── API pública ──────────────────────────────────────────────────────────

    async def geocodificar(
        self,
        *,
        calle: Optional[str] = None,
        codigo_postal: Optional[str] = None,
        distrito: Optional[str] = None,
        ciudad: str,
    ) -> Optional[tuple[float, float]]:
        """
        Geocodifica una dirección española.

        Prueba candidatos por orden de precisión decreciente:
          1. calle + código postal  → nivel de calle (más preciso)
          2. código postal solo     → nivel de barrio (~200m error)
          3. distrito + ciudad      → nivel de distrito (~1km error)

        Returns:
            (lat, lon) o None si ningún candidato resuelve.
        """
        cp = (codigo_postal or "").strip()[:5]

        candidates: list[str] = []
        if calle and cp:
            candidates.append(f"{calle}, {cp}, España")
        if cp and len(cp) == 5:
            candidates.append(f"{cp}, España")
        if distrito and ciudad:
            candidates.append(f"{distrito}, {ciudad}, España")

        for query in candidates:
            coords = await self._query_nominatim(query)
            if coords:
                return coords

        return None

    async def geocodificar_lote(
        self,
        items: list[dict],
    ) -> list[Optional[tuple[float, float]]]:
        """
        Geocodifica un lote de direcciones. Cada elemento del lote es un dict con
        claves opcionales: calle, codigo_postal, distrito, ciudad.

        Returns:
            Lista de (lat, lon) o None, en el mismo orden que items.
        """
        results = []
        for item in items:
            coords = await self.geocodificar(
                calle=item.get("calle"),
                codigo_postal=item.get("codigo_postal"),
                distrito=item.get("distrito"),
                ciudad=item.get("ciudad", ""),
            )
            results.append(coords)
        return results
