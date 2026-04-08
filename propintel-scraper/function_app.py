"""
Azure Function — HTTP Trigger para el scraper UrbIA.
Permite ejecutarlo manualmente desde el portal de Azure
o desde GitHub Actions.

También se puede configurar un Timer Trigger con CRON:
  "0 0 7 * * *"  →  todos los días a las 07:00 hora de Madrid
"""
import asyncio
import json
import logging

import azure.functions as func
from main import run_ciclo_completo

app = func.FunctionApp()


@app.function_name("ScraperTimer")
@app.timer_trigger(
    schedule="0 0 2 * * *",       # 03:00 Madrid (UTC+2 verano / UTC+1 invierno → 02:00 UTC)
    arg_name="timer",
    run_on_startup=False,
)
async def scraper_timer(timer: func.TimerRequest) -> None:
    """Ejecución automática diaria a las 03:00 Madrid."""
    logging.info("⏰ Scraper Timer Trigger iniciado")
    resumen = await run_ciclo_completo()
    logging.info(f"Ciclo completado: {resumen}")


@app.function_name("ScraperHttp")
@app.route(route="HttpTrigger", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
async def scraper_http(req: func.HttpRequest) -> func.HttpResponse:
    """
    Ejecución manual vía HTTP.
    Body JSON opcional: {"ciudades": ["madrid"], "paginas": 2}
    """
    logging.info("🔁 Scraper HTTP Trigger iniciado")
    try:
        body = req.get_json() if req.get_body() else {}
    except ValueError:
        body = {}

    ciudades  = body.get("ciudades")
    max_pags  = int(body.get("paginas", 2))

    resumen = await run_ciclo_completo(ciudades, max_pags)

    return func.HttpResponse(
        body=json.dumps(resumen, default=str),
        status_code=200,
        mimetype="application/json",
    )
