"""
PropIntel Agent — FastAPI (Railway)
Sustituye a function_app.py (Azure Functions).
Misma lógica, diferente runtime.

Rutas:
  GET  /webhook/whatsapp  ← verificación Meta
  POST /webhook/whatsapp  ← mensajes WhatsApp
  POST /webhook/telegram  ← mensajes Telegram
  GET  /setup/telegram    ← registrar webhook TG (una vez)
  GET  /health            ← healthcheck Railway
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from loguru import logger

from agent.processor import process_message
from channels import whatsapp as wa
from channels import telegram as tg


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PropIntel Agent arrancado ✓")
    yield
    logger.info("PropIntel Agent detenido")


app = FastAPI(title="PropIntel Agent", lifespan=lifespan)


# ─── Health check ────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "propintel-agent"}


# ─── WhatsApp ─────────────────────────────────────────────────────────────────

@app.get("/webhook/whatsapp")
async def whatsapp_verify(request: Request):
    """Meta llama a este endpoint GET para verificar el webhook."""
    params    = request.query_params
    mode      = params.get("hub.mode", "")
    token     = params.get("hub.verify_token", "")
    challenge = params.get("hub.challenge", "")

    ok, body = wa.verify_webhook(mode, token, challenge)
    return Response(content=body, status_code=200 if ok else 403)


@app.post("/webhook/whatsapp")
async def whatsapp_incoming(request: Request):
    """Recibe mensajes de WhatsApp y responde."""
    try:
        body = await request.json()
    except Exception:
        return Response("Bad JSON", status_code=400)

    messages = wa.parse_incoming(body)

    for msg in messages:
        user_id  = msg["user_id"]
        nombre   = msg.get("nombre", "")
        texto    = msg["texto"]
        phone_id = msg["phone_number_id"]
        msg_id   = msg["msg_id"]

        logger.info(f"[WA] {user_id} ({nombre}): {texto[:80]}")
        await wa.mark_as_read(phone_id, msg_id)

        try:
            respuesta = await process_message(
                canal="whatsapp",
                user_id=user_id,
                texto=texto,
                nombre_usuario=nombre,
            )
            await wa.send_text(phone_id, user_id, respuesta)
        except Exception as e:
            logger.exception(f"Error procesando WA msg: {e}")
            await wa.send_text(
                phone_id, user_id,
                "⚠️ Ha ocurrido un error. Inténtalo de nuevo en unos segundos."
            )

    return Response("OK", status_code=200)


# ─── Telegram ────────────────────────────────────────────────────────────────

@app.post("/webhook/telegram")
async def telegram_incoming(request: Request):
    """Recibe updates de Telegram y responde."""
    try:
        body = await request.json()
    except Exception:
        return Response("Bad JSON", status_code=400)

    messages = tg.parse_incoming(body)

    for msg in messages:
        user_id = msg["user_id"]
        chat_id = msg["chat_id"]
        nombre  = msg.get("nombre", "")
        texto   = msg["texto"]

        logger.info(f"[TG] {user_id} ({nombre}): {texto[:80]}")
        await tg.send_typing(chat_id)

        try:
            respuesta = await process_message(
                canal="telegram",
                user_id=user_id,
                texto=texto,
                nombre_usuario=nombre,
            )
            await tg.send_text(chat_id, respuesta)
        except Exception as e:
            logger.exception(f"Error procesando TG msg: {e}")
            await tg.send_text(chat_id, "⚠️ Ha ocurrido un error. Inténtalo de nuevo.")

    return Response("OK", status_code=200)


# ─── Setup Telegram (llamar una vez tras despliegue) ─────────────────────────

@app.get("/setup/telegram")
async def setup_telegram(request: Request):
    """
    Registra el webhook de Telegram.
    Llamar UNA VEZ: GET /setup/telegram?url=https://tu-servicio.railway.app
    """
    url = request.query_params.get("url", "")
    if not url:
        return {"error": "Param 'url' requerido"}
    webhook_url = url.rstrip("/") + "/webhook/telegram"
    result = await tg.set_webhook(webhook_url)
    return result
