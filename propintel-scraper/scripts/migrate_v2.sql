-- PropIntel — Migración v2
-- Añade columna cp (5 dígitos) en anuncios y crea tabla codigos_postales
-- Ejecutar: psql -h localhost -U propintel_user -d propintel -f migrate_v2.sql

-- 1. Columna cp en anuncios (alias de codigo_postal normalizado a 5 dígitos)
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS cp VARCHAR(5);

-- Poblar cp desde codigo_postal existente (si ya hay datos)
UPDATE anuncios
SET cp = LPAD(REGEXP_REPLACE(codigo_postal, '[^0-9]', '', 'g'), 5, '0')
WHERE cp IS NULL
  AND codigo_postal IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(codigo_postal, '[^0-9]', '', 'g')) <= 5
  AND REGEXP_REPLACE(codigo_postal, '[^0-9]', '', 'g') != '';

CREATE INDEX IF NOT EXISTS ix_anuncios_cp ON anuncios (cp);

-- 2. Tabla de códigos postales (coordenadas centroide por CP)
CREATE TABLE IF NOT EXISTS codigos_postales (
    cp            VARCHAR(5)  PRIMARY KEY,
    nombre        VARCHAR(255),
    provincia     VARCHAR(100),
    lat           DOUBLE PRECISION,
    lon           DOUBLE PRECISION,
    municipio_ine VARCHAR(10)
);

CREATE INDEX IF NOT EXISTS ix_cp_provincia ON codigos_postales (provincia);

\echo '✅ Migración v2 aplicada correctamente'
