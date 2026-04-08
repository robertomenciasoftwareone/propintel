from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # Base de datos
    db_host:     str = "localhost"
    db_port:     int = 5432
    db_name:     str = "propintel"
    db_user:     str = "propintel_user"
    db_password: str = ""

    # Azure Blob (snapshots raw)
    azure_storage_connection_string: Optional[str] = None
    azure_container_name: str = "urbia-snapshots"

    # Scraping
    scraper_delay_seconds:   float = 2.5   # entre peticiones
    scraper_max_retries:     int   = 3
    scraper_timeout_seconds: int   = 30
    headless_browser:        bool  = True
    scraper_min_delay_seconds: float = 4.0
    scraper_max_delay_seconds: float = 8.0
    scraper_zone_pause_min_seconds: float = 20.0
    scraper_zone_pause_max_seconds: float = 45.0
    scraper_block_cooldown_seconds: int = 600
    scraper_consecutive_block_limit: int = 2
    scraper_cache_enabled: bool = True
    scraper_cache_ttl_seconds: int = 900
    scraper_user_agent: str = "UrbIABot/1.0 (+contacto@urbia.es)"

    # Idealista API oficial (OAuth2 client credentials)
    idealista_api_key:    str = ""
    idealista_api_secret: str = ""
    # Alertas — email
    smtp_host:     str = "smtp.gmail.com"
    smtp_port:     int = 587
    smtp_user:     str = ""
    smtp_password: str = ""
    alert_from:    str = "alertas@urbia.es"

    # Scheduler
    scraper_hora_ejecucion: str = "03:00"  # hora local cada día

    @property
    def db_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
