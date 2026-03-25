"""
Servicio de base de datos — toda la capa de persistencia de PropIntel.
Usa SQLAlchemy con sesiones síncronas (suficiente para el job diario).
"""
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Optional
from loguru import logger

from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import select, and_, desc, func

from models.db_models import (
    engine, Base,
    DatoNotarialDB, AnuncioDB, GapAnalisisDB, AlertaDB, DisparoAlertaDB,
)
from models.schemas import (
    DatoNotarial, AnuncioPortal, GapAnalisis, AlertaConfig,
)


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


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
        with get_session() as session:
            ids_existentes = set(
                session.scalars(
                    select(AnuncioDB.id_externo).where(
                        AnuncioDB.id_externo.in_([a.id_externo for a in anuncios])
                    )
                ).all()
            )
            for anuncio in anuncios:
                if anuncio.id_externo in ids_existentes:
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
