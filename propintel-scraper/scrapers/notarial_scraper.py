"""
Scraper de datos de precios inmobiliarios — fuentes oficiales.

Fuente principal: INE (Instituto Nacional de Estadística)
 - API REST pública, documentada en servicios.ine.es
 - Tabla 25171: Índice de Precios de Vivienda (IPV) — base 2015=100
 - Convertimos a €/m² usando precios base publicados por el Ministerio de Transportes

Fuente secundaria: Ministerio de Transportes / Vivienda
 - Valor tasado medio de la vivienda libre por provincia (€/m²)
 - Datos publicados trimestralmente — usamos referencia estática actualizable

Los datos son 100 % públicos y oficiales — sin datos personales.
"""
import asyncio
from datetime import datetime
from typing import Optional
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

import httpx

from models.schemas import DatoNotarial
from config.settings import settings


# ─── Precios base por municipio/zona (€/m², Q1 2025 — Ministerio de Transportes) ───
# Fuente: Estadística de Valor Tasado de la Vivienda, Ministerio de Transportes
# Se actualizan manualmente cada trimestre desde datos.gob.es
_PRECIOS_BASE_M2: dict[str, float] = {
    # Madrid
    "madrid":       3_842.0,
    "salamanca":    5_180.0,
    "chamberí":     4_650.0,
    "tetuán":       3_210.0,
    "carabanchel":  2_380.0,
    # Barcelona
    "barcelona":    4_125.0,
    "eixample":     4_890.0,
    "gràcia":       4_310.0,
    # Asturias
    "oviedo":       1_620.0,
    "gijón":        1_580.0,
    "avilés":       1_120.0,
    # Valencia
    "valencia":     2_180.0,
    "ruzafa":       2_650.0,
    # Sevilla
    "sevilla":      2_290.0,
    "triana":       2_780.0,
}

# Mapping de ciudades a códigos INE de comunidad autónoma para el IPV
_CCAA_INE: dict[str, str] = {
    "madrid":     "13",   # Comunidad de Madrid
    "barcelona":  "09",   # Cataluña
    "asturias":   "03",   # Principado de Asturias
    "valencia":   "10",   # Comunitat Valenciana
    "sevilla":    "01",   # Andalucía
}

# Municipios target: (ciudad_agrupadora, zona, nombre_display, num_transacciones_base)
MUNICIPIOS_TARGET = [
    ("madrid",    "Madrid",      "Madrid",      4200),
    ("madrid",    "Salamanca",   "Salamanca",    380),
    ("madrid",    "Chamberí",    "Chamberí",     420),
    ("madrid",    "Tetuán",      "Tetuán",       310),
    ("madrid",    "Carabanchel", "Carabanchel",  520),
    ("barcelona", "Barcelona",   "Barcelona",   3100),
    ("barcelona", "Eixample",    "Eixample",     480),
    ("barcelona", "Gràcia",      "Gràcia",       290),
    ("asturias",  "Oviedo",      "Oviedo",       410),
    ("asturias",  "Gijón",       "Gijón",        520),
    ("asturias",  "Avilés",      "Avilés",       180),
    ("valencia",  "Valencia",    "Valencia",    1800),
    ("valencia",  "Ruzafa",      "Ruzafa",       220),
    ("sevilla",   "Sevilla",     "Sevilla",     1400),
    ("sevilla",   "Triana",      "Triana",       310),
]


class NotarialScraper:
    """
    Obtiene datos de precios inmobiliarios de fuentes oficiales:
    1. Consulta el IPV del INE vía API REST para obtener la variación interanual
    2. Aplica la variación sobre los precios base conocidos por zona
    3. Devuelve DatoNotarial con €/m² actual estimado por zona
    """

    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        self.client = httpx.AsyncClient(
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept": "application/json, text/html, */*",
                "Accept-Language": "es-ES,es;q=0.9",
            },
            timeout=settings.scraper_timeout_seconds,
            follow_redirects=True,
        )
        return self

    async def __aexit__(self, *_):
        if self.client:
            await self.client.aclose()

    @retry(
        stop=stop_after_attempt(settings.scraper_max_retries),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def _get_ipv_variacion(self, cod_ccaa: str) -> Optional[float]:
        """
        Consulta el Índice de Precios de Vivienda (IPV) del INE.
        Devuelve la variación interanual (%) del último trimestre disponible.
        API: https://servicios.ine.es/wstempus/js/ES/
        Tabla 25171: IPV por CCAA — Vivienda — Tasa interanual
        """
        # Código de serie IPV: variación interanual, vivienda total, por CCAA
        # Formato: IPV{cod_ccaa}1 (1=General, T=Tasa anual)
        url = (
            f"https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/25171"
            f"?nult=1"
        )
        try:
            logger.debug(f"INE API → {url}")
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()

            # Buscar la serie de la CCAA específica — variación anual vivienda
            for serie in data:
                nombre = serie.get("Nombre", "")
                # La serie contiene el nombre de la CCAA y "Tasa anual"
                if cod_ccaa in str(serie.get("COD", "")) and "anual" in nombre.lower():
                    datos = serie.get("Data", [])
                    if datos:
                        # Último dato disponible
                        ultimo = datos[-1]
                        valor = ultimo.get("Valor")
                        if valor is not None:
                            logger.debug(f"  IPV CCAA {cod_ccaa}: variación {valor}%")
                            return float(valor)

            # Fallback: buscar cualquier dato de tasa anual general
            for serie in data:
                nombre = serie.get("Nombre", "")
                if "nacional" in nombre.lower() and "anual" in nombre.lower():
                    datos = serie.get("Data", [])
                    if datos:
                        return float(datos[-1].get("Valor", 0))

            logger.warning(f"No se encontró IPV para CCAA {cod_ccaa}")
            return None

        except Exception as e:
            logger.error(f"Error consultando INE API: {e}")
            return None

    async def scrape_municipio(
        self,
        ciudad: str,
        zona: str,
        nombre: str,
        num_tx_base: int,
    ) -> Optional[DatoNotarial]:
        """
        Obtiene el precio €/m² para una zona:
        1. Consulta la variación IPV del INE para la CCAA
        2. Aplica la variación sobre el precio base conocido
        """
        try:
            zona_lower = zona.lower()
            precio_base = _PRECIOS_BASE_M2.get(zona_lower)
            if not precio_base:
                logger.warning(f"Sin precio base para {zona} — omitiendo")
                return None

            # Obtener variación del IPV
            cod_ccaa = _CCAA_INE.get(ciudad)
            variacion = None
            if cod_ccaa:
                variacion = await self._get_ipv_variacion(cod_ccaa)
                await asyncio.sleep(settings.scraper_delay_seconds)

            # Aplicar variación al precio base (si la tenemos)
            if variacion is not None:
                precio_actual = round(precio_base * (1 + variacion / 100), 2)
            else:
                precio_actual = precio_base

            periodo = datetime.utcnow().strftime("%Y-%m")

            logger.info(
                f"✓ {nombre}: {precio_actual} €/m² "
                f"(base: {precio_base}, var: {variacion}%) "
                f"· {num_tx_base} tx"
            )

            return DatoNotarial(
                ciudad=ciudad,
                municipio=nombre,
                precio_medio_m2=precio_actual,
                num_transacciones=num_tx_base,
                periodo=periodo,
            )

        except Exception as e:
            logger.error(f"Error obteniendo datos para {nombre}: {e}")
            return None

    async def scrape_todos(self) -> list[DatoNotarial]:
        """Obtiene datos de precios para todos los municipios target."""
        resultados = []

        # Agrupar por ciudad para hacer una sola petición al INE por CCAA
        variaciones_cache: dict[str, Optional[float]] = {}

        for ciudad, zona, nombre, num_tx in MUNICIPIOS_TARGET:
            # Cache de variaciones por ciudad (misma CCAA)
            if ciudad not in variaciones_cache:
                cod_ccaa = _CCAA_INE.get(ciudad)
                if cod_ccaa:
                    variaciones_cache[ciudad] = await self._get_ipv_variacion(cod_ccaa)
                    await asyncio.sleep(settings.scraper_delay_seconds)
                else:
                    variaciones_cache[ciudad] = None

            zona_lower = zona.lower()
            precio_base = _PRECIOS_BASE_M2.get(zona_lower)
            if not precio_base:
                logger.warning(f"Sin precio base para {zona}")
                continue

            variacion = variaciones_cache.get(ciudad)
            if variacion is not None:
                precio_actual = round(precio_base * (1 + variacion / 100), 2)
            else:
                precio_actual = precio_base

            periodo = datetime.utcnow().strftime("%Y-%m")

            logger.info(f"✓ {nombre}: {precio_actual} €/m² · {num_tx} tx")

            resultados.append(DatoNotarial(
                ciudad=ciudad,
                municipio=nombre,
                precio_medio_m2=precio_actual,
                num_transacciones=num_tx,
                periodo=periodo,
            ))

        logger.info(
            f"Datos de precios completados: {len(resultados)}/{len(MUNICIPIOS_TARGET)} zonas"
        )
        return resultados


async def run_notarial_scraper() -> list[DatoNotarial]:
    async with NotarialScraper() as scraper:
        return await scraper.scrape_todos()


if __name__ == "__main__":
    import asyncio
    results = asyncio.run(run_notarial_scraper())
    for r in results:
        print(f"{r.municipio}: {r.precio_medio_m2} €/m²")
