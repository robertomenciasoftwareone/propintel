from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class FuentePrecio(str, Enum):
    IDEALISTA  = "idealista"
    FOTOCASA   = "fotocasa"
    NOTARIAL   = "notarial"   # Portal Estadístico del Notariado


class TipoInmueble(str, Enum):
    PISO       = "piso"
    CASA       = "casa"
    ATICO      = "atico"
    ESTUDIO    = "estudio"
    DUPLEX     = "duplex"


# ─── Anuncio de portal (Idealista / Fotocasa) ──────────────────────────────

class AnuncioPortal(BaseModel):
    id_externo:    str
    fuente:        FuentePrecio
    url:           str
    titulo:        str
    precio_total:  int                   # € totales
    precio_m2:     Optional[float]       # €/m² (calculado si no viene)
    superficie_m2: Optional[float]
    habitaciones:  Optional[int]
    planta:        Optional[str]
    ciudad:        str
    distrito:      Optional[str]
    codigo_postal: Optional[str]
    lat:           Optional[float]
    lon:           Optional[float]
    tipo:          TipoInmueble = TipoInmueble.PISO
    fecha_scraping: datetime = Field(default_factory=datetime.utcnow)
    activo:        bool = True
    canonical_key: Optional[str] = None

    def calcular_precio_m2(self) -> Optional[float]:
        if self.precio_m2:
            return self.precio_m2
        if self.precio_total and self.superficie_m2 and self.superficie_m2 > 0:
            return round(self.precio_total / self.superficie_m2, 2)
        return None


# ─── Dato notarial (Portal Estadístico Notariado) ──────────────────────────

class DatoNotarial(BaseModel):
    ciudad:         str
    municipio:      str
    codigo_postal:  Optional[str] = None
    precio_medio_m2: float              # €/m² mediana notarial
    precio_min_m2:  Optional[float] = None     # percentil 25
    precio_max_m2:  Optional[float] = None     # percentil 75
    num_transacciones: int
    periodo:        str                 # "2026-01" formato YYYY-MM
    fecha_scraping: datetime = Field(default_factory=datetime.utcnow)


# ─── Gap calculado ──────────────────────────────────────────────────────────

class GapAnalisis(BaseModel):
    ciudad:                  str
    zona:                    str
    codigo_postal:           Optional[str]
    asking_medio_m2:         float                  # combinado (todas las fuentes)
    notarial_medio_m2:       float
    gap_pct:                 float                  # % = (asking - notarial) / notarial * 100
    num_anuncios:            int
    num_transacciones:       int
    # Desglose por portal
    asking_idealista_m2:     Optional[float] = None
    asking_fotocasa_m2:      Optional[float] = None
    gap_idealista_pct:       Optional[float] = None
    gap_fotocasa_pct:        Optional[float] = None
    num_anuncios_idealista:  int = 0
    num_anuncios_fotocasa:   int = 0
    periodo:                 str
    calculado_en:            datetime = Field(default_factory=datetime.utcnow)

    @classmethod
    def calcular(
        cls,
        ciudad: str,
        zona: str,
        asking: float,
        notarial: float,
        num_anuncios: int,
        num_transacciones: int,
        periodo: str,
        codigo_postal: Optional[str] = None,
        asking_idealista: Optional[float] = None,
        asking_fotocasa: Optional[float] = None,
        num_anuncios_idealista: int = 0,
        num_anuncios_fotocasa: int = 0,
    ) -> "GapAnalisis":
        def _gap(ask: Optional[float]) -> Optional[float]:
            if ask is None or notarial <= 0:
                return None
            return round((ask - notarial) / notarial * 100, 2)

        gap = ((asking - notarial) / notarial * 100) if notarial > 0 else 0.0
        return cls(
            ciudad=ciudad,
            zona=zona,
            codigo_postal=codigo_postal,
            asking_medio_m2=round(asking, 2),
            notarial_medio_m2=round(notarial, 2),
            gap_pct=round(gap, 2),
            num_anuncios=num_anuncios,
            num_transacciones=num_transacciones,
            asking_idealista_m2=round(asking_idealista, 2) if asking_idealista else None,
            asking_fotocasa_m2=round(asking_fotocasa, 2) if asking_fotocasa else None,
            gap_idealista_pct=_gap(asking_idealista),
            gap_fotocasa_pct=_gap(asking_fotocasa),
            num_anuncios_idealista=num_anuncios_idealista,
            num_anuncios_fotocasa=num_anuncios_fotocasa,
            periodo=periodo,
        )


# ─── Alerta (espejo del modelo Angular) ────────────────────────────────────

class AlertaConfig(BaseModel):
    id:               str
    zona:             str
    ciudad:           str
    precio_max_asking: float
    gap_minimo_pct:   float
    activa:           bool
    descripcion:      Optional[str]
    email_destino:    str
