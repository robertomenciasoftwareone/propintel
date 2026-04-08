"""
Servicio de base de datos — toda la capa de persistencia de UrbIA.
Usa SQLAlchemy con sesiones síncronas (suficiente para el job diario).
"""
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Optional
import re
import unicodedata
from loguru import logger

from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import select, and_, desc, func

from models.db_models import (
    engine, Base,
    DatoNotarialDB, AnuncioDB, GapAnalisisDB, AlertaDB, DisparoAlertaDB, EstadisticaMacroDB,
)
from models.schemas import (
    DatoNotarial, AnuncioPortal, GapAnalisis, AlertaConfig, EstadisticaMacro,
)


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    return text


def _build_canonical_key(anuncio: AnuncioPortal) -> str:
    cp_digits = ""
    if anuncio.codigo_postal:
        cp_digits = re.sub(r"\D", "", anuncio.codigo_postal)[:5]

    ciudad = _normalize_text(anuncio.ciudad)
    distrito = _normalize_text(anuncio.distrito)
    m2_bin = int(round((anuncio.superficie_m2 or 0) / 5.0) * 5)
    hab = anuncio.habitaciones or 0
    precio_k = int(round(anuncio.precio_total / 5000.0))
    geo = ""
    if anuncio.lat is not None and anuncio.lon is not None:
        geo = f"{round(anuncio.lat, 3)}:{round(anuncio.lon, 3)}"

    if cp_digits:
        return f"cp:{cp_digits}|m2:{m2_bin}|h:{hab}|p:{precio_k}|g:{geo}"
    return f"c:{ciudad}|d:{distrito}|m2:{m2_bin}|h:{hab}|p:{precio_k}|g:{geo}"


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


class DBService:

    # ── DATOS NOTARIALES ────────────────────────────────────────────────────

    def guardar_datos_notariales(self, datos: list[DatoNotarial]) -> int:
        """Upsert por ciudad+periodo. Devuelve nº de registros guardados."""
        nuevos = 0
        actualizados = 0
        with get_session() as session:
            for dato in datos:
                existente = session.scalar(
                    select(DatoNotarialDB).where(
                        and_(
                            DatoNotarialDB.ciudad == dato.ciudad,
                            DatoNotarialDB.municipio == dato.municipio,
                            DatoNotarialDB.periodo == dato.periodo,
                        )
                    )
                )
                if existente:
                    existente.precio_medio_m2  = dato.precio_medio_m2
                    existente.num_transacciones = dato.num_transacciones
                    actualizados += 1
                else:
                    session.add(DatoNotarialDB(
                        ciudad=dato.ciudad,
                        municipio=dato.municipio,
                        codigo_postal=dato.codigo_postal,
                        precio_medio_m2=dato.precio_medio_m2,
                        precio_min_m2=dato.precio_min_m2,
                        precio_max_m2=dato.precio_max_m2,
                        num_transacciones=dato.num_transacciones,
                        periodo=dato.periodo,
                    ))
                    nuevos += 1
        logger.info(f"DB: {nuevos} nuevos + {actualizados} actualizados = {nuevos + actualizados} datos notariales")
        return nuevos + actualizados

    def get_notarial_ultimo_periodo(
        self, ciudad: Optional[str] = None
    ) -> list[DatoNotarialDB]:
        """Devuelve los datos notariales del periodo más reciente."""
        with get_session() as session:
            # Subquery: periodo máximo por ciudad
            subq = select(
                DatoNotarialDB.ciudad,
                func.max(DatoNotarialDB.periodo).label("max_periodo"),
            ).group_by(DatoNotarialDB.ciudad).subquery()

            q = (
                select(DatoNotarialDB)
                .join(subq, and_(
                    DatoNotarialDB.ciudad == subq.c.ciudad,
                    DatoNotarialDB.periodo == subq.c.max_periodo,
                ))
            )
            if ciudad:
                q = q.where(DatoNotarialDB.ciudad == ciudad)

            return list(session.scalars(q).all())

    # ── ANUNCIOS ────────────────────────────────────────────────────────────

    def guardar_anuncios(self, anuncios: list[AnuncioPortal]) -> int:
        """Insert de anuncios nuevos, skip si ya existe el id_externo."""
        nuevos = 0
        # Deduplicar el batch por id_externo y por clave canónica inter-portal.
        seen = {}
        seen_canonical = set()
        for a in anuncios:
            if not a.canonical_key:
                a.canonical_key = _build_canonical_key(a)
            if a.canonical_key in seen_canonical:
                continue
            seen[a.id_externo] = a
            seen_canonical.add(a.canonical_key)
        anuncios = list(seen.values())

        with get_session() as session:
            canonical_keys = [a.canonical_key for a in anuncios if a.canonical_key]
            ids_existentes = set(
                session.scalars(
                    select(AnuncioDB.id_externo).where(
                        AnuncioDB.id_externo.in_([a.id_externo for a in anuncios])
                    )
                ).all()
            )
            canonical_existentes = set()
            if canonical_keys:
                canonical_existentes = set(
                    session.scalars(
                        select(AnuncioDB.canonical_key).where(
                            AnuncioDB.canonical_key.in_(canonical_keys)
                        )
                    ).all()
                )
            for anuncio in anuncios:
                if anuncio.id_externo in ids_existentes:
                    continue
                if anuncio.canonical_key and anuncio.canonical_key in canonical_existentes:
                    continue
                precio_m2 = anuncio.calcular_precio_m2()
                session.add(AnuncioDB(
                    id_externo=anuncio.id_externo,
                    fuente=anuncio.fuente.value,
                    url=anuncio.url,
                    titulo=anuncio.titulo,
                    precio_total=anuncio.precio_total,
                    precio_m2=precio_m2,
                    superficie_m2=anuncio.superficie_m2,
                    habitaciones=anuncio.habitaciones,
                    ciudad=anuncio.ciudad,
                    distrito=anuncio.distrito,
                    tipo_inmueble=anuncio.tipo.value.capitalize() if anuncio.tipo else None,
                    codigo_postal=anuncio.codigo_postal,
                    lat=anuncio.lat,
                    lon=anuncio.lon,
                    activo=anuncio.activo,
                    fecha_scraping=anuncio.fecha_scraping,
                    canonical_key=anuncio.canonical_key,
                ))
                nuevos += 1
        logger.info(f"DB: {nuevos}/{len(anuncios)} anuncios guardados (resto ya existían)")
        return nuevos

    def get_anuncios_recientes(
        self,
        ciudad: Optional[str] = None,
        distrito: Optional[str] = None,
        dias: int = 7,
    ) -> list[AnuncioDB]:
        desde = datetime.utcnow() - timedelta(days=dias)
        with get_session() as session:
            q = select(AnuncioDB).where(
                and_(
                    AnuncioDB.fecha_scraping >= desde,
                    AnuncioDB.activo == True,
                )
            ).order_by(desc(AnuncioDB.fecha_scraping)).limit(500)
            if ciudad:
                q = q.where(AnuncioDB.ciudad == ciudad)
            if distrito:
                q = q.where(AnuncioDB.distrito == distrito)
            return list(session.scalars(q).all())

    # ── GAP ANÁLISIS ────────────────────────────────────────────────────────

    def guardar_gaps(self, gaps: list[GapAnalisis]) -> int:
        guardados = 0
        with get_session() as session:
            for gap in gaps:
                existente = session.scalar(
                    select(GapAnalisisDB).where(
                        and_(
                            GapAnalisisDB.ciudad == gap.ciudad,
                            GapAnalisisDB.zona == gap.zona,
                            GapAnalisisDB.periodo == gap.periodo,
                        )
                    )
                )
                if existente:
                    existente.asking_medio_m2        = gap.asking_medio_m2
                    existente.notarial_medio_m2      = gap.notarial_medio_m2
                    existente.gap_pct                = gap.gap_pct
                    existente.num_anuncios           = gap.num_anuncios
                    existente.asking_idealista_m2    = gap.asking_idealista_m2
                    existente.asking_fotocasa_m2     = gap.asking_fotocasa_m2
                    existente.gap_idealista_pct      = gap.gap_idealista_pct
                    existente.gap_fotocasa_pct       = gap.gap_fotocasa_pct
                    existente.num_anuncios_idealista = gap.num_anuncios_idealista
                    existente.num_anuncios_fotocasa  = gap.num_anuncios_fotocasa
                else:
                    session.add(GapAnalisisDB(
                        ciudad=gap.ciudad,
                        zona=gap.zona,
                        codigo_postal=gap.codigo_postal,
                        asking_medio_m2=gap.asking_medio_m2,
                        notarial_medio_m2=gap.notarial_medio_m2,
                        gap_pct=gap.gap_pct,
                        num_anuncios=gap.num_anuncios,
                        num_transacciones=gap.num_transacciones,
                        asking_idealista_m2=gap.asking_idealista_m2,
                        asking_fotocasa_m2=gap.asking_fotocasa_m2,
                        gap_idealista_pct=gap.gap_idealista_pct,
                        gap_fotocasa_pct=gap.gap_fotocasa_pct,
                        num_anuncios_idealista=gap.num_anuncios_idealista,
                        num_anuncios_fotocasa=gap.num_anuncios_fotocasa,
                        periodo=gap.periodo,
                    ))
                    guardados += 1
        logger.info(f"DB: {guardados} gaps guardados")
        return guardados

    def get_gaps_historico(
        self,
        ciudad: str,
        zona: Optional[str] = None,
        meses: int = 12,
    ) -> list[GapAnalisisDB]:
        """Histórico de gaps de los últimos N meses para el gráfico de evolución."""
        from dateutil.relativedelta import relativedelta
        desde_periodo = (
            datetime.utcnow() - relativedelta(months=meses)
        ).strftime("%Y-%m")

        with get_session() as session:
            q = (
                select(GapAnalisisDB)
                .where(
                    and_(
                        GapAnalisisDB.ciudad == ciudad,
                        GapAnalisisDB.periodo >= desde_periodo,
                    )
                )
                .order_by(GapAnalisisDB.periodo)
            )
            if zona:
                q = q.where(GapAnalisisDB.zona == zona)
            return list(session.scalars(q).all())

    def get_gaps_ultimo_periodo(self, ciudad: str) -> list[GapAnalisisDB]:
        """Gap actual por zona para el dashboard."""
        with get_session() as session:
            subq = (
                select(func.max(GapAnalisisDB.periodo))
                .where(GapAnalisisDB.ciudad == ciudad)
                .scalar_subquery()
            )
            return list(
                session.scalars(
                    select(GapAnalisisDB).where(
                        and_(
                            GapAnalisisDB.ciudad == ciudad,
                            GapAnalisisDB.periodo == subq,
                        )
                    ).order_by(desc(GapAnalisisDB.gap_pct))
                ).all()
            )

    # ── ESTADÍSTICAS MACRO ───────────────────────────────────────────────────

    def guardar_estadisticas_macro(self, estadisticas: list[EstadisticaMacro]) -> int:
        """
        Upsert de estadísticas macro en estadisticas_macro.
        Actualiza 'valor' y 'variacion_pct' si el período ya existe.
        Returns: número de registros insertados/actualizados.
        """
        if not estadisticas:
            return 0

        upserted = 0
        with get_session() as session:
            for est in estadisticas:
                existing = session.scalars(
                    select(EstadisticaMacroDB).where(
                        EstadisticaMacroDB.fuente     == est.fuente,
                        EstadisticaMacroDB.indicador  == est.indicador,
                        EstadisticaMacroDB.periodo    == est.periodo,
                    )
                ).first()

                if existing:
                    existing.valor         = est.valor
                    existing.variacion_pct = est.variacion_pct
                    existing.calculado_en  = datetime.utcnow()
                else:
                    session.add(EstadisticaMacroDB(
                        fuente        = est.fuente,
                        indicador     = est.indicador,
                        descripcion   = est.descripcion,
                        periodo       = est.periodo,
                        anyo          = est.anyo,
                        valor         = est.valor,
                        unidad        = est.unidad,
                        variacion_pct = est.variacion_pct,
                    ))
                upserted += 1
            session.commit()

        logger.info(f"[DB] estadisticas_macro: {upserted} registros guardados")
        return upserted

    # ── ALERTAS ─────────────────────────────────────────────────────────────

    def get_alertas_activas(self) -> list[AlertaDB]:
        with get_session() as session:
            alertas = list(
                session.scalars(
                    select(AlertaDB).where(AlertaDB.activa == True)
                ).all()
            )
            # Eagerly load all attributes before session closes
            for a in alertas:
                session.refresh(a)
            # Expunge from session so they can be used outside
            for a in alertas:
                session.expunge(a)
            return alertas

    def guardar_disparos(self, disparos: list[dict], emails_ok: set[int]) -> int:
        """Persiste los disparos de alertas con flag de email enviado."""
        guardados = 0
        with get_session() as session:
            for i, d in enumerate(disparos):
                session.add(DisparoAlertaDB(
                    alerta_id=d["alerta"].id,
                    anuncio_url=d["anuncio"].url,
                    zona=d["alerta"].zona,
                    asking_m2=d["asking_m2"],
                    notarial_m2=d["notarial_m2"],
                    gap_pct=d["gap_pct"],
                    email_enviado=(i in emails_ok),
                ))
                guardados += 1
        return guardados

    # ── DEDUPLICACIÓN ACTIVA ────────────────────────────────────────────────

    def limpiar_duplicados(self) -> dict:
        """
        Elimina anuncios duplicados que ya están en la BD.

        Estrategia en dos pasadas:
          1. Duplicados por canonical_key: si hay varios anuncios con la misma
             clave canónica, conserva el más reciente y marca los demás como
             inactivos (activo=False).
          2. Duplicados por (fuente, id_externo): si por algún fallo se colaron
             dos filas con el mismo id_externo en la misma fuente, elimina las
             más antiguas dejando solo una.

        Returns: resumen con conteos de duplicados encontrados y marcados.
        """
        resumen = {"canonical_marcados": 0, "id_externo_eliminados": 0}

        with get_session() as session:
            # ── Pasada 1: duplicados por canonical_key ──────────────────────
            # Busca canonical_keys que aparecen en más de un anuncio activo
            from sqlalchemy import text
            duplicados_ck = session.execute(
                text("""
                    SELECT canonical_key, COUNT(*) as cnt
                    FROM anuncios
                    WHERE canonical_key IS NOT NULL
                      AND activo = TRUE
                    GROUP BY canonical_key
                    HAVING COUNT(*) > 1
                    ORDER BY cnt DESC
                """)
            ).fetchall()

            for row in duplicados_ck:
                ck = row[0]
                # Obtener todos los anuncios con esa clave, ordenados por fecha desc
                dupes = list(
                    session.scalars(
                        select(AnuncioDB)
                        .where(
                            and_(
                                AnuncioDB.canonical_key == ck,
                                AnuncioDB.activo == True,
                            )
                        )
                        .order_by(desc(AnuncioDB.fecha_scraping))
                    ).all()
                )
                # El primero (más reciente) se conserva; el resto se marca inactivo
                for anuncio in dupes[1:]:
                    anuncio.activo = False
                    resumen["canonical_marcados"] += 1

            logger.info(
                f"[Dedup] Pasada 1 — {len(duplicados_ck)} canonical_keys duplicadas, "
                f"{resumen['canonical_marcados']} anuncios marcados inactivos"
            )

            # ── Pasada 2: duplicados por id_externo (mismo portal) ──────────
            # Esto no debería ocurrir por la restricción UNIQUE, pero por si acaso
            # hay datos cargados antes de que existiera la constraint
            dupes_id = session.execute(
                text("""
                    SELECT id_externo, MIN(id) as keep_id, COUNT(*) as cnt
                    FROM anuncios
                    GROUP BY id_externo
                    HAVING COUNT(*) > 1
                """)
            ).fetchall()

            ids_a_eliminar = []
            for row in dupes_id:
                id_externo = row[0]
                keep_id = row[1]
                # Obtener todos los ids con ese id_externo excepto el que conservamos
                extra_ids = list(
                    session.scalars(
                        select(AnuncioDB.id).where(
                            and_(
                                AnuncioDB.id_externo == id_externo,
                                AnuncioDB.id != keep_id,
                            )
                        )
                    ).all()
                )
                ids_a_eliminar.extend(extra_ids)

            if ids_a_eliminar:
                from sqlalchemy import delete
                session.execute(
                    delete(AnuncioDB).where(AnuncioDB.id.in_(ids_a_eliminar))
                )
                resumen["id_externo_eliminados"] = len(ids_a_eliminar)

            logger.info(
                f"[Dedup] Pasada 2 — {len(dupes_id)} id_externo duplicados, "
                f"{resumen['id_externo_eliminados']} filas eliminadas"
            )

        logger.info(
            f"[Dedup] Limpieza completada: "
            f"{resumen['canonical_marcados']} marcados inactivos, "
            f"{resumen['id_externo_eliminados']} eliminados"
        )
        return resumen

    def get_disparos_recientes(
        self,
        alerta_id: Optional[str] = None,
        dias: int = 30,
    ) -> list[DisparoAlertaDB]:
        desde = datetime.utcnow() - timedelta(days=dias)
        with get_session() as session:
            q = (
                select(DisparoAlertaDB)
                .where(DisparoAlertaDB.creado_en >= desde)
                .order_by(desc(DisparoAlertaDB.creado_en))
            )
            if alerta_id:
                q = q.where(DisparoAlertaDB.alerta_id == alerta_id)
            return list(session.scalars(q).all())
