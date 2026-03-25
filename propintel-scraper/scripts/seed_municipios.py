"""
Carga inicial de todos los municipios de España desde el INE.

El INE publica la lista oficial en:
  https://www.ine.es/daco/daco42/codmun/codmun20/20codmun.xlsx

Este script descarga ese Excel, normaliza los nombres y los inserta en la
tabla `municipios` de PostgreSQL. Es una operación de una sola vez (o cuando
el INE actualiza el censo de municipios).

Uso:
  cd propintel-scraper
  python scripts/seed_municipios.py                 # descarga desde INE
  python scripts/seed_municipios.py --archivo ruta  # usa un xlsx local
  python scripts/seed_municipios.py --dry-run       # solo muestra, no inserta
"""
import argparse
import io
import sys
import unicodedata
from pathlib import Path
from typing import Optional

import httpx
from loguru import logger
from sqlalchemy.orm import Session

# Añadimos el directorio padre al path para importar los módulos del proyecto
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.db_models import MunicipioDB, engine, init_db

# ── URL pública del INE ────────────────────────────────────────────────────────
INE_URL = "https://www.ine.es/daco/daco42/codmun/codmun20/20codmun.xlsx"

# ── Mapeo de código de provincia → comunidad autónoma ─────────────────────────
COMUNIDADES: dict[str, str] = {
    "01": "País Vasco",       "02": "Castilla-La Mancha", "03": "Comunidad Valenciana",
    "04": "Andalucía",        "05": "Castilla y León",    "06": "Extremadura",
    "07": "Islas Baleares",   "08": "Cataluña",           "09": "Castilla y León",
    "10": "Extremadura",      "11": "Andalucía",          "12": "Comunidad Valenciana",
    "13": "Castilla-La Mancha","14": "Andalucía",          "15": "Galicia",
    "16": "Castilla-La Mancha","17": "Cataluña",           "18": "Andalucía",
    "19": "Castilla-La Mancha","20": "País Vasco",         "21": "Andalucía",
    "22": "Aragón",           "23": "Andalucía",          "24": "Castilla y León",
    "25": "Cataluña",         "26": "La Rioja",           "27": "Galicia",
    "28": "Comunidad de Madrid","29": "Andalucía",         "30": "Región de Murcia",
    "31": "Comunidad Foral de Navarra","32": "Galicia",    "33": "Principado de Asturias",
    "34": "Castilla y León",  "35": "Canarias",           "36": "Galicia",
    "37": "Castilla y León",  "38": "Canarias",           "39": "Cantabria",
    "40": "Castilla y León",  "41": "Andalucía",          "42": "Castilla y León",
    "43": "Cataluña",         "44": "Aragón",             "45": "Castilla-La Mancha",
    "46": "Comunidad Valenciana","47": "Castilla y León",  "48": "País Vasco",
    "49": "Castilla y León",  "50": "Aragón",             "51": "Ceuta",
    "52": "Melilla",
}


def normalizar(texto: str) -> str:
    """Elimina tildes, convierte a minúsculas y elimina caracteres especiales."""
    nfkd = unicodedata.normalize("NFKD", texto)
    sin_tildes = "".join(c for c in nfkd if not unicodedata.combining(c))
    return sin_tildes.lower().strip()


def slug_desde_nombre(nombre: str) -> str:
    """Genera un slug de URL a partir del nombre del municipio."""
    norm = normalizar(nombre)
    # Eliminar artículos iniciales comunes (l', el, la, los, las, a, o)
    for articulo in ["l'", "l'", "el ", "la ", "los ", "las ", "a ", "o "]:
        if norm.startswith(articulo):
            norm = norm[len(articulo):]
            break
    # Reemplazar caracteres especiales y espacios por guiones
    slug = norm.replace("'", "").replace("'", "").replace("'", "")
    slug = slug.replace("/", "-").replace("(", "").replace(")", "")
    slug = "-".join(slug.split())  # múltiples espacios → un guion
    return slug


def descargar_excel(url: str) -> bytes:
    """Descarga el Excel del INE con reintentos."""
    logger.info(f"Descargando municipios INE desde {url} ...")
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        response = client.get(url, headers={"User-Agent": "PropIntel/1.0 (research)"})
        response.raise_for_status()
    logger.info(f"Descargado: {len(response.content):,} bytes")
    return response.content


def parsear_excel(contenido: bytes) -> list[dict]:
    """Parsea el Excel del INE y devuelve lista de dicts."""
    try:
        import openpyxl
    except ImportError:
        logger.error("Falta librería openpyxl. Instala con: pip install openpyxl")
        raise

    wb = openpyxl.load_workbook(io.BytesIO(contenido), read_only=True, data_only=True)
    ws = wb.active

    municipios = []
    filas = list(ws.iter_rows(values_only=True))

    # El Excel del INE tiene cabeceras en la primera fila
    # Columnas típicas: CODAUTO, CPRO, CMUN, DC, NOMBRE
    # Buscamos la fila de cabecera
    header_idx = 0
    for i, fila in enumerate(filas[:5]):
        valores = [str(v).upper() if v else "" for v in fila]
        if any("NOMBRE" in v or "CMUN" in v or "CPRO" in v for v in valores):
            header_idx = i
            break

    headers = [str(h).strip().upper() if h else "" for h in filas[header_idx]]
    logger.debug(f"Cabeceras detectadas: {headers}")

    # Índices de columnas
    def col(nombre: str) -> Optional[int]:
        for i, h in enumerate(headers):
            if nombre in h:
                return i
        return None

    idx_cpro = col("CPRO") or col("COD_PROV") or 1
    idx_cmun = col("CMUN") or col("COD_MUN") or 2
    idx_nombre = col("NOMBRE") or 4

    for fila in filas[header_idx + 1:]:
        if not fila or not fila[idx_nombre]:
            continue
        try:
            cpro = str(fila[idx_cpro]).zfill(2) if fila[idx_cpro] else None
            cmun = str(fila[idx_cmun]).zfill(3) if fila[idx_cmun] else None
            nombre = str(fila[idx_nombre]).strip()

            if not cpro or not cmun or not nombre or nombre == "None":
                continue

            id_ine = cpro + cmun  # 5 dígitos: 2 provincia + 3 municipio

            municipios.append({
                "id_ine":      id_ine,
                "nombre":      nombre,
                "nombre_norm": normalizar(nombre),
                "provincia":   cpro,   # código, se puede enriquecer con catálogo INE
                "comunidad":   COMUNIDADES.get(cpro, ""),
                "slug_idealista": slug_desde_nombre(nombre),
                "slug_fotocasa":  slug_desde_nombre(nombre),
            })
        except Exception as e:
            logger.debug(f"Fila ignorada: {fila} — {e}")

    logger.info(f"Municipios parseados: {len(municipios):,}")
    return municipios


def cargar_en_db(municipios: list[dict], dry_run: bool = False) -> int:
    """Inserta/actualiza municipios en PostgreSQL. Devuelve número insertados."""
    if dry_run:
        for m in municipios[:10]:
            print(f"  {m['id_ine']} | {m['nombre']:<40} | {m['comunidad']:<30} | slug: {m['slug_idealista']}")
        print(f"  ... ({len(municipios):,} municipios en total)")
        return 0

    insertados = 0
    actualizados = 0

    with Session(engine) as session:
        # Cargamos los id_ine existentes para saber cuáles son nuevos
        existentes = {m.id_ine for m in session.query(MunicipioDB.id_ine).all()}

        for m in municipios:
            if m["id_ine"] in existentes:
                # Actualizar nombre normalizado y slugs (pueden cambiar)
                obj = session.get(MunicipioDB, m["id_ine"])
                if obj:
                    obj.nombre = m["nombre"]
                    obj.nombre_norm = m["nombre_norm"]
                    obj.comunidad = m["comunidad"]
                    if not obj.slug_idealista:
                        obj.slug_idealista = m["slug_idealista"]
                    if not obj.slug_fotocasa:
                        obj.slug_fotocasa = m["slug_fotocasa"]
                    actualizados += 1
            else:
                session.add(MunicipioDB(
                    id_ine=m["id_ine"],
                    nombre=m["nombre"],
                    nombre_norm=m["nombre_norm"],
                    provincia=m["provincia"],
                    comunidad=m["comunidad"],
                    tiene_datos=False,
                    slug_idealista=m["slug_idealista"],
                    slug_fotocasa=m["slug_fotocasa"],
                ))
                insertados += 1

        session.commit()

    logger.info(f"BD actualizada: {insertados:,} nuevos, {actualizados:,} actualizados")
    return insertados


def main():
    parser = argparse.ArgumentParser(description="Seed municipios de España desde INE")
    parser.add_argument("--archivo", help="Ruta a un .xlsx local (omitir para descargar)")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra los datos, no inserta en BD")
    parser.add_argument("--init-db", action="store_true", help="Crea las tablas antes de insertar")
    args = parser.parse_args()

    if args.init_db:
        init_db()

    if args.archivo:
        contenido = Path(args.archivo).read_bytes()
    else:
        contenido = descargar_excel(INE_URL)

    municipios = parsear_excel(contenido)

    if not municipios:
        logger.error("No se pudieron parsear municipios. Revisa el formato del Excel.")
        sys.exit(1)

    n = cargar_en_db(municipios, dry_run=args.dry_run)

    if not args.dry_run:
        print(f"\n✓ {n:,} municipios nuevos cargados en PostgreSQL")
        print("  Siguiente paso: ejecutar --init-db si la tabla aún no existe")


if __name__ == "__main__":
    main()
