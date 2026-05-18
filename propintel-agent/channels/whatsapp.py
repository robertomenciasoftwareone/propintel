"""
Adaptador para la Meta WhatsApp Cloud API.
- Verifica el webhook (GET)
- Procesa mensajes entrantes (POST)
- Envía respuestas
"""
import hashlib
import hmac
import httpx
from loguru import logger
from config.settings import settings

_WA_API_URL = "https://graph.facebook.com/v20.0"


# ─── Verificación webhook (GET) ───────────────────────────────────────────────

def verify_webhook(mode: str, token: str, challenge: str) -> tuple[bool, str]:
    """
    Meta envía hub.mode=subscribe, hub.verify_token y hub.challenge.
    Si el token coincide devolvemos (True, challenge).
    """
    if mode == "subscribe" and token == settings.wa_verify_token:
        logger.info("WhatsApp webhook verificado ✓")
        return True, challenge
    logger.warning(f"WhatsApp webhook token inválido: {token!r}")
    return False, ""


# ─── Parseo de mensajes entrantes (POST) ─────────────────────────────────────

def parse_incoming(body: dict) -> list[dict]:
    """
    Parsea el payload de WhatsApp y extrae la lista de mensajes de texto.
    Devuelve lista de dicts: {user_id, nombre, texto, phone_number_id, msg_id}
    """
    messages = []
    try:
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                phone_number_id = value.get("metadata", {}).get("phone_number_id", "")
                contacts = {c["wa_id"]: c.get("profile", {}).get("name", "") for c in value.get("contacts", [])}

                for msg in value.get("messages", []):
                    msg_type = msg.get("type", "")
                    if msg_type != "text":
                        # Ignorar imágenes, audio, etc. en el MVP
                        continue
                    user_id = msg.get("from", "")
                    messages.append({
                        "user_id":         user_id,
                        "nombre":          contacts.get(user_id, ""),
                        "texto":           msg["text"]["body"],
                        "phone_number_id": phone_number_id,
                        "msg_id":          msg.get("id", ""),
                    })
    except Exception as e:
        logger.error(f"WhatsApp parse_incoming error: {e}")
    return messages


# ─── Envío de mensajes ───────────────────────────────────────────────────────

async def send_text(phone_number_id: str, to: str, text: str) -> bool:
    """Envía un mensaje de texto simple."""
    # WhatsApp tiene límite de 4096 caracteres por mensaje
    chunks = _split_message(text, 4000)
    ok = True
    for chunk in chunks:
        ok = ok and await _send_payload(phone_number_id, {
            "messaging_product": "whatsapp",
            "recipient_type":    "individual",
            "to":                to,
            "type":              "text",
            "text":              {"preview_url": False, "body": chunk},
        })
    return ok


async def send_typing_indicator(phone_number_id: str, to: str) -> None:
    """Marca el estado 'escribiendo' (solo funciona con Business API verificada)."""
    await _send_payload(phone_number_id, {
        "messaging_product": "whatsapp",
        "recipient_type":    "individual",
        "to":                to,
        "type":              "reaction",
        "reaction":          {"message_id": "", "emoji": "⏳"},
    })


async def mark_as_read(phone_number_id: str, msg_id: str) -> None:
    """Marca el mensaje como leído (doble check azul)."""
    await _send_payload(phone_number_id, {
        "messaging_product": "whatsapp",
        "status":            "read",
        "message_id":        msg_id,
    })


async def _send_payload(phone_number_id: str, payload: dict) -> bool:
    url     = f"{_WA_API_URL}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.wa_access_token}",
        "Content-Type":  "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code not in (200, 201):
                logger.error(f"WhatsApp send error {resp.status_code}: {resp.text}")
                return False
            return True
    except Exception as e:
        logger.error(f"WhatsApp _send_payload error: {e}")
        return False


def _split_message(text: str, max_len: int) -> list[str]:
    """Divide mensajes largos por líneas sin cortar palabras."""
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
