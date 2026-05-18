from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # PropIntel API
    propintel_api_url:  str = "https://propintel-api.azurewebsites.net/api"
    propintel_api_key:  str = ""

    # Gemini
    gemini_api_key:     str = ""
    gemini_model:       str = "gemini-2.0-flash"

    # WhatsApp (Meta Cloud API)
    wa_phone_number_id: str = ""   # el ID del número de teléfono en Meta
    wa_access_token:    str = ""   # token de acceso permanente
    wa_verify_token:    str = "propintel_webhook_2026"  # el que configuras en Meta

    # Telegram
    telegram_bot_token: str = ""

    # Redis (contexto de conversación)
    redis_url:          str = "redis://localhost:6379/0"  # Azure Cache for Redis en prod
    context_ttl_secs:   int = 86400  # 24h

    # Agent
    max_history_turns:  int = 10    # cuántos turnos de historial se mandan a Gemini
    agent_timeout_secs: int = 25    # timeout total de la petición

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
