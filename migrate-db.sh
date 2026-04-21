#!/bin/bash
# Script para migrar la base de datos de Azure PostgreSQL a Railway PostgreSQL
#
# Uso:
#   1. Rellena las variables de abajo con tus credenciales
#   2. Ejecuta: bash migrate-db.sh
#
# Requisitos: psql y pg_dump instalados (PostgreSQL client tools)

set -e

# ─── ORIGEN: Azure PostgreSQL ─────────────────────────────────────────────────
AZURE_HOST="tu-servidor.postgres.database.azure.com"
AZURE_USER="propintel_admin"
AZURE_DB="propintel"
AZURE_PASSWORD="TU_PASSWORD_AZURE"

# ─── DESTINO: Railway PostgreSQL ─────────────────────────────────────────────
# Copia la "Connection URL" desde Railway → tu servicio PostgreSQL → Connect
RAILWAY_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"

BACKUP_FILE="propintel_backup_$(date +%Y%m%d_%H%M%S).sql"

echo ">>> Exportando base de datos desde Azure..."
PGPASSWORD="$AZURE_PASSWORD" pg_dump \
  --host="$AZURE_HOST" \
  --username="$AZURE_USER" \
  --dbname="$AZURE_DB" \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="$BACKUP_FILE"

echo ">>> Backup guardado en: $BACKUP_FILE"

echo ">>> Importando en Railway PostgreSQL..."
psql "$RAILWAY_URL" < "$BACKUP_FILE"

echo ">>> Migración completada."
