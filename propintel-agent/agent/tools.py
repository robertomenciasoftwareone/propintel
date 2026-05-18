"""
Definición y ejecución de las herramientas (tool-calling) del agente.
Gemini llama a estas funciones; nosotros las ejecutamos contra PropIntel API.
"""
import math
from loguru import logger
from services import propintel_client as api

# ─── Definiciones para Gemini ─────────────────────────────────────────────────

TOOL_DECLARATIONS = [
    {
        "name": "buscar_propiedades",
        "description": (
            "Busca propiedades inmobiliarias en España según los criterios del usuario. "
            "Úsala cuando el usuario quiera encontrar pisos, casas o cualquier inmueble. "
            "Devuelve una lista con precio, m², habitaciones y gap de precio."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "pregunta": {
                    "type": "string",
                    "description": "La búsqueda en lenguaje natural tal como la dice el usuario",
                },
                "ciudad": {
                    "type": "string",
                    "description": "Ciudad o municipio (madrid, barcelona, valencia…). Omitir si no se especifica.",
                },
            },
            "required": ["pregunta"],
        },
    },
    {
        "name": "analizar_mercado",
        "description": (
            "Analiza el mercado inmobiliario de una ciudad: precio medio por m², "
            "gap entre asking y precio notarial real, y zonas más baratas. "
            "Úsala para preguntas sobre tendencias, precios medios, comparativas de barrios."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "ciudad": {
                    "type": "string",
                    "description": "Ciudad a analizar (madrid, barcelona, valencia…)",
                },
                "zona": {
                    "type": "string",
                    "description": "Barrio, distrito o código postal específico. Omitir para toda la ciudad.",
                },
            },
            "required": ["ciudad"],
        },
    },
    {
        "name": "calcular_hipoteca",
        "description": (
            "Calcula la cuota mensual, total pagado e intereses de una hipoteca. "
            "Úsala cuando el usuario pregunte cuánto pagaría de hipoteca o cuota mensual."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "precio_vivienda": {
                    "type": "integer",
                    "description": "Precio total de la vivienda en euros",
                },
                "entrada_pct": {
                    "type": "number",
                    "description": "Porcentaje de entrada (típicamente 20%). Valor entre 0 y 100.",
                },
                "plazo_anos": {
                    "type": "integer",
                    "description": "Plazo de la hipoteca en años (típicamente 25-30)",
                },
                "interes_anual": {
                    "type": "number",
                    "description": "Tipo de interés anual en % (usar Euríbor actual ~3.5% + diferencial ~1% = 4.5% si no se especifica)",
                },
            },
            "required": ["precio_vivienda", "entrada_pct", "plazo_anos"],
        },
    },
    {
        "name": "crear_alerta",
        "description": (
            "Crea una alerta para que el usuario reciba notificaciones cuando salga un inmueble "
            "que cumpla sus criterios de precio y gap. "
            "Úsala cuando el usuario diga 'avísame', 'quiero que me notifiques', 'crea una alerta'."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "zona":           {"type": "string", "description": "Barrio o zona de interés"},
                "ciudad":         {"type": "string", "description": "Ciudad"},
                "precio_max":     {"type": "integer", "description": "Precio máximo en euros"},
                "gap_minimo_pct": {"type": "number",  "description": "Gap mínimo (%) para filtrar oportunidades. Usar 0 si no especifica."},
                "email":          {"type": "string",  "description": "Email donde enviar las notificaciones"},
                "descripcion":    {"type": "string",  "description": "Descripción opcional de la alerta"},
            },
            "required": ["zona", "ciudad", "precio_max", "email"],
        },
    },
]


# ─── Ejecutor de herramientas ──────────────────────────────────────────────────

async def execute_tool(name: str, args: dict) -> dict:
    """
    Despacha la llamada de herramienta de Gemini al servicio correspondiente.
    Devuelve un dict con el resultado (siempre serializable a JSON).
    """
    logger.info(f"[Tool] {name}({args})")
    try:
        if name == "buscar_propiedades":
            return await api.buscar_propiedades(
                pregunta=args["pregunta"],
                ciudad=args.get("ciudad"),
            )

        elif name == "analizar_mercado":
            return await api.analizar_mercado(
                ciudad=args["ciudad"],
                zona=args.get("zona"),
            )

        elif name == "calcular_hipoteca":
            return _calcular_hipoteca(
                precio_vivienda=int(args["precio_vivienda"]),
                entrada_pct=float(args["entrada_pct"]),
                plazo_anos=int(args["plazo_anos"]),
                interes_anual=float(args.get("interes_anual", 4.5)),
            )

        elif name == "crear_alerta":
            return await api.crear_alerta(
                zona=args["zona"],
                ciudad=args["ciudad"],
                precio_max=int(args["precio_max"]),
                gap_minimo_pct=float(args.get("gap_minimo_pct", 0.0)),
                email=args["email"],
                descripcion=args.get("descripcion", ""),
            )

        else:
            return {"error": f"Herramienta desconocida: {name}"}

    except Exception as e:
        logger.error(f"Tool {name} failed: {e}")
        return {"error": str(e)}


def _calcular_hipoteca(
    precio_vivienda: int,
    entrada_pct: float,
    plazo_anos: int,
    interes_anual: float,
) -> dict:
    entrada  = precio_vivienda * entrada_pct / 100
    capital  = precio_vivienda - entrada
    r        = interes_anual / 100 / 12
    n        = plazo_anos * 12

    if r == 0:
        cuota = capital / n
    else:
        cuota = capital * (r * (1 + r) ** n) / ((1 + r) ** n - 1)

    total_pagado   = cuota * n
    intereses      = total_pagado - capital
    gastos_compra  = round(precio_vivienda * 0.10)  # ~10% ITP+notaría+registro

    return {
        "precio_vivienda":    precio_vivienda,
        "entrada":            round(entrada),
        "capital_financiado": round(capital),
        "cuota_mensual":      round(cuota),
        "total_pagado":       round(total_pagado),
        "intereses_totales":  round(intereses),
        "plazo_anos":         plazo_anos,
        "tipo_interes_pct":   interes_anual,
        "gastos_compra_est":  gastos_compra,
        "coste_total":        round(total_pagado + entrada + gastos_compra),
    }
