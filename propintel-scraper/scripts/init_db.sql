-- PropIntel — Creación de tablas desde cero
-- Ejecutar: psql -h localhost -U propintel_user -d propintel -f init_db.sql

CREATE TABLE IF NOT EXISTS municipios (
    id_ine          VARCHAR(10) PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL,
    nombre_norm     VARCHAR(200) NOT NULL DEFAULT '',
    provincia       VARCHAR(100),
    comunidad       VARCHAR(100),
    poblacion       INTEGER,
    tiene_datos     BOOLEAN NOT NULL DEFAULT FALSE,
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    slug_idealista  VARCHAR(200),
    slug_fotocasa   VARCHAR(200),
    actualizado_en  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS datos_notariales (
    id                  SERIAL PRIMARY KEY,
    ciudad              VARCHAR(100) NOT NULL,
    municipio           VARCHAR(200) NOT NULL,
    codigo_postal       VARCHAR(10),
    precio_medio_m2     DOUBLE PRECISION NOT NULL,
    precio_min_m2       DOUBLE PRECISION,
    precio_max_m2       DOUBLE PRECISION,
    num_transacciones   INTEGER NOT NULL DEFAULT 0,
    periodo             VARCHAR(7) NOT NULL,  -- 'YYYY-MM'
    creado_en           TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_notarial_zona_periodo
    ON datos_notariales (ciudad, municipio, periodo);
CREATE INDEX IF NOT EXISTS ix_notarial_ciudad_periodo
    ON datos_notariales (ciudad, periodo);

CREATE TABLE IF NOT EXISTS anuncios (
    id              SERIAL PRIMARY KEY,
    id_externo      VARCHAR(100) NOT NULL UNIQUE,
    fuente          VARCHAR(50) NOT NULL,
    url             TEXT NOT NULL,
    titulo          TEXT,
    precio_total    INTEGER NOT NULL,
    precio_m2       DOUBLE PRECISION,
    superficie_m2   DOUBLE PRECISION,
    habitaciones    INTEGER,
    ciudad          VARCHAR(100) NOT NULL,
    distrito        VARCHAR(100),
    tipo_inmueble   VARCHAR(50),
    codigo_postal   VARCHAR(10),
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_scraping  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_anuncios_ciudad_distrito
    ON anuncios (ciudad, distrito);
CREATE INDEX IF NOT EXISTS ix_anuncios_fecha
    ON anuncios (fecha_scraping DESC);

CREATE TABLE IF NOT EXISTS gap_analisis (
    id                      SERIAL PRIMARY KEY,
    ciudad                  VARCHAR(100) NOT NULL,
    zona                    VARCHAR(100) NOT NULL,
    codigo_postal           VARCHAR(10),
    asking_medio_m2         DOUBLE PRECISION NOT NULL,
    notarial_medio_m2       DOUBLE PRECISION NOT NULL,
    gap_pct                 DOUBLE PRECISION NOT NULL,
    num_anuncios            INTEGER NOT NULL DEFAULT 0,
    num_transacciones       INTEGER NOT NULL DEFAULT 0,
    asking_idealista_m2     DOUBLE PRECISION,
    asking_fotocasa_m2      DOUBLE PRECISION,
    gap_idealista_pct       DOUBLE PRECISION,
    gap_fotocasa_pct        DOUBLE PRECISION,
    num_anuncios_idealista  INTEGER NOT NULL DEFAULT 0,
    num_anuncios_fotocasa   INTEGER NOT NULL DEFAULT 0,
    periodo                 VARCHAR(7) NOT NULL,
    calculado_en            TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_gap_zona_periodo
    ON gap_analisis (ciudad, zona, periodo);
CREATE INDEX IF NOT EXISTS ix_gap_ciudad_periodo
    ON gap_analisis (ciudad, zona, periodo);

CREATE TABLE IF NOT EXISTS alertas (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    zona                VARCHAR(100) NOT NULL,
    ciudad              VARCHAR(100) NOT NULL,
    precio_max_asking   DOUBLE PRECISION NOT NULL,
    gap_minimo_pct      DOUBLE PRECISION NOT NULL,
    activa              BOOLEAN NOT NULL DEFAULT TRUE,
    descripcion         TEXT,
    email_destino       VARCHAR(200) NOT NULL,
    creada_en           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disparos_alertas (
    id              SERIAL PRIMARY KEY,
    alerta_id       VARCHAR(36) NOT NULL REFERENCES alertas(id),
    anuncio_url     TEXT NOT NULL,
    zona            VARCHAR(100) NOT NULL,
    asking_m2       DOUBLE PRECISION NOT NULL,
    notarial_m2     DOUBLE PRECISION NOT NULL,
    gap_pct         DOUBLE PRECISION NOT NULL,
    email_enviado   BOOLEAN NOT NULL DEFAULT FALSE,
    leido           BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_disparos_creado
    ON disparos_alertas (creado_en DESC);

\echo '✅ Tablas creadas correctamente'
