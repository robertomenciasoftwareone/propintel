-- Migración: añade columna foto_principal a la tabla anuncios
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS foto_principal TEXT;
