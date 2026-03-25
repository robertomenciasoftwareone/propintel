"""
seed_codigos_postales.py
========================
Pobla la tabla `codigos_postales` con datos de GeoNames (España).

Fuente: http://download.geonames.org/export/zip/ES.zip
Formato TSV: country_code, postal_code, place_name, admin_name1, admin_code1,
             admin_name2, admin_code2, admin_name3, admin_code3,
             latitude, longitude, accuracy

Uso:
    python scripts/seed_codigos_postales.py [--download] [--db-url postgresql://...]

Con --download descarga el fichero de GeoNames automáticamente.
Sin --download espera encontrar ES.txt en el directorio actual o en /tmp/ES.txt
"""

import argparse
import io
import os
import sys
import zipfile
from pathlib import Path

import httpx
try:
    import psycopg2 as pg
except ImportError:
    import psycopg as pg  # psycopg v3
from dotenv import load_dotenv

load_dotenv()

GEONAMES_URL = "https://download.geonames.org/export/zip/ES.zip"
GEONAMES_CACHE = Path("/tmp/ES.txt")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS codigos_postales (
    cp            VARCHAR(5)  PRIMARY KEY,
    nombre        VARCHAR(255),
    provincia     VARCHAR(100),
    lat           DOUBLE PRECISION,
    lon           DOUBLE PRECISION,
    municipio_ine VARCHAR(10)
);
"""

UPSERT_SQL = """
INSERT INTO codigos_postales (cp, nombre, provincia, lat, lon)
VALUES (%s, %s, %s, %s, %s)
ON CONFLICT (cp) DO UPDATE SET
    nombre    = EXCLUDED.nombre,
    provincia = EXCLUDED.provincia,
    lat       = EXCLUDED.lat,
    lon       = EXCLUDED.lon;
"""


def download_geonames() -> Path:
    """Descarga y descomprime el fichero de CPs de España desde GeoNames."""
    print(f"Descargando {GEONAMES_URL}…")
    with httpx.Client(follow_redirects=True, timeout=60) as client:
        resp = client.get(GEONAMES_URL)
        resp.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
        z.extract("ES.txt", "/tmp")

    print(f"Descargado: {GEONAMES_CACHE}")
    return GEONAMES_CACHE


def parse_geonames(path: Path) -> list[tuple]:
    """
    Lee ES.txt de GeoNames y devuelve lista de tuplas (cp, nombre, provincia, lat, lon).
    Cuando hay varios registros para el mismo CP, usa el primero (mayor accuracy).
    """
    rows: dict[str, tuple] = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 11:
                continue
            cp       = parts[1].strip().zfill(5)
            nombre   = parts[2].strip()
            prov     = parts[3].strip()   # Comunidad autónoma en GeoNames
            lat      = parts[9].strip()
            lon      = parts[10].strip()

            if not cp or not lat or not lon:
                continue
            if cp not in rows:
                try:
                    rows[cp] = (cp, nombre, prov, float(lat), float(lon))
                except ValueError:
                    pass

    return list(rows.values())


def seed(db_url: str, data: list[tuple]) -> None:
    """Inserta/actualiza los CPs en la base de datos."""
    print(f"Conectando a la base de datos…")
    conn = pg.connect(db_url)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(CREATE_TABLE_SQL)
                inserted = 0
                batch_size = 500
                for i in range(0, len(data), batch_size):
                    batch = data[i : i + batch_size]
                    cur.executemany(UPSERT_SQL, batch)
                    inserted += len(batch)
                    print(f"  {inserted}/{len(data)} CPs insertados…", end="\r")
        print(f"\n✓ {len(data)} códigos postales cargados en codigos_postales")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed tabla codigos_postales desde GeoNames")
    parser.add_argument(
        "--download", action="store_true",
        help="Descarga el fichero ES.zip de GeoNames antes de importar"
    )
    parser.add_argument(
        "--db-url", default=os.getenv("DATABASE_URL"),
        help="URL de conexión PostgreSQL (default: DATABASE_URL env var)"
    )
    parser.add_argument(
        "--input", type=Path, default=None,
        help="Ruta a ES.txt ya descargado (evita el download)"
    )
    args = parser.parse_args()

    if not args.db_url:
        sys.exit("ERROR: Proporciona --db-url o define DATABASE_URL en .env")

    # Resolución del fichero de entrada
    if args.input and args.input.exists():
        txt_path = args.input
    elif GEONAMES_CACHE.exists() and not args.download:
        txt_path = GEONAMES_CACHE
        print(f"Usando caché: {txt_path}")
    else:
        txt_path = download_geonames()

    data = parse_geonames(txt_path)
    print(f"Parsed {len(data)} códigos postales únicos de España")

    seed(args.db_url, data)


if __name__ == "__main__":
    main()
