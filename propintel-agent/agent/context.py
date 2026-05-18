"""
Gestión del contexto de conversación en Redis.
Clave: chat:{canal}:{user_id}  →  lista de mensajes (últimos N turnos)
TTL: 24h (se renueva en cada mensaje)
"""
import json
from typing import Optional
import redis.asyncio as aioredis
from loguru import logger
from config.settings import settings

_pool: Optional[aioredis.Redis] = None


def _get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
    return _pool


async def get_history(canal: str, user_id: str) -> list[dict]:
    """Devuelve el historial de conversación como lista de dicts {role, parts}."""
    key = f"chat:{canal}:{user_id}"
    try:
        r = _get_redis()
        raw = await r.get(key)
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.warning(f"Redis get_history error ({key}): {e}")
    return []


async def save_history(canal: str, user_id: str, history: list[dict]) -> None:
    """Guarda historial y renueva TTL."""
    key = f"chat:{canal}:{user_id}"
    # Truncar a los últimos N turnos para no inflar el contexto
    max_turns = settings.max_history_turns * 2  # user + assistant por turno
    trimmed = history[-max_turns:] if len(history) > max_turns else history
    try:
        r = _get_redis()
        await r.set(key, json.dumps(trimmed), ex=settings.context_ttl_secs)
    except Exception as e:
        logger.warning(f"Redis save_history error ({key}): {e}")


async def clear_history(canal: str, user_id: str) -> None:
    """Borra el historial (comando /reset)."""
    key = f"chat:{canal}:{user_id}"
    try:
        r = _get_redis()
        await r.delete(key)
    except Exception as e:
        logger.warning(f"Redis clear_history error ({key}): {e}")
