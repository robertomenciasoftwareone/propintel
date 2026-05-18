"""
Adaptador para la Telegram Bot API.
- Parsea Updates entrantes (POST al webhook)
- Envía mensajes con Markdown
"""
import httpx
from loguru import logger
from config.settings import settings

_TG_BASE = f"https://api.telegram.org/bot{settings.telegram_bot_token}"


# ─── Parseo de updates entrantes ──────────────────────────────────────────────

def parse_incoming(body: dict) -> list[dict]:
    """
    Parsea un Update de Telegram y extrae mensajes de texto.
    Devuelve lista de dicts: {user_id, nombre, texto, chat_id}
    """
    messages = []
    try:
        msg = body.get("message") or body.get("edited_message")
        if not msg:
            return messages

        text = msg.get("text", "").strip()
        if not text:
            return messages  # Ignorar stickers, fotos, etc.

        frm      = msg.get("from", {})
        chat_id  = str(msg["chat"]["id"])
        user_id  = str(frm.get("id", chat_id))
        nombre   = frm.get("first_name", "")

        messages.append({
            "user_id": user_id,
            "nombre":  nombre,
            "texto":   text,
            "chat_id": chat_id,
        })
    except Exception as e:
        logger.error(f"Telegram parse_incoming error: {e}")
    return messages


# ─── Envío de mensajes ────────────────────────────────────────────────────────

async def send_text(chat_id: str, text: str) -> bool:
    """Envía mensaje con formato Markdown. Divide si supera 4096 chars."""
    chunks = _split(text, 4000)
    ok = True
    for chunk in chunks:
        ok = ok and await _api_call("sendMessage", {
            "chat_id":    chat_id,
            "text":       chunk,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True,
        })
    return ok


async def send_typing(chat_id: str) -> None:
    """Muestra el indicador 'escribiendo...'"""
    await _api_call("sendChatAction", {"chat_id": chat_id, "action": "typing"})


async def set_webhook(webhook_url: str) -> dict:
    """Registra el webhook en Telegram. Llamar una vez al desplegar."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(f"{_TG_BASE}/setWebhook", json={
            "url":             webhook_url,
            "allowed_updates": ["message", "edited_message"],
            "drop_pending_updates": True,
        })
        return resp.json()


async def _api_call(method: str, payload: dict) -> bool:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{_TG_BASE}/{method}", json=payload)
            if not resp.json().get("ok"):
                logger.error(f"Telegram {method} error: {resp.text}")
                return False
            return True
    except Exception as e:
        logger.error(f"Telegram _api_call ({method}) error: {e}")
        return False


def _split(text: str, max_len: int) -> list[str]:
    if len(text) <= max_len:
        return [text]
    chunks, current = [], ""
    for line in text.splitlines(keepends=True):
        if len(current) + len(line) > max_len:
            if current:
                chunks.append(current.rstrip())
            current = line
        else:
            current += line
    if current:
        chunks.append(current.rstrip())
    return chunks or [text[:max_len]]
