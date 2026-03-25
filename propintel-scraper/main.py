"""
Orquestador principal del scraper PropIntel.
Ciclo completo diario:
  1. Scraping Portal Notarial  → precios reales por municipio
  2. Scraping Idealista        → asking prices actuales
  3. Scraping Fotocasa         → asking prices (segunda fuente)
  4. Cálculo de gaps           → cruza ambas fuentes
  5. Evaluación de alertas     → criterios por usuario
  6. Envío de emails           → notificaciones HTML
  7. Persistencia PostgreSQL   → histórico para el dashboard

Uso:
  python main.py                               # ejecutar ahora (Idealista + Fotocasa)
  python main.py --ciudad asturias             # solo una ciudad
  python main.py --ciudad asturias --paginas 1 # rápido para pruebas
  python main.py --sin-fotocasa                # solo Idealista
  python main.py --scheduler                   # modo daemon diario
  python main.py --init-db                     # crear tablas en PostgreSQL
"""
import asyncio
import argparse
import random
from datetime import datetime
from loguru import logger

from scrapers.notarial_scraper import run_notarial_scraper
from scrapers.idealista_scraper import run_idealista_scraper
from scrapers.fotocasa_scraper import run_fotocasa_scraper
from services.gap_calculator import GapCalculator
from services.email_notificador import EmailNotificador
from services.db_service import DBService
from models.schemas import AlertaConfig


async def run_ciclo_completo(
    ciudades: list[str] | None = None,
    max_paginas: int = 3,
    sin_fotocasa: bool = False,
    sin_idealista: bool = False,
) -> dict:
    inicio = datetime.utcnow()
    logger.info(f"━━━ Inicio ciclo PropIntel · {inicio.strftime('%Y-%m-%d %H:%M UTC')} ━━━")

    resumen = {
        "inicio": inicio.isoformat(),
        "datos_notariales": 0,
        "anuncios_idealista": 0,
        "anuncios_fotocasa": 0,
        "anuncios_total": 0,
        "gaps_calculados": 0,
        "alertas_disparadas": 0,
        "emails_enviados": 0,
        "errores": [],
    }

    db = DBService()

    try:
        # ── 1. Datos notariales ─────────────────────────────────────────
        logger.info("📋 [1/5] Scraping Portal Notarial...")
        datos_notariales = await run_notarial_scraper()
        resumen["datos_notariales"] = len(datos_notariales)
        if datos_notariales:
            db.guardar_datos_notariales(datos_notariales)

        if not datos_notariales:
            logger.error("Sin datos notariales — abortando")
            return resumen

        # ── 2. Asking prices — Idealista ────────────────────────────────
        anuncios_idealista: list = []
        if not sin_idealista:
            logger.info("🏠 [2/6] Scraping Idealista...")
            try:
                anuncios_idealista = await run_idealista_scraper(ciudades, max_paginas)
                resumen["anuncios_idealista"] = len(anuncios_idealista)
                if anuncios_idealista:
                    db.guardar_anuncios(anuncios_idealista)
            except Exception as e:
                logger.warning(f"Idealista scraping falló (continuando sin él): {e}")
                resumen["errores"].append(f"idealista: {e}")
        else:
            logger.info("🏠 [2/6] Idealista omitido (--sin-idealista)")

        # ── 3. Asking prices — Fotocasa ─────────────────────────────────
        anuncios_fotocasa: list = []
        if not sin_fotocasa:
            logger.info("🏡 [3/6] Scraping Fotocasa...")
            # Pausa entre portales solo si Idealista también corrió
            if not sin_idealista:
                await asyncio.sleep(random.uniform(15, 30))
            try:
                anuncios_fotocasa = await run_fotocasa_scraper(ciudades, max_paginas, db_service=db)
                resumen["anuncios_fotocasa"] = len(anuncios_fotocasa)
            except Exception as e:
                logger.warning(f"Fotocasa scraping falló (continuando sin él): {e}")
                resumen["errores"].append(f"fotocasa: {e}")
        else:
            logger.info("🏡 [3/6] Fotocasa omitido (--sin-fotocasa)")

        # Combinar anuncios de ambas fuentes para el cálculo de gaps
        anuncios = anuncios_idealista + anuncios_fotocasa
        resumen["anuncios_total"] = len(anuncios)

        if not anuncios:
            logger.warning("Sin anuncios de ningún portal — omitiendo gaps y alertas")
            return resumen

        # ── 4. Gaps ─────────────────────────────────────────────────────
        logger.info("📊 [4/6] Calculando gaps...")
        calc = GapCalculator()
        gaps = calc.calcular_gaps(anuncios, datos_notariales)
        resumen["gaps_calculados"] = len(gaps)
        if gaps:
            db.guardar_gaps(gaps)

        # ── 5. Alertas ──────────────────────────────────────────────────
        logger.info("🔔 [5/6] Evaluando alertas...")
        alertas_db = db.get_alertas_activas()
        alertas = [
            AlertaConfig(
                id=a.id,
                zona=a.zona,
                ciudad=a.ciudad,
                precio_max_asking=a.precio_max_asking,
                gap_minimo_pct=a.gap_minimo_pct,
                activa=a.activa,
                descripcion=a.descripcion,
                email_destino=a.email_destino,
            )
            for a in alertas_db
        ]
        disparos = calc.evaluar_alertas(anuncios, datos_notariales, alertas)
        resumen["alertas_disparadas"] = len(disparos)

        # ── 5. Emails ───────────────────────────────────────────────────
        emails_enviados_idx: set[int] = set()
        if disparos:
            logger.info("✉️  [6/6] Enviando notificaciones...")
            notificador = EmailNotificador()
            for i, d in enumerate(disparos):
                ok = await notificador.enviar_disparo(
                    alerta=d["alerta"],
                    anuncio=d["anuncio"],
                    gap_pct=d["gap_pct"],
                    asking_m2=d["asking_m2"],
                    notarial_m2=d["notarial_m2"],
                )
                if ok:
                    emails_enviados_idx.add(i)
            resumen["emails_enviados"] = len(emails_enviados_idx)
        else:
            logger.info("✉️  [6/6] Sin disparos hoy")

        # ── 6. Persistir disparos ───────────────────────────────────────
        if disparos:
            db.guardar_disparos(disparos, emails_enviados_idx)

    except Exception as e:
        logger.exception(f"Error crítico: {e}")
        resumen["errores"].append(str(e))

    fin = datetime.utcnow()
    secs = (fin - inicio).total_seconds()
    logger.info(
        f"━━━ Completado en {secs:.1f}s — "
        f"Notariales:{resumen['datos_notariales']} "
        f"Idealista:{resumen['anuncios_idealista']} "
        f"Fotocasa:{resumen['anuncios_fotocasa']} "
        f"Total:{resumen['anuncios_total']} "
        f"Gaps:{resumen['gaps_calculados']} "
        f"Alertas:{resumen['alertas_disparadas']} ━━━"
    )
    return resumen


def main():
    parser = argparse.ArgumentParser(description="PropIntel Scraper")
    parser.add_argument("--ciudad", nargs="+")
    parser.add_argument("--paginas", type=int, default=3)
    parser.add_argument("--sin-fotocasa", action="store_true", help="Omitir Fotocasa en el ciclo")
    parser.add_argument("--sin-idealista", action="store_true", help="Omitir Idealista en el ciclo")
    parser.add_argument("--scheduler", action="store_true")
    parser.add_argument("--init-db", action="store_true")
    args = parser.parse_args()

    if args.init_db:
        from models.db_models import init_db
        init_db()
        return

    if args.scheduler:
        from apscheduler.schedulers.blocking import BlockingScheduler
        from config.settings import settings
        scheduler = BlockingScheduler(timezone="Europe/Madrid")
        hora, minuto = settings.scraper_hora_ejecucion.split(":")
        sin_fc = getattr(args, "sin_fotocasa", False)
        scheduler.add_job(
            lambda: asyncio.run(run_ciclo_completo(args.ciudad, args.paginas, sin_fc)),
            trigger="cron", hour=int(hora), minute=int(minuto),
        )
        logger.info(f"⏰ Scheduler diario a las {settings.scraper_hora_ejecucion}")
        try:
            scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            logger.info("Scheduler detenido")
    else:
        sin_fc = getattr(args, "sin_fotocasa", False)
        sin_id = getattr(args, "sin_idealista", False)
        resumen = asyncio.run(run_ciclo_completo(args.ciudad, args.paginas, sin_fc, sin_id))
        print("\n─── RESUMEN ───")
        for k, v in resumen.items():
            print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
