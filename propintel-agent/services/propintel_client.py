"""
Cliente HTTP para la API de PropIntel.
Todos los métodos son async y devuelven dicts normalizados.
"""
import httpx
from loguru import logger
from config.settings import settings


_HEADERS = {
    "X-Api-Key": settings.propintel_api_key,
    "Content-Type": "application/json",
}


async def buscar_propiedades(pregunta: str, ciudad: str | None = None) -> dict:
    """Llama a /asistente/preguntar y devuelve total + muestra de inmuebles."""
    payload = {"pregunta": pregunta}
    if ciudad:
        payload["municipio"] = ciudad

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{settings.propintel_api_url}/asistente/preguntar",
                json=payload,
                headers=_HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "total": data.get("totalResultados", 0),
                "respuesta": data.get("respuesta", ""),
                "inmuebles": [
                    {
                        "id":          a["id"],
                        "titulo":      a.get("titulo") or f"Inmueble en {a.get('distrito', '?')}",
                        "precio":      a.get("precioTotal", 0),
                        "precio_m2":   round(a.get("precioM2") or 0),
                        "superficie":  a.get("superficieM2"),
                        "habitaciones": a.get("habitaciones"),
                        "distrito":    a.get("distrito"),
                        "fuente":      a.get("fuente", ""),
                        "url":         a.get("url", ""),
                        "foto":        a.get("fotoPrincipal"),
                    }
                    for a in (data.get("muestra") or [])
                ],
            }
    except httpx.HTTPStatusError as e:
        logger.warning(f"PropIntel API error {e.response.status_code}: {e.response.text}")
        return {"total": 0, "respuesta": "Error consultando la base de datos.", "inmuebles": []}
    except Exception as e:
        logger.error(f"buscar_propiedades error: {e}")
        return {"total": 0, "respuesta": "Error de conexión con PropIntel.", "inmuebles": []}


async def analizar_mercado(ciudad: str, zona: str | None = None) -> dict:
    """Obtiene estadísticas de precios por código postal para una ciudad."""
    try:
        url = f"{settings.propintel_api_url}/mapa/cp?ciudad={ciudad}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=_HEADERS)
            resp.raise_for_status()
            data: list[dict] = resp.json()

        # Filtrar por zona si se especifica
        if zona:
            z = zona.lower()
            data = [d for d in data if z in (d.get("nombre") or "").lower() or z in (d.get("cp") or "")]

        if not data:
            return {"error": f"Sin datos para {ciudad}" + (f" / {zona}" if zona else "")}

        # Calcular resumen
        precios = [d["precioM2"] for d in data if d.get("precioM2")]
        gaps    = [d["gapPct"]   for d in data if d.get("gapPct") is not None]
        top5    = sorted(data, key=lambda x: x.get("precioM2", 0))[:5]

        return {
            "ciudad":         ciudad,
            "zona_filtro":    zona,
            "num_zonas":      len(data),
            "precio_min_m2":  round(min(precios)) if precios else None,
            "precio_max_m2":  round(max(precios)) if precios else None,
            "precio_medio_m2": round(sum(precios) / len(precios)) if precios else None,
            "gap_medio_pct":  round(sum(gaps) / len(gaps), 1) if gaps else None,
            "zonas_baratas": [
                {
                    "cp":      z["cp"],
                    "nombre":  z.get("nombre", z["cp"]),
                    "precio_m2": round(z["precioM2"]),
                    "gap_pct": z.get("gapPct"),
                }
                for z in top5
            ],
        }
    except Exception as e:
        logger.error(f"analizar_mercado error: {e}")
        return {"error": str(e)}


async def crear_alerta(
    zona: str,
    ciudad: str,
    precio_max: int,
    gap_minimo_pct: float,
    email: str,
    descripcion: str = "",
) -> dict:
    """Crea una alerta de precio en PropIntel."""
    payload = {
        "zona":           zona,
        "ciudad":         ciudad,
        "precioMaxAsking": precio_max,
        "gapMinimoPct":   gap_minimo_pct,
        "emailDestino":   email,
        "descripcion":    descripcion,
        "activa":         True,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{settings.propintel_api_url}/alertas",
                json=payload,
                headers=_HEADERS,
            )
            resp.raise_for_status()
            return {"ok": True, "mensaje": f"✅ Alerta creada para {zona} ({ciudad}), máximo {precio_max:,} €."}
    except Exception as e:
        logger.error(f"crear_alerta error: {e}")
        return {"ok": False, "mensaje": "No se pudo crear la alerta. ¿Tienes una cuenta vinculada?"}
