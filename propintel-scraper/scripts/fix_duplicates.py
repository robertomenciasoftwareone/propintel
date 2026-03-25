"""Fix duplicate gap_analisis entries and check data consistency."""
from sqlalchemy import create_engine, text

engine = create_engine('postgresql+psycopg2://propintel_user:local123@localhost:5432/propintel')

with engine.begin() as conn:
    # 1. Check gap duplicates
    r = conn.execute(text(
        "SELECT ciudad, zona, periodo, COUNT(*) as cnt "
        "FROM gap_analisis GROUP BY ciudad, zona, periodo "
        "HAVING COUNT(*) > 1 ORDER BY ciudad, zona, periodo"
    ))
    dupes = r.fetchall()
    if dupes:
        print("Gap duplicates found:")
        for row in dupes:
            print(f"  {row[0]}/{row[1]} periodo={row[2]} count={row[3]}")
    else:
        print("No gap duplicates")

    # 2. Check notarial duplicates
    r = conn.execute(text(
        "SELECT ciudad, municipio, periodo, COUNT(*) as cnt "
        "FROM datos_notariales GROUP BY ciudad, municipio, periodo "
        "HAVING COUNT(*) > 1 ORDER BY ciudad, municipio, periodo"
    ))
    dupes_n = r.fetchall()
    if dupes_n:
        print("\nNotarial duplicates found:")
        for row in dupes_n:
            print(f"  {row[0]}/{row[1]} periodo={row[2]} count={row[3]}")
    else:
        print("\nNo notarial duplicates")

    # 3. Deduplicate gaps: keep the row with the latest calculado_en for each ciudad/zona/periodo
    result = conn.execute(text("""
        DELETE FROM gap_analisis 
        WHERE id NOT IN (
            SELECT DISTINCT ON (ciudad, zona, periodo) id
            FROM gap_analisis
            ORDER BY ciudad, zona, periodo, calculado_en DESC
        )
    """))
    print(f"\nDeleted {result.rowcount} duplicate gap rows")

    # 4. Deduplicate notariales: keep the row with latest creado_en
    result = conn.execute(text("""
        DELETE FROM datos_notariales 
        WHERE id NOT IN (
            SELECT DISTINCT ON (ciudad, municipio, periodo) id
            FROM datos_notariales
            ORDER BY ciudad, municipio, periodo, creado_en DESC
        )
    """))
    print(f"Deleted {result.rowcount} duplicate notarial rows")

    # 5. Verify
    gap_count = conn.execute(text("SELECT COUNT(*) FROM gap_analisis")).scalar()
    notarial_count = conn.execute(text("SELECT COUNT(*) FROM datos_notariales")).scalar()
    print(f"\nFinal counts: {gap_count} gaps, {notarial_count} notariales")

    # 6. Show asturias data
    r = conn.execute(text(
        "SELECT zona, periodo, asking_medio_m2, notarial_medio_m2, gap_pct, num_anuncios "
        "FROM gap_analisis WHERE ciudad='asturias' ORDER BY zona, periodo"
    ))
    print("\nAsturias gaps after cleanup:")
    for row in r.fetchall():
        print(f"  {row[0]} {row[1]}: asking={row[2]} notarial={row[3]} gap={row[4]}% n={row[5]}")
