"""
Orquestador principal del scraper UrbIA.
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
import sys
from datetime import datetime
from loguru import logger

from scrapers.notarial_scraper import run_notarial_scraper
from scrapers.idealista_scraper import run_idealista_scraper
from scrapers.idealista_api_scraper import run_idealista_api_scraper
from scrapers.fotocasa_scraper import run_fotocasa_scraper
from scrapers.ine_bde_scraper import run_ine_bde_scraper
from services.gap_calculator import GapCalculator
from services.email_notificador import EmailNotificador
from services.db_service import DBService
from models.schemas import AlertaConfig
from config.settings import settings


async def run_ciclo_completo(
    ciudades: list[str] | None = None,
    max_paginas: int = 3,
    sin_fotocasa: bool = False,
    sin_idealista: bool = False,
    forzar_playwright: bool = False,   # True = saltar API y usar Playwright directamente
) -> dict:
    inicio = datetime.utcnow()
    logger.info(f"━━━ Inicio ciclo UrbIA · {inicio.strftime('%Y-%m-%d %H:%M UTC')} ━━━")

    resumen = {
        "inicio": inicio.isoformat(),
        "datos_notariales": 0,
        "anuncios_idealista": 0,
        "anuncios_fotocasa": 0,
        "anuncios_total": 0,
        "gaps_calculados": 0,
        "alertas_disparadas": 0,
        "emails_enviados": 0,
        "duplicados_marcados": 0,
        "duplicados_eliminados": 0,
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
            logger.error("Sin datos notariales — abortando ciclo")
            resumen["errores"].append("notarial: sin datos del INE")
            return resumen

        # ── 2. Asking prices — Idealista ────────────────────────────────
        anuncios_idealista: list = []
        idealista_city_avgs: dict[str, float] = {}
        if not sin_idealista:
            # Preferir API oficial si hay credenciales configuradas
            api_key_ok = bool(settings.idealista_api_key and settings.idealista_api_secret)
            if api_key_ok and not forzar_playwright:
                logger.info("🏠 [2/6] Idealista vía API oficial...")
                try:
                    anuncios_idealista, idealista_city_avgs = await run_idealista_api_scraper(ciudades, max(1, max_paginas - 1))
                    resumen["anuncios_idealista"] = len(anuncios_idealista)
                    if anuncios_idealista:
                        db.guardar_anuncios(anuncios_idealista)
                except Exception as e:
                    logger.warning(f"API Idealista falló ({e}) — intentando Playwright como fallback")
                    resumen["errores"].append(f"idealista_api: {e}")
                    anuncios_idealista = []  # fuerza fallback abajo

            # Fallback a Playwright SOLO si la API no está configurada o falló con excepción
            # (lista vacía por quota agotada o ciudad no en CIUDADES_API NO activa el fallback)
            _api_intentada = api_key_ok and not forzar_playwright
            _api_fallo_excepcion = bool(resumen["errores"] and any("idealista_api" in e for e in resumen["errores"]))
            if not _api_intentada or _api_fallo_excepcion:
                logger.info("🏠 [2/6] Scraping Idealista (Playwright)...")
                try:
                    anuncios_idealista = await run_idealista_scraper(ciudades, max_paginas)
                    resumen["anuncios_idealista"] = len(anuncios_idealista)
                    if anuncios_idealista:
                        db.guardar_anuncios(anuncios_idealista)
                except Exception as e:
                    logger.warning(f"Idealista Playwright falló (continuando sin él): {e}")
                    resumen["errores"].append(f"idealista_playwright: {e}")
            elif not anuncios_idealista:
                logger.info("🏠 [2/6] API Idealista devolvió 0 anuncios (quota agotada o ciudad no configurada) — omitiendo Playwright")
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
        gaps = calc.calcular_gaps(anuncios, datos_notariales, idealista_city_avgs or None)
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

        # ── 7. Deduplicación activa ─────────────────────────────────────
        logger.info("🧹 [7/7] Limpiando duplicados en BD...")
        try:
            dedup = db.limpiar_duplicados()
            resumen["duplicados_marcados"]  = dedup["canonical_marcados"]
            resumen["duplicados_eliminados"] = dedup["id_externo_eliminados"]
        except Exception as e:
            logger.warning(f"Deduplicación falló (no crítico): {e}")
            resumen["errores"].append(f"dedup: {e}")

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
        f"Alertas:{resumen['alertas_disparadas']} "
        f"DupMarcados:{resumen['duplicados_marcados']} "
        f"DupEliminados:{resumen['duplicados_eliminados']} ━━━"
    )
    return resumen


def main():
    parser = argparse.ArgumentParser(description="UrbIA Scraper")
    parser.add_argument("--ciudad", nargs="+")
    parser.add_argument("--paginas", type=int, default=3)
    parser.add_argument("--sin-fotocasa", action="store_true", help="Omitir Fotocasa en el ciclo")
    parser.add_argument("--sin-idealista", action="store_true", help="Omitir Idealista en el ciclo")
    parser.add_argument("--solo-api", action="store_true", help="Solo API Idealista → BD (sin ciclo completo)")
    parser.add_argument("--scheduler", action="store_true")
    parser.add_argument("--init-db", action="store_true")
    parser.add_argument("--stats-macro", action="store_true", help="Descargar estadísticas INE/BdE ahora")
    parser.add_argument("--dedup", action="store_true", help="Ejecutar solo limpieza de duplicados en BD")
    args = parser.parse_args()

    if args.init_db:
        from models.db_models import init_db
        init_db()
        return

    if getattr(args, "dedup", False):
        db = DBService()
        resultado = db.limpiar_duplicados()
        print(f"\n✓ Deduplicación completada:")
        print(f"  Duplicados por canonical_key marcados inactivos: {resultado['canonical_marcados']}")
        print(f"  Duplicados por id_externo eliminados:            {resultado['id_externo_eliminados']}")
        return

    if getattr(args, "stats_macro", False):
        async def _run_macro():
            db = DBService()
            datos = await run_ine_bde_scraper()
            guardados = db.guardar_estadisticas_macro(datos)
            print(f"\n✓ Estadísticas macro: {len(datos)} puntos descargados, {guardados} guardados en BD")
        asyncio.run(_run_macro())
        return

    if getattr(args, "solo_api", False):
        async def _run_solo_api():
            db = DBService()
            ciudades = args.ciudad  # None = todas las zonas configuradas
            logger.info(f"[solo-api] Ciudades/grupos: {ciudades or 'todas'}")
            anuncios = await run_idealista_api_scraper(ciudades, args.paginas)
            if anuncios:
                db.guardar_anuncios(anuncios)
            from scrapers.idealista_api_scraper import _quota_remaining
            print(f"\n✓ API Idealista: {len(anuncios)} anuncios obtenidos y guardados en BD")
            print(f"  Quota restante este mes: {_quota_remaining()}")
        asyncio.run(_run_solo_api())
        return

    if args.scheduler:
        from apscheduler.schedulers.blocking import BlockingScheduler
        from config.settings import settings
        scheduler = BlockingScheduler(timezone="Europe/Madrid")
        hora, minuto = settings.scraper_hora_ejecucion.split(":")
        sin_fc = getattr(args, "sin_fotocasa", False)
        # Ciudades activas — ampliar cuando se quiera cubrir más mercados
        ciudades_activas = args.ciudad or ["madrid"]
        scheduler.add_job(
            lambda: asyncio.run(run_ciclo_completo(ciudades_activas, args.paginas, sin_fc)),
            trigger="cron", hour=int(hora), minute=int(minuto),
        )
        # Estadísticas macro INE/BdE — cada lunes a las 03:30
        def _job_macro():
            async def _inner():
                db = DBService()
                datos = await run_ine_bde_scraper()
                db.guardar_estadisticas_macro(datos)
            asyncio.run(_inner())
        scheduler.add_job(_job_macro, trigger="cron", day_of_week="mon", hour=3, minute=30)
        logger.info(f"⏰ Scheduler diario a las {settings.scraper_hora_ejecucion} + macro lunes 03:30")
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
        # Fallar con exit 1 si el ciclo terminó sin ningún dato útil
        sin_datos = resumen["datos_notariales"] == 0 and resumen["anuncios_total"] == 0
        errores_criticos = any(
            e for e in resumen["errores"]
            if not e.startswith(("idealista_playwright:", "fotocasa:", "dedup:"))
        )
        if sin_datos or errores_criticos:
            logger.error(f"Ciclo fallido — sin datos o errores críticos: {resumen['errores']}")
            sys.exit(1)


if __name__ == "__main__":
    main()
