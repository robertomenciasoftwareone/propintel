"""
Scraper de estadísticas macroeconómicas oficiales — INE y BdE.

Fuentes:
  - INE: Índice de Precios de Vivienda (IPV) — trimestral
  - INE: Estadística de Hipotecas (HPT) — mensual
  - BCE/BdE: Tipos de interés hipotecarios — mensual (best-effort)

Series verificadas contra API INE:
  IPV1  = Base 2007. Nacional. General. Índice
  IPV3  = Base 2007. Nacional. General. Variación anual  ← KPI principal
  IPV5  = Base 2007. Nacional. Vivienda Nueva. Índice
  IPV7  = Base 2007. Nacional. Vivienda Nueva. Variación anual
  IPV9  = Base 2007. Nacional. Segunda mano. Índice
  IPV11 = Base 2007. Nacional. Segunda mano. Variación anual
  HPT10176 = Total fincas. Total. Número de hipotecas. Total Nacional
  HPT10123 = Total fincas. Total. Importe de hipotecas. Total Nacional

Uso:
  from scrapers.ine_bde_scraper import run_ine_bde_scraper
  await run_ine_bde_scraper()
"""
import asyncio
from datetime import datetime, date
from typing import Optional
from loguru import logger

import httpx

from models.schemas import EstadisticaMacro


# ── Configuración de series ──────────────────────────────────────────────────

INE_BASE_URL = "https://servicios.ine.es/wstempus/js/ES"

SERIES_INE: dict[str, tuple[str, str, str]] = {
    #  clave              código      descripción                          unidad
    "ipv_indice_general":    ("IPV1",  "IPV General Índice (Base 2007)",   "índice"),
    "ipv_var_anual_general": ("IPV3",  "IPV General Var. anual",           "%"),
    "ipv_indice_nueva":      ("IPV5",  "IPV Nueva vivienda Índice",        "índice"),
    "ipv_var_anual_nueva":   ("IPV7",  "IPV Nueva vivienda Var. anual",    "%"),
    "ipv_indice_usada":      ("IPV9",  "IPV Segunda mano Índice",          "índice"),
    "ipv_var_anual_usada":   ("IPV11", "IPV Segunda mano Var. anual",      "%"),
    "hipotecas_numero":      ("HPT10176", "Hipotecas constituidas (núm.)", "unidades"),
    "hipotecas_importe":     ("HPT10123", "Hipotecas constituidas (imp.)", "miles €"),
}

# ── Ayudantes de periodo ─────────────────────────────────────────────────────

def _parse_periodo_ine(punto: dict) -> str:
    """Convierte un punto de datos INE a período legible: '2024-T3' o '2024-11'."""
    nombre = punto.get("NombrePeriodo", "")
    if nombre and nombre != "?":
        return nombre.strip()

    anyo = punto.get("Anyo", 0)
    fk   = punto.get("FK_Periodo", 0)

    # Trimestres: codes 22-25 → T1-T4
    trim_map = {22: "T1", 23: "T2", 24: "T3", 25: "T4"}
    if fk in trim_map:
        return f"{anyo}-{trim_map[fk]}"

    # Meses: INE FK_Periodo: 22=Jan,...,33=Dec (offset 21 from common INE convention)
    # Alternatively some operations use 1=Jan,...,12=Dec
    if 1 <= fk <= 12:
        return f"{anyo}-{fk:02d}"
    if 22 <= fk <= 33:
        mes = fk - 21
        return f"{anyo}-{mes:02d}"

    return f"{anyo}"


def _calcular_variacion(datos: list[dict]) -> Optional[float]:
    """Calcula la variación porcentual entre el último y penúltimo punto."""
    if len(datos) < 2:
        return None
    try:
        ant = datos[-2].get("Valor")
        act = datos[-1].get("Valor")
        if ant and act and ant != 0:
            return round(((act - ant) / abs(ant)) * 100, 2)
    except (TypeError, ZeroDivisionError):
        pass
    return None


# ── Carga de datos INE ───────────────────────────────────────────────────────

async def _fetch_serie_ine(
    client: httpx.AsyncClient,
    clave: str,
    codigo: str,
    descripcion: str,
    unidad: str,
    nult: int = 12,
) -> list[EstadisticaMacro]:
    """Descarga los últimos nult puntos de una serie INE y los mapea a EstadisticaMacro."""
    url = f"{INE_BASE_URL}/DATOS_SERIE/{codigo}?nult={nult}&det=2"

    try:
        r = await client.get(url, timeout=20)
        r.raise_for_status()
        payload = r.json()
    except Exception as e:
        logger.warning(f"[INE] Error fetching {codigo} ({clave}): {e}")
        return []

    raw_datos: list[dict] = payload.get("Data", [])
    if not raw_datos:
        logger.warning(f"[INE] Serie {codigo} devolvió 0 puntos de datos")
        return []

    resultados: list[EstadisticaMacro] = []
    for i, punto in enumerate(raw_datos):
        valor = punto.get("Valor")
        if valor is None or punto.get("Secreto", False):
            continue

        periodo = _parse_periodo_ine(punto)
        anyo = punto.get("Anyo")

        # Variación respecto al punto anterior (dentro de la misma serie)
        var_pct = None
        if i > 0:
            ant_valor = raw_datos[i - 1].get("Valor")
            if ant_valor and ant_valor != 0:
                var_pct = round(((float(valor) - float(ant_valor)) / abs(float(ant_valor))) * 100, 2)

        resultados.append(EstadisticaMacro(
            fuente="INE",
            indicador=clave,
            descripcion=descripcion,
            periodo=periodo,
            anyo=anyo,
            valor=float(valor),
            unidad=unidad,
            variacion_pct=var_pct,
        ))

    logger.info(f"[INE] {codigo} ({clave}): {len(resultados)} puntos cargados")
    return resultados


# ── Carga de tipos de interés (BCE, best-effort) ─────────────────────────────

async def _fetch_tipos_interes_bce(client: httpx.AsyncClient) -> list[EstadisticaMacro]:
    """
    Intenta obtener tipos de interés hipotecarios de España desde BCE.
    Serie MIR: M.ES.B.A2C.AM.R.A.2250.EUR.N (préstamos hipotecarios nuevos, España).
    Devuelve lista vacía si no está disponible.
    """
    url = (
        "https://data.ecb.europa.eu/api/data/MIR/"
        "M.ES.B.A2C.AM.R.A.2250.EUR.N"
        "?lastNObservations=12&detail=dataonly&format=jsondata"
    )
    try:
        r = await client.get(url, timeout=20)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.warning(f"[BCE] Tipos interés no disponibles: {e}")
        return []

    try:
        datasets = data.get("dataSets", [])
        if not datasets:
            return []

        series_map = datasets[0].get("series", {})
        if not series_map:
            return []

        observations = list(series_map.values())[0].get("observations", {})
        if not observations:
            return []

        # Time dimension labels
        time_labels = []
        try:
            dims = data["structure"]["dimensions"]["observation"]
            for dim in dims:
                if dim.get("id") == "TIME_PERIOD":
                    time_labels = [v.get("id", "") for v in dim.get("values", [])]
                    break
        except (KeyError, IndexError):
            pass

        resultados: list[EstadisticaMacro] = []
        for idx_str, vals in sorted(observations.items(), key=lambda x: int(x[0])):
            idx = int(idx_str)
            if not vals or vals[0] is None:
                continue
            valor = float(vals[0])
            periodo = time_labels[idx] if idx < len(time_labels) else ""

            try:
                anyo = int(periodo[:4]) if periodo else None
            except ValueError:
                anyo = None

            resultados.append(EstadisticaMacro(
                fuente="BCE",
                indicador="tipo_interes_hipotecario",
                descripcion="Tipo interés préstamos hipotecarios nuevos — España (BCE MIR)",
                periodo=periodo,
                anyo=anyo,
                valor=valor,
                unidad="%",
                variacion_pct=None,
            ))

        logger.info(f"[BCE] tipos_interes: {len(resultados)} puntos cargados")
        return resultados

    except (KeyError, IndexError, TypeError) as e:
        logger.warning(f"[BCE] Error parseando respuesta: {e}")
        return []


# ── Punto de entrada principal ────────────────────────────────────────────────

async def run_ine_bde_scraper(nult: int = 16) -> list[EstadisticaMacro]:
    """
    Descarga todas las series macro configuradas.

    Args:
        nult: Número de últimos períodos a descargar por serie (default 16 = 4 años de IPV).

    Returns:
        Lista de EstadisticaMacro lista para persistir en BD.
    """
    logger.info("📊 [INE/BdE] Iniciando descarga de estadísticas macro...")

    todas: list[EstadisticaMacro] = []

    async with httpx.AsyncClient(
        headers={"Accept": "application/json", "User-Agent": "UrbIA/1.0"},
        follow_redirects=True,
    ) as client:
        # Descargar series INE en paralelo
        tareas = [
            _fetch_serie_ine(client, clave, codigo, descripcion, unidad, nult)
            for clave, (codigo, descripcion, unidad) in SERIES_INE.items()
        ]
        resultados_ine = await asyncio.gather(*tareas, return_exceptions=True)

        for r in resultados_ine:
            if isinstance(r, list):
                todas.extend(r)
            elif isinstance(r, Exception):
                logger.error(f"[INE] Tarea fallida: {r}")

        # Tipos de interés BCE (best-effort)
        tipos = await _fetch_tipos_interes_bce(client)
        todas.extend(tipos)

    logger.info(f"📊 [INE/BdE] Total puntos descargados: {len(todas)}")
    return todas
