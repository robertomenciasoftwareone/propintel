"""
Migra datos de la BD local a Azure PostgreSQL.
Uso: python scripts/migrate_to_azure.py
"""
import psycopg2
import sys

LOCAL = dict(host='localhost', port=5432, dbname='propintel',
             user='propintel_user', password='local123')

AZURE = dict(host='urbia-febcserwrovii-db.postgres.database.azure.com',
             port=5432, dbname='propintel',
             user='urbiaadmin', password='TuPasswordSegura123!',
             sslmode='require')

COLS_ANUNCIOS = (
    'id,id_externo,fuente,url,titulo,precio_total,precio_m2,superficie_m2,'
    'habitaciones,tipo_inmueble,activo,fecha_scraping,codigo_postal,lat,lon,'
    'canonical_key,ciudad,distrito,foto_principal'
)

def migrate():
    print("Conectando a BD local...")
    local = psycopg2.connect(**LOCAL)
    lc = local.cursor()

    print("Conectando a Azure PostgreSQL...")
    azure = psycopg2.connect(**AZURE)
    ac = azure.cursor()

    # ── Anuncios ────────────────────────────────────────────────────────────
    lc.execute(f'SELECT {COLS_ANUNCIOS} FROM anuncios')
    rows = lc.fetchall()
    print(f"Migrando {len(rows)} anuncios...")
    ph = ','.join(['%s'] * len(COLS_ANUNCIOS.split(',')))
    ac.executemany(
        f'INSERT INTO anuncios ({COLS_ANUNCIOS}) VALUES ({ph}) ON CONFLICT (id_externo) DO NOTHING',
        rows
    )
    azure.commit()
    ac.execute('SELECT COUNT(*) FROM anuncios')
    print(f"  -> {ac.fetchone()[0]} anuncios en Azure")

    # ── Datos notariales ────────────────────────────────────────────────────
    lc.execute("SELECT column_name FROM information_schema.columns WHERE table_name='datos_notariales' ORDER BY ordinal_position")
    dn_cols = ','.join(r[0] for r in lc.fetchall())
    lc.execute(f'SELECT {dn_cols} FROM datos_notariales')
    rows2 = lc.fetchall()
    print(f"Migrando {len(rows2)} datos notariales...")
    ph2 = ','.join(['%s'] * len(dn_cols.split(',')))
    ac.executemany(
        f'INSERT INTO datos_notariales ({dn_cols}) VALUES ({ph2}) ON CONFLICT DO NOTHING',
        rows2
    )
    azure.commit()
    ac.execute('SELECT COUNT(*) FROM datos_notariales')
    print(f"  -> {ac.fetchone()[0]} datos notariales en Azure")

    # ── Gaps analisis ───────────────────────────────────────────────────────
    lc.execute("SELECT column_name FROM information_schema.columns WHERE table_name='gaps_analisis' ORDER BY ordinal_position")
    gap_cols = ','.join(r[0] for r in lc.fetchall())
    if gap_cols:
        lc.execute(f'SELECT {gap_cols} FROM gaps_analisis')
        rows3 = lc.fetchall()
        print(f"Migrando {len(rows3)} gaps...")
        ph3 = ','.join(['%s'] * len(gap_cols.split(',')))
        ac.executemany(
            f'INSERT INTO gaps_analisis ({gap_cols}) VALUES ({ph3}) ON CONFLICT DO NOTHING',
            rows3
        )
        azure.commit()
        ac.execute('SELECT COUNT(*) FROM gaps_analisis')
        print(f"  -> {ac.fetchone()[0]} gaps en Azure")

    local.close()
    azure.close()
    print("\nMigracion completada!")

if __name__ == '__main__':
    migrate()
