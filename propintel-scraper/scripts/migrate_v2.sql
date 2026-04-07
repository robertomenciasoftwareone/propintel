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

-- 1.b canonical_key para deduplicación cross-portal
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS canonical_key VARCHAR(200);
CREATE INDEX IF NOT EXISTS ix_anuncios_canonical_key ON anuncios (canonical_key);

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

-- 3. Eventos analytics (persistencia backend)
CREATE TABLE IF NOT EXISTS analytics_eventos (
  id              BIGSERIAL PRIMARY KEY,
  evento          VARCHAR(120) NOT NULL,
  session_id      VARCHAR(120),
  user_email      VARCHAR(255),
  municipio       VARCHAR(120),
  barrio          VARCHAR(120),
  payload_json    TEXT,
  creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_analytics_evento_fecha
  ON analytics_eventos (evento, creado_en DESC);

-- 4. Newsletter suscripciones
CREATE TABLE IF NOT EXISTS newsletter_suscripciones (
  id                  BIGSERIAL PRIMARY KEY,
  email               VARCHAR(255) NOT NULL UNIQUE,
  nombre              VARCHAR(120),
  municipio_interes   VARCHAR(120),
  barrio_interes      VARCHAR(120),
  activa              BOOLEAN NOT NULL DEFAULT TRUE,
  creada_en           TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizada_en      TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_newsletter_activa ON newsletter_suscripciones (activa);

\echo '✅ Migración v2 aplicada correctamente'
