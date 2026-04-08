-- ============================================================
-- Migración: tabla estadisticas_macro
-- Almacena series temporales de indicadores macroeconómicos
-- oficiales (INE, BdE, BCE) para el módulo "Contexto Macro".
-- ============================================================

CREATE TABLE IF NOT EXISTS estadisticas_macro (
    id              SERIAL          PRIMARY KEY,
    fuente          VARCHAR(20)     NOT NULL,       -- 'INE', 'BDE', 'BCE'
    indicador       VARCHAR(60)     NOT NULL,       -- 'ipv_var_anual_general', 'hipotecas_numero', ...
    descripcion     TEXT,                           -- descripción legible
    periodo         VARCHAR(15)     NOT NULL,       -- '2024-T3', '2024-11', '1er Trimestre 2024'
    anyo            INTEGER,
    valor           DOUBLE PRECISION NOT NULL,
    unidad          VARCHAR(20),                    -- '%', 'índice', 'unidades', 'miles €'
    variacion_pct   DOUBLE PRECISION,               -- variación respecto al período anterior
    calculado_en    TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_estadistica_macro UNIQUE (fuente, indicador, periodo)
);

CREATE INDEX IF NOT EXISTS ix_estadisticas_macro_indicador
    ON estadisticas_macro (indicador, fuente);

CREATE INDEX IF NOT EXISTS ix_estadisticas_macro_anyo
    ON estadisticas_macro (anyo DESC);

COMMENT ON TABLE estadisticas_macro IS
    'Series temporales macro: IPV (INE), hipotecas (INE), tipos interés (BdE/BCE)';
