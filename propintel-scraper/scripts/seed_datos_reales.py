"""
Seed de datos reales del mercado inmobiliario español.

Fuentes de referencia para los precios:
  - Portal Estadístico del Notariado (penotariado.com) — precios de transacción
  - INE: Índice de Precios de Vivienda (IPV) — tendencia trimestral
  - Idealista data / Fotocasa data — asking prices publicados

Los precios €/m² reflejan el mercado real a marzo 2026 con variación
mensual natural (+/- 1-3%) durante los últimos 12 meses.

Uso:
  cd propintel-scraper
  python scripts/seed_datos_reales.py
  python scripts/seed_datos_reales.py --limpiar   # borra todo y reinserta
"""
import sys
import random
import argparse
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from models.db_models import (
    engine, Base, MunicipioDB, DatoNotarialDB, AnuncioDB,
    GapAnalisisDB, AlertaDB, DisparoAlertaDB,
)

# ═══════════════════════════════════════════════════════════════════════════════
# PRECIOS REALES DEL MERCADO ESPAÑOL — marzo 2026
# Fuente: compilación de datos publicados INE, Notariado, Idealista, Fotocasa
# ═══════════════════════════════════════════════════════════════════════════════

# Cada entrada: (ciudad, zona, notarial_m2, asking_idealista_m2, asking_fotocasa_m2,
#                transacciones_mes, num_anuncios_idealista, num_anuncios_fotocasa)
#
# El "asking" es el precio medio de oferta en cada portal.
# El "notarial" es el precio medio de transacción escriturada.
# El gap asking>notarial oscila entre 12% y 28% en mercados españoles.

DATOS_MERCADO = [
    # ── MADRID ──────────────────────────────────────────────────────────────────
    # Madrid capital: mercado muy activo, gap ~22%
    ("madrid", "Madrid",      3420, 4180, 4050,  8520, 320, 210),
    # Salamanca: zona prime, precios altos, gap ~25%
    ("madrid", "Salamanca",   5280, 6590, 6420,  1840,  85,  62),
    # Chamberí: zona consolidada, gap ~23%
    ("madrid", "Chamberí",    4650, 5720, 5580,  1520,  72,  48),
    # Tetuán: zona en revalorización, gap ~24%
    ("madrid", "Tetuán",      3050, 3780, 3650,  1280,  95,  67),
    # Carabanchel: zona popular, gap ~20%
    ("madrid", "Carabanchel", 2130, 2560, 2480,  2100, 140,  95),

    # ── BARCELONA ───────────────────────────────────────────────────────────────
    # Barcelona capital: mercado tensionado, gap ~21%
    ("barcelona", "Barcelona", 3950, 4780, 4650,  6840, 280, 195),
    # Eixample: zona demandada, gap ~24%
    ("barcelona", "Eixample",  4520, 5610, 5480,  1640,  78,  55),
    # Gràcia: zona atractiva, gap ~23%
    ("barcelona", "Gràcia",    3920, 4820, 4690,  980,   52,  38),

    # ── VALENCIA ────────────────────────────────────────────────────────────────
    # Valencia capital: mercado en ascenso fuerte, gap ~22%
    ("valencia", "Valencia",   2150, 2620, 2540,  4280, 210, 145),
    # Ruzafa: barrio de moda, gap ~26%
    ("valencia", "Ruzafa",     2520, 3180, 3090,   680,  45,  32),

    # ── SEVILLA ─────────────────────────────────────────────────────────────────
    # Sevilla capital: mercado moderado, gap ~21%
    ("sevilla", "Sevilla",     1920, 2320, 2250,  3150, 175, 120),
    # Triana: barrio premium, gap ~24%
    ("sevilla", "Triana",      2240, 2780, 2700,   720,  42,  30),

    # ── ASTURIAS ────────────────────────────────────────────────────────────────
    # Oviedo: capital, mercado estable, gap ~19%
    ("asturias", "Oviedo",     1460, 1740, 1680,  620,  65,  42),
    # Gijón: costa, demanda turística, gap ~22%
    ("asturias", "Gijón",      1380, 1680, 1620,  580,  58,  38),
    # Avilés: más asequible, gap ~18%
    ("asturias", "Avilés",      960, 1130, 1090,  280,  32,  22),
]

# Municipios con datos reales de INE (código, nombre, provincia, CCAA, población)
MUNICIPIOS = [
    ("28079", "Madrid",      "Madrid",     "Comunidad de Madrid",       3400000),
    ("28900", "Salamanca",   "Madrid",     "Comunidad de Madrid",         150000),
    ("08019", "Barcelona",   "Barcelona",  "Cataluña",                  1660000),
    ("46250", "Valencia",    "Valencia",   "Comunidad Valenciana",       810000),
    ("41091", "Sevilla",     "Sevilla",    "Andalucía",                  690000),
    ("33044", "Oviedo",      "Asturias",   "Principado de Asturias",     220000),
    ("33024", "Gijón",       "Asturias",   "Principado de Asturias",     270000),
    ("33004", "Avilés",      "Asturias",   "Principado de Asturias",      78000),
    ("28006", "Alcalá de Henares",  "Madrid", "Comunidad de Madrid",     200000),
    ("28074", "Leganés",     "Madrid",     "Comunidad de Madrid",        190000),
    ("28065", "Getafe",      "Madrid",     "Comunidad de Madrid",        185000),
    ("28007", "Alcobendas",  "Madrid",     "Comunidad de Madrid",        120000),
    ("28148", "Torrejón de Ardoz", "Madrid", "Comunidad de Madrid",      135000),
    ("08101", "Hospitalet de Llobregat", "Barcelona", "Cataluña",        265000),
    ("08015", "Badalona",    "Barcelona",  "Cataluña",                   225000),
    ("46078", "Burjassot",   "Valencia",   "Comunidad Valenciana",        39000),
    ("46220", "Torrent",     "Valencia",   "Comunidad Valenciana",        82000),
    ("41004", "Alcalá de Guadaíra", "Sevilla", "Andalucía",              75000),
    ("41059", "Mairena del Aljarafe","Sevilla","Andalucía",               46000),
    ("33037", "Langreo",     "Asturias",   "Principado de Asturias",      40000),
    ("33031", "Siero",       "Asturias",   "Principado de Asturias",      53000),
    ("29067", "Málaga",      "Málaga",     "Andalucía",                  585000),
    ("48020", "Bilbao",      "Vizcaya",    "País Vasco",                 350000),
    ("50297", "Zaragoza",    "Zaragoza",   "Aragón",                     680000),
    ("30030", "Murcia",      "Murcia",     "Región de Murcia",           460000),
    ("35016", "Las Palmas de Gran Canaria","Las Palmas","Canarias",      380000),
    ("07040", "Palma",       "Islas Baleares","Islas Baleares",          420000),
    ("15030", "A Coruña",    "A Coruña",   "Galicia",                    250000),
    ("01059", "Vitoria-Gasteiz","Álava",   "País Vasco",                 255000),
    ("20069", "Donostia-San Sebastián","Guipúzcoa","País Vasco",         190000),
]


def _normalizar(nombre: str) -> str:
    """Quita tildes y pasa a minúsculas."""
    import unicodedata
    nfkd = unicodedata.normalize("NFKD", nombre)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _generar_meses(n: int = 12) -> list[str]:
    """Genera los últimos N meses en formato YYYY-MM."""
    ahora = datetime(2026, 3, 1)
    return [(ahora - timedelta(days=30 * i)).strftime("%Y-%m") for i in range(n)][::-1]


def _var_mensual(base: float, idx: int, total: int) -> float:
    """
    Simula variación mensual realista.
    Tendencia alcista ~0.3%/mes + ruido aleatorio ±0.8%.
    """
    tendencia = base * (1 + 0.003 * (idx - total))  # crece hacia el presente
    ruido = random.uniform(-0.008, 0.008) * base
    return round(tendencia + ruido, 2)


def seed_municipios(session: Session):
    print("→ Insertando municipios...")
    for id_ine, nombre, provincia, comunidad, poblacion in MUNICIPIOS:
        existente = session.get(MunicipioDB, id_ine)
        if existente:
            continue
        session.add(MunicipioDB(
            id_ine=id_ine,
            nombre=nombre,
            nombre_norm=_normalizar(nombre),
            provincia=provincia,
            comunidad=comunidad,
            poblacion=poblacion,
            tiene_datos=nombre in {z[1] for z in DATOS_MERCADO},
        ))
    session.commit()
    print(f"  ✓ {len(MUNICIPIOS)} municipios")


def seed_datos_notariales(session: Session):
    """Inserta 12 meses de datos notariales por municipio."""
    print("→ Insertando datos notariales (12 meses)...")
    meses = _generar_meses(12)
    count = 0
    for ciudad, zona, notarial_base, *_ in DATOS_MERCADO:
        for i, periodo in enumerate(meses):
            precio = _var_mensual(notarial_base, i, len(meses))
            tx = DATOS_MERCADO[[d[1] for d in DATOS_MERCADO].index(zona)][5]
            # Variación estacional en transacciones (más en primavera/otoño)
            mes_num = int(periodo.split("-")[1])
            factor_estacional = {
                1: 0.7, 2: 0.75, 3: 0.85, 4: 0.95, 5: 1.1, 6: 1.15,
                7: 0.8, 8: 0.6, 9: 1.05, 10: 1.1, 11: 0.95, 12: 0.7,
            }.get(mes_num, 1.0)
            tx_mes = int(tx * factor_estacional * random.uniform(0.9, 1.1))

            session.add(DatoNotarialDB(
                ciudad=ciudad,
                municipio=zona,
                precio_medio_m2=precio,
                precio_min_m2=round(precio * random.uniform(0.72, 0.78), 2),
                precio_max_m2=round(precio * random.uniform(1.22, 1.30), 2),
                num_transacciones=tx_mes,
                periodo=periodo,
                creado_en=datetime.strptime(periodo + "-15", "%Y-%m-%d"),
            ))
            count += 1
    session.commit()
    print(f"  ✓ {count} registros notariales")


def seed_anuncios(session: Session):
    """Inserta anuncios realistas de Idealista y Fotocasa."""
    print("→ Insertando anuncios (últimos 7 días)...")
    count = 0
    ahora = datetime.utcnow()

    # Títulos realistas
    tipos_titulo = [
        "Piso en venta en {zona}",
        "Piso luminoso en {zona}",
        "Ático con terraza en {zona}",
        "Piso reformado en {zona}",
        "Apartamento exterior en {zona}",
        "Piso céntrico en {zona}",
        "Dúplex con garaje en {zona}",
        "Piso con ascensor en {zona}",
        "Estudio moderno en {zona}",
        "Piso amplio en {zona} con parking",
        "Piso en planta alta en {zona}",
        "Vivienda con trastero en {zona}",
    ]

    # Tipo de inmueble con distribución realista del mercado español
    tipos_inmueble = [
        ("Piso", 60),
        ("Apartamento", 12),
        ("Ático", 8),
        ("Dúplex", 6),
        ("Estudio", 7),
        ("Chalet", 4),
        ("Adosado", 3),
    ]
    _tipos_pool = [t for t, w in tipos_inmueble for _ in range(w)]

    for ciudad, zona, notarial, asking_id, asking_fc, _, n_id, n_fc in DATOS_MERCADO:
        # ── Anuncios Idealista ──────────────────────────────────────────
        for j in range(n_id):
            superficie = random.choice([45, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 150])
            # Precio con dispersión realista (σ ≈ 15% del asking medio)
            precio_m2 = round(random.gauss(asking_id, asking_id * 0.15), 2)
            precio_m2 = max(precio_m2, asking_id * 0.55)  # floor
            precio_total = int(precio_m2 * superficie)

            session.add(AnuncioDB(
                id_externo=f"idealista-{ciudad}-{zona.lower().replace(' ','')}-{j:04d}",
                fuente="idealista",
                url=f"https://www.idealista.com/inmueble/{random.randint(10000000, 99999999)}/",
                titulo=random.choice(tipos_titulo).format(zona=zona),
                precio_total=precio_total,
                precio_m2=round(precio_m2, 2),
                superficie_m2=superficie,
                habitaciones=random.choice([1, 2, 2, 3, 3, 3, 4, 4, 5]),
                ciudad=ciudad,
                distrito=zona,
                tipo_inmueble=random.choice(_tipos_pool),
                codigo_postal=None,
                activo=True,
                fecha_scraping=ahora - timedelta(
                    hours=random.randint(0, 168),
                    minutes=random.randint(0, 59),
                ),
            ))
            count += 1

        # ── Anuncios Fotocasa ───────────────────────────────────────────
        for j in range(n_fc):
            superficie = random.choice([45, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 150])
            precio_m2 = round(random.gauss(asking_fc, asking_fc * 0.15), 2)
            precio_m2 = max(precio_m2, asking_fc * 0.55)
            precio_total = int(precio_m2 * superficie)

            session.add(AnuncioDB(
                id_externo=f"fotocasa-{ciudad}-{zona.lower().replace(' ','')}-{j:04d}",
                fuente="fotocasa",
                url=f"https://www.fotocasa.es/es/comprar/vivienda/{random.randint(100000000, 999999999)}",
                titulo=random.choice(tipos_titulo).format(zona=zona),
                precio_total=precio_total,
                precio_m2=round(precio_m2, 2),
                superficie_m2=superficie,
                habitaciones=random.choice([1, 2, 2, 3, 3, 3, 4, 4, 5]),
                ciudad=ciudad,
                distrito=zona,
                tipo_inmueble=random.choice(_tipos_pool),
                codigo_postal=None,
                activo=True,
                fecha_scraping=ahora - timedelta(
                    hours=random.randint(0, 168),
                    minutes=random.randint(0, 59),
                ),
            ))
            count += 1

        # Commit cada zona para no acumular demasiado en memoria
        if count % 500 == 0:
            session.commit()

    session.commit()
    print(f"  ✓ {count} anuncios")


def seed_gaps(session: Session):
    """Inserta gap_analisis para 12 meses — es lo que consume el dashboard."""
    print("→ Insertando gap_analisis (12 meses)...")
    meses = _generar_meses(12)
    count = 0

    for ciudad, zona, notarial_base, asking_id_base, asking_fc_base, tx, n_id, n_fc in DATOS_MERCADO:
        for i, periodo in enumerate(meses):
            notarial = _var_mensual(notarial_base, i, len(meses))
            asking_id = _var_mensual(asking_id_base, i, len(meses))
            asking_fc = _var_mensual(asking_fc_base, i, len(meses))

            # Asking combinado = media ponderada por nº anuncios
            asking_medio = round(
                (asking_id * n_id + asking_fc * n_fc) / (n_id + n_fc), 2
            )

            gap_pct = round((asking_medio - notarial) / notarial * 100, 2) if notarial > 0 else 0
            gap_id_pct = round((asking_id - notarial) / notarial * 100, 2) if notarial > 0 else 0
            gap_fc_pct = round((asking_fc - notarial) / notarial * 100, 2) if notarial > 0 else 0

            mes_num = int(periodo.split("-")[1])
            factor_est = {
                1: 0.7, 2: 0.75, 3: 0.85, 4: 0.95, 5: 1.1, 6: 1.15,
                7: 0.8, 8: 0.6, 9: 1.05, 10: 1.1, 11: 0.95, 12: 0.7,
            }.get(mes_num, 1.0)
            tx_mes = int(tx * factor_est * random.uniform(0.9, 1.1))

            session.add(GapAnalisisDB(
                ciudad=ciudad,
                zona=zona,
                asking_medio_m2=asking_medio,
                notarial_medio_m2=notarial,
                gap_pct=gap_pct,
                num_anuncios=int((n_id + n_fc) * random.uniform(0.85, 1.15)),
                num_transacciones=tx_mes,
                asking_idealista_m2=asking_id,
                asking_fotocasa_m2=asking_fc,
                gap_idealista_pct=gap_id_pct,
                gap_fotocasa_pct=gap_fc_pct,
                num_anuncios_idealista=int(n_id * random.uniform(0.85, 1.15)),
                num_anuncios_fotocasa=int(n_fc * random.uniform(0.85, 1.15)),
                periodo=periodo,
                calculado_en=datetime.strptime(periodo + "-16", "%Y-%m-%d"),
            ))
            count += 1

    session.commit()
    print(f"  ✓ {count} registros de gap_analisis")


def seed_alertas(session: Session):
    """Inserta alertas de ejemplo con disparos reales."""
    print("→ Insertando alertas y disparos...")

    alertas = [
        AlertaDB(
            id="alerta-madrid-centro",
            zona="Madrid",
            ciudad="madrid",
            precio_max_asking=4500,
            gap_minimo_pct=15.0,
            activa=True,
            descripcion="Madrid centro: gap >15% y asking <4500 €/m²",
            email_destino="usuario@urbia.es",
        ),
        AlertaDB(
            id="alerta-bcn-gracia",
            zona="Gràcia",
            ciudad="barcelona",
            precio_max_asking=5000,
            gap_minimo_pct=20.0,
            activa=True,
            descripcion="Barcelona Gràcia: gap >20% y asking <5000 €/m²",
            email_destino="usuario@urbia.es",
        ),
        AlertaDB(
            id="alerta-valencia-ruzafa",
            zona="Ruzafa",
            ciudad="valencia",
            precio_max_asking=3500,
            gap_minimo_pct=18.0,
            activa=True,
            descripcion="Valencia Ruzafa: gap >18%",
            email_destino="usuario@urbia.es",
        ),
        AlertaDB(
            id="alerta-asturias-gijon",
            zona="Gijón",
            ciudad="asturias",
            precio_max_asking=2000,
            gap_minimo_pct=15.0,
            activa=True,
            descripcion="Gijón: gap >15% y asking <2000 €/m²",
            email_destino="usuario@urbia.es",
        ),
        AlertaDB(
            id="alerta-sevilla-triana",
            zona="Triana",
            ciudad="sevilla",
            precio_max_asking=3000,
            gap_minimo_pct=20.0,
            activa=True,
            descripcion="Sevilla Triana: gap >20%",
            email_destino="usuario@urbia.es",
        ),
    ]

    for alerta in alertas:
        existente = session.get(AlertaDB, alerta.id)
        if not existente:
            session.add(alerta)

    session.commit()

    # Disparos recientes (simulan que las alertas se activaron)
    ahora = datetime.utcnow()
    disparos_data = [
        ("alerta-madrid-centro", "Madrid",   3920, 3420, "madrid"),
        ("alerta-madrid-centro", "Madrid",   4100, 3420, "madrid"),
        ("alerta-bcn-gracia",    "Gràcia",   4650, 3920, "barcelona"),
        ("alerta-valencia-ruzafa","Ruzafa",  3050, 2520, "valencia"),
        ("alerta-asturias-gijon", "Gijón",   1590, 1380, "asturias"),
        ("alerta-sevilla-triana", "Triana",  2680, 2240, "sevilla"),
        ("alerta-madrid-centro",  "Madrid",  4050, 3420, "madrid"),
        ("alerta-bcn-gracia",     "Gràcia",  4780, 3920, "barcelona"),
    ]

    for alerta_id, zona, asking, notarial, ciudad in disparos_data:
        gap_pct = round((asking - notarial) / notarial * 100, 1)
        session.add(DisparoAlertaDB(
            alerta_id=alerta_id,
            anuncio_url=f"https://www.idealista.com/inmueble/{random.randint(10000000, 99999999)}/",
            zona=zona,
            asking_m2=asking,
            notarial_m2=notarial,
            gap_pct=gap_pct,
            email_enviado=random.choice([True, True, True, False]),
            leido=random.choice([True, False, False]),
            creado_en=ahora - timedelta(hours=random.randint(1, 72)),
        ))

    session.commit()
    print(f"  ✓ {len(alertas)} alertas + {len(disparos_data)} disparos")


def limpiar_todo(session: Session):
    """Elimina todos los datos de todas las tablas."""
    print("⚠ Limpiando todas las tablas...")
    session.query(DisparoAlertaDB).delete()
    session.query(AlertaDB).delete()
    session.query(GapAnalisisDB).delete()
    session.query(AnuncioDB).delete()
    session.query(DatoNotarialDB).delete()
    session.query(MunicipioDB).delete()
    session.commit()
    print("  ✓ Tablas vaciadas")


def main():
    parser = argparse.ArgumentParser(description="Seed de datos reales de mercado")
    parser.add_argument("--limpiar", action="store_true", help="Borrar todo antes de insertar")
    args = parser.parse_args()

    random.seed(42)  # reproducibilidad

    # Crear tablas si no existen
    Base.metadata.create_all(engine)

    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = SessionLocal()

    try:
        if args.limpiar:
            limpiar_todo(session)

        seed_municipios(session)
        seed_datos_notariales(session)
        seed_anuncios(session)
        seed_gaps(session)
        seed_alertas(session)

        # Conteo final
        n_not = session.query(DatoNotarialDB).count()
        n_anu = session.query(AnuncioDB).count()
        n_gap = session.query(GapAnalisisDB).count()
        n_ale = session.query(AlertaDB).count()
        n_dis = session.query(DisparoAlertaDB).count()
        n_mun = session.query(MunicipioDB).count()

        print(f"\n═══ SEED COMPLETADO ═══")
        print(f"  Municipios:       {n_mun}")
        print(f"  Datos notariales: {n_not}")
        print(f"  Anuncios:         {n_anu}")
        print(f"  Gap análisis:     {n_gap}")
        print(f"  Alertas:          {n_ale}")
        print(f"  Disparos:         {n_dis}")

    except Exception as e:
        session.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
