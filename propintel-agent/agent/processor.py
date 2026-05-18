"""
Núcleo del agente: recibe un mensaje de texto, ejecuta el loop de tool-calling
con Gemini 2.0 Flash y devuelve la respuesta final en texto.
"""
import google.generativeai as genai
from loguru import logger

from config.settings import settings
from agent.context import get_history, save_history, clear_history
from agent.tools import TOOL_DECLARATIONS, execute_tool

# ─── Configuración Gemini ─────────────────────────────────────────────────────

genai.configure(api_key=settings.gemini_api_key)

SYSTEM_PROMPT = """Eres PropIntel Assistant, el agente inmobiliario inteligente de PropIntel disponible por WhatsApp y Telegram.

Eres experto en:
- Mercado inmobiliario español: precios asking (Idealista/Fotocasa) vs precios notariales reales
- Análisis de gaps y oportunidades de inversión
- Hipotecas, Euríbor, gastos de compraventa en España
- Búsqueda personalizada de propiedades

NORMAS IMPORTANTES:
- Responde SIEMPRE en español.
- Para WhatsApp/Telegram sé CONCISO: máximo 3 párrafos o una lista corta.
- Cuando el usuario busque propiedades, SIEMPRE usa la herramienta buscar_propiedades.
- Cuando pregunten por mercado o precios de una zona, usa analizar_mercado.
- Cuando pregunten por hipoteca o cuota, usa calcular_hipoteca.
- Usa formato Markdown básico (*negrita*, _cursiva_) para WhatsApp/Telegram.

FORMATO DE INMUEBLES (usa este exacto):
🏠 *Título* — 250.000 € _(3.200 €/m²)_
📍 Salamanca · Idealista · 3 hab · 78 m²
👉 https://propintel-omega.vercel.app/ficha/ID_REAL

Sustituye ID_REAL por el valor numérico del campo "id" del inmueble. Nunca escribas "{id}" literal.
No muestres gap por inmueble individual (no hay dato disponible). El gap sí se muestra al analizar mercado.

COMANDOS ESPECIALES que debes reconocer:
/reset o "nueva conversación" → responde "Conversación reiniciada. ¿En qué puedo ayudarte?"
/ayuda o "qué puedes hacer" → lista tus capacidades brevemente
"""

_GEMINI_TOOLS = genai.protos.Tool(
    function_declarations=[
        genai.protos.FunctionDeclaration(
            name=t["name"],
            description=t["description"],
            parameters=genai.protos.Schema(
                type=genai.protos.Type.OBJECT,
                properties={
                    k: genai.protos.Schema(
                        type=genai.protos.Type.STRING if v["type"] == "string"
                             else genai.protos.Type.INTEGER if v["type"] == "integer"
                             else genai.protos.Type.NUMBER,
                        description=v.get("description", ""),
                    )
                    for k, v in t["parameters"]["properties"].items()
                },
                required=t["parameters"].get("required", []),
            ),
        )
        for t in TOOL_DECLARATIONS
    ]
)

_model = genai.GenerativeModel(
    model_name=settings.gemini_model,
    system_instruction=SYSTEM_PROMPT,
    tools=[_GEMINI_TOOLS],
    generation_config=genai.types.GenerationConfig(
        temperature=0.7,
        max_output_tokens=1024,
    ),
)


# ─── Procesador principal ────────────────────────────────────────────────────

async def process_message(
    canal: str,
    user_id: str,
    texto: str,
    nombre_usuario: str | None = None,
) -> str:
    """
    Procesa un mensaje entrante y devuelve la respuesta del agente.

    Args:
        canal:          'whatsapp' | 'telegram' | 'web'
        user_id:        identificador único del usuario en ese canal
        texto:          mensaje de texto del usuario
        nombre_usuario: nombre de pila para personalizar (opcional)

    Returns:
        Texto de respuesta listo para enviar al usuario.
    """
    # Comandos especiales (sin IA)
    texto_norm = texto.strip().lower()
    if texto_norm in ("/reset", "/start", "nueva conversación", "reset"):
        await clear_history(canal, user_id)
        return "🔄 Conversación reiniciada. ¿En qué puedo ayudarte hoy?"

    if texto_norm in ("/ayuda", "/help", "ayuda", "qué puedes hacer", "que puedes hacer"):
        return (
            "🏠 *PropIntel Assistant* — Lo que puedo hacer por ti:\n\n"
            '🔍 *Buscar pisos*: _"3 hab en Chamberí por menos de 400k"_\n'
            '📊 *Analizar mercado*: _"¿Cómo está el mercado en Salamanca?"_\n'
            '🏦 *Calcular hipoteca*: _"¿Cuánto pago por 280k a 25 años?"_\n'
            '🔔 *Crear alerta*: _"Avísame si sale algo en Tetuán < 300k"_\n'
            '📈 *Análisis de gap*: _"¿Está bien de precio este piso?"_\n\n'
            "Escríbeme en lenguaje natural, entiendo todo 👂"
        )

    # Cargar historial de Redis
    history_dicts = await get_history(canal, user_id)

    # Reconstruir historial en formato Gemini
    gemini_history = []
    for msg in history_dicts:
        gemini_history.append(
            genai.protos.Content(
                role=msg["role"],
                parts=[genai.protos.Part(text=msg["text"])],
            )
        )

    # Iniciar chat con historial
    chat = _model.start_chat(history=gemini_history)

    # Personalizar saludo si es primera vez
    mensaje_usuario = texto
    if not history_dicts and nombre_usuario:
        mensaje_usuario = f"[El usuario se llama {nombre_usuario}] {texto}"

    # ─── Loop de tool-calling ────────────────────────────────────────────────
    MAX_TOOL_ROUNDS = 4
    response = await _send_message_async(chat, mensaje_usuario)

    for _ in range(MAX_TOOL_ROUNDS):
        # ¿Gemini quiere llamar a una herramienta?
        tool_calls = _extract_tool_calls(response)
        if not tool_calls:
            break

        # Ejecutar todas las herramientas pedidas
        tool_parts = []
        for fn_name, fn_args in tool_calls:
            result = await execute_tool(fn_name, fn_args)
            logger.debug(f"[Tool result] {fn_name} → {result}")
            tool_parts.append(
                genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=fn_name,
                        response={"result": result},
                    )
                )
            )

        # Devolver resultados a Gemini
        response = await _send_message_async(
            chat,
            genai.protos.Content(role="tool", parts=tool_parts),
        )

    # ─── Extraer texto de respuesta ──────────────────────────────────────────
    respuesta_texto = _extract_text(response)
    if not respuesta_texto:
        respuesta_texto = "Lo siento, no pude generar una respuesta. Inténtalo de nuevo."

    # Guardar historial actualizado
    new_history = history_dicts + [
        {"role": "user",  "text": texto},
        {"role": "model", "text": respuesta_texto},
    ]
    await save_history(canal, user_id, new_history)

    return respuesta_texto


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _send_message_async(chat, message):
    """Wrapper async para el método síncrono de Gemini."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, chat.send_message, message)


def _extract_tool_calls(response) -> list[tuple[str, dict]]:
    """Extrae las llamadas a herramientas de la respuesta de Gemini."""
    calls = []
    try:
        for part in response.parts:
            if hasattr(part, "function_call") and part.function_call.name:
                fn = part.function_call
                calls.append((fn.name, dict(fn.args)))
    except Exception:
        pass
    return calls


def _extract_text(response) -> str:
    """Extrae el texto final de la respuesta de Gemini."""
    try:
        return response.text or ""
    except Exception:
        try:
            parts = [p.text for p in response.parts if hasattr(p, "text") and p.text]
            return "\n".join(parts)
        except Exception:
            return ""
