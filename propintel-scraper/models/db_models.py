"""
Modelos SQLAlchemy — tablas de PostgreSQL para UrbIA.
Ejecutar una vez: python -c "from models.db_models import Base, engine; Base.metadata.create_all(engine)"
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean,
    DateTime, Text, ForeignKey, Index, create_engine
)
from sqlalchemy.orm import DeclarativeBase, relationship
from config.settings import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.db_url,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    echo=False,
)


class DatoNotarialDB(Base):
    """Precios reales del Portal Estadístico del Notariado."""
    __tablename__ = "datos_notariales"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    ciudad          = Column(String(50), nullable=False, index=True)
    municipio       = Column(String(100), nullable=False)
    codigo_postal   = Column(String(10), nullable=True)
    precio_medio_m2 = Column(Float, nullable=False)
    precio_min_m2   = Column(Float, nullable=True)
    precio_max_m2   = Column(Float, nullable=True)
    num_transacciones = Column(Integer, default=0)
    periodo         = Column(String(7), nullable=False)   # "2026-03"
    creado_en       = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_notarial_ciudad_periodo", "ciudad", "periodo"),
    )


class AnuncioDB(Base):
    """Anuncios scrapeados de Idealista / Fotocasa."""
    __tablename__ = "anuncios"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    id_externo      = Column(String(100), unique=True, nullable=False)
    fuente          = Column(String(20), nullable=False)   # idealista|fotocasa
    url             = Column(Text, nullable=False)
    titulo          = Column(Text, nullable=True)
    precio_total    = Column(Integer, nullable=False)
    precio_m2       = Column(Float, nullable=True)
    superficie_m2   = Column(Float, nullable=True)
    habitaciones    = Column(Integer, nullable=True)
    ciudad          = Column(String(50), nullable=False, index=True)
    distrito        = Column(String(100), nullable=True, index=True)
    tipo_inmueble   = Column(String(30), nullable=True)   # Piso, Ático, Estudio, Dúplex, Chalet
    codigo_postal   = Column(String(10), nullable=True)
    lat             = Column(Float, nullable=True)
    lon             = Column(Float, nullable=True)
    foto_principal  = Column(Text, nullable=True)       # URL primera foto
    activo          = Column(Boolean, default=True)
    fecha_scraping  = Column(DateTime, default=datetime.utcnow, index=True)
    canonical_key   = Column(String(200), nullable=True, index=True)

    __table_args__ = (
        Index("ix_anuncio_ciudad_distrito", "ciudad", "distrito"),
    )


class GapAnalisisDB(Base):
    """Gap calculado por zona y periodo — con desglose por fuente."""
    __tablename__ = "gap_analisis"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    ciudad                  = Column(String(50), nullable=False, index=True)
    zona                    = Column(String(100), nullable=False)
    codigo_postal           = Column(String(10), nullable=True)
    # Asking combinado (media ponderada de todas las fuentes disponibles)
    asking_medio_m2         = Column(Float, nullable=False)
    notarial_medio_m2       = Column(Float, nullable=False)
    gap_pct                 = Column(Float, nullable=False)
    num_anuncios            = Column(Integer, default=0)
    num_transacciones       = Column(Integer, default=0)
    # Desglose por portal — NULL si ese portal no tenía datos suficientes
    asking_idealista_m2     = Column(Float, nullable=True)
    asking_fotocasa_m2      = Column(Float, nullable=True)
    gap_idealista_pct       = Column(Float, nullable=True)
    gap_fotocasa_pct        = Column(Float, nullable=True)
    num_anuncios_idealista  = Column(Integer, default=0)
    num_anuncios_fotocasa   = Column(Integer, default=0)
    periodo                 = Column(String(7), nullable=False)
    calculado_en            = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_gap_ciudad_zona_periodo", "ciudad", "zona", "periodo"),
    )


class AlertaDB(Base):
    """Alertas configuradas por los usuarios."""
    __tablename__ = "alertas"

    id                  = Column(String(50), primary_key=True)
    zona                = Column(String(100), nullable=False)
    ciudad              = Column(String(50), nullable=False)
    precio_max_asking   = Column(Float, nullable=False)
    gap_minimo_pct      = Column(Float, nullable=False)
    activa              = Column(Boolean, default=True)
    descripcion         = Column(Text, nullable=True)
    email_destino       = Column(String(200), nullable=False)
    creada_en           = Column(DateTime, default=datetime.utcnow)

    disparos = relationship("DisparoAlertaDB", back_populates="alerta", cascade="all, delete-orphan")


class DisparoAlertaDB(Base):
    """Registro de cada vez que una alerta se ha disparado."""
    __tablename__ = "disparos_alertas"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    alerta_id       = Column(String(50), ForeignKey("alertas.id"), nullable=False)
    anuncio_url     = Column(Text, nullable=False)
    zona            = Column(String(100), nullable=False)
    asking_m2       = Column(Float, nullable=False)
    notarial_m2     = Column(Float, nullable=False)
    gap_pct         = Column(Float, nullable=False)
    email_enviado   = Column(Boolean, default=False)
    leido           = Column(Boolean, default=False)
    creado_en       = Column(DateTime, default=datetime.utcnow, index=True)

    alerta = relationship("AlertaDB", back_populates="disparos")


class MunicipioDB(Base):
    """Referencia de todos los municipios de España (fuente: INE)."""
    __tablename__ = "municipios"

    id_ine          = Column(String(5),   primary_key=True)   # "28079" = Madrid
    nombre          = Column(String(150), nullable=False)
    nombre_norm     = Column(String(150), nullable=False)      # sin tildes, minúsculas
    provincia       = Column(String(100), nullable=True)
    comunidad       = Column(String(100), nullable=True)
    poblacion       = Column(Integer,     nullable=True)       # para ordenar por relevancia
    tiene_datos     = Column(Boolean,     default=False)       # True cuando hay gaps calculados
    lat             = Column(Float,       nullable=True)
    lon             = Column(Float,       nullable=True)
    slug_idealista  = Column(String(200), nullable=True)       # override manual del slug
    slug_fotocasa   = Column(String(200), nullable=True)
    actualizado_en  = Column(DateTime,    default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_municipio_nombre_norm", "nombre_norm"),
        Index("ix_municipio_tiene_datos", "tiene_datos"),
    )


def init_db():
    """Crea todas las tablas si no existen."""
    Base.metadata.create_all(engine)
    print("✓ Tablas creadas en PostgreSQL")


if __name__ == "__main__":
    init_db()
