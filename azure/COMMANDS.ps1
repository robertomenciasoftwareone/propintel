#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Comandos útiles para gestionar despliegue en Azure
  
.DESCRIPTION
  Referencia rápida de comandos az cli para operaciones comunes
#>

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║              COMANDOS UTILES - AZURE CLI REFERENCE                        ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# ─────────────────────────────────────────────────────────────────────────────
# 1. AUTHENTICATION
# ─────────────────────────────────────────────────────────────────────────────

# Login a Azure
az login

# Listar suscripciones
az account list --output table

# Seleccionar suscripción
az account set --subscription "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Ver suscripción actual
az account show

# ─────────────────────────────────────────────────────────────────────────────
# 2. RESOURCE GROUP
# ─────────────────────────────────────────────────────────────────────────────

# Crear resource group
az group create --name urbia-rg --location westeurope

# Listar resource groups
az group list --output table

# Ver detalles de resource group
az group show --name urbia-rg

# Eliminar resource group (cuidado!)
az group delete --name urbia-rg --yes

# ─────────────────────────────────────────────────────────────────────────────
# 3. DESPLIEGUE
# ─────────────────────────────────────────────────────────────────────────────

# Desplegar con Bicep
az deployment group create `
  --resource-group urbia-rg `
  --template-file azure/main.bicep `
  --parameters azure/parameters.json

# Validar template antes de desplegar
az deployment group validate `
  --resource-group urbia-rg `
  --template-file azure/main.bicep `
  --parameters azure/parameters.json

# Ver status despliegue
az deployment group show --resource-group urbia-rg --name urbia-*

# Ver outputs despliegue
az deployment group show `
  --resource-group urbia-rg `
  --name urbia-* `
  --query 'properties.outputs' `
  --output json

# Eliminar despliegue (mantenga recurso group)
az deployment group delete --resource-group urbia-rg --name urbia-*

# ─────────────────────────────────────────────────────────────────────────────
# 4. APP SERVICE
# ─────────────────────────────────────────────────────────────────────────────

# Listar app services
az webapp list --resource-group urbia-rg --output table

# Ver configuración app service
az webapp config appsettings list --resource-group urbia-rg --name urbia-api

# Actualizar app setting (variable entorno)
az webapp config appsettings set `
  --resource-group urbia-rg `
  --name urbia-api `
  --settings "ASPNETCORE_ENVIRONMENT=Production"

# Ver logs en tiempo real
az webapp log tail --resource-group urbia-rg --name urbia-api

# Reiniciar app service
az webapp restart --resource-group urbia-rg --name urbia-api

# ─────────────────────────────────────────────────────────────────────────────
# 5. POSTGRESQL
# ─────────────────────────────────────────────────────────────────────────────

# Listar servidores PostgreSQL
az postgres flexible-server list --resource-group urbia-rg

# Ver detalles PostgreSQL
az postgres flexible-server show --resource-group urbia-rg --name urbia-db

# Ver firewall rules
az postgres flexible-server firewall-rule list --resource-group urbia-rg --server-name urbia-db

# Permitir IP específica
az postgres flexible-server firewall-rule create `
  --resource-group urbia-rg `
  --server-name urbia-db `
  --name AllowMyIP `
  --start-ip-address 1.2.3.4 `
  --end-ip-address 1.2.3.4

# Permitir todos los IPs Azure
az postgres flexible-server firewall-rule create `
  --resource-group urbia-rg `
  --server-name urbia-db `
  --name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 255.255.255.255

# Conectar a BD (local, requiere psql)
psql --host=urbia-db.postgres.database.azure.com `
     --username=urbiaadmin@urbia-db `
     --dbname=propintel

# ─────────────────────────────────────────────────────────────────────────────
# 6. STATIC WEB APPS
# ─────────────────────────────────────────────────────────────────────────────

# Listar static web apps
az staticwebapp list --resource-group urbia-rg

# Ver detalles
az staticwebapp show --resource-group urbia-rg --name urbia-web

# Ver logs despliegue
az staticwebapp logs list --resource-group urbia-rg --name urbia-web

# ─────────────────────────────────────────────────────────────────────────────
# 7. COSMOS DB
# ─────────────────────────────────────────────────────────────────────────────

# Listar Cosmos DB
az cosmosdb list --resource-group urbia-rg

# Ver detalles Cosmos DB
az cosmosdb show --resource-group urbia-rg --name urbia-cosmos

# Obtener connection string
az cosmosdb keys list `
  --resource-group urbia-rg `
  --name urbia-cosmos `
  --type connection-strings

# ─────────────────────────────────────────────────────────────────────────────
# 8. KEY VAULT
# ─────────────────────────────────────────────────────────────────────────────

# Listar key vaults
az keyvault list --resource-group urbia-rg

# Ver secretos
az keyvault secret list --vault-name urbia-kv-xxxxx

# Crear secreto
az keyvault secret set `
  --vault-name urbia-kv-xxxxx `
  --name "PostgreSQLPassword" `
  --value "tu_contraseña"

# Obtener secreto
az keyvault secret show --vault-name urbia-kv-xxxxx --name "PostgreSQLPassword"

# ─────────────────────────────────────────────────────────────────────────────
# 9. APPLICATION INSIGHTS
# ─────────────────────────────────────────────────────────────────────────────

# Listar insights
az monitor app-insights list --resource-group urbia-rg

# Ver instrumentación key
az monitor app-insights component show `
  --resource-group urbia-rg `
  --app urbia-insights `
  --query instrumentationKey `
  -o tsv

# ─────────────────────────────────────────────────────────────────────────────
# 10. DOCKER / CONTAINER REGISTRY
# ─────────────────────────────────────────────────────────────────────────────

# Crear Azure Container Registry
az acr create `
  --resource-group urbia-rg `
  --name urbiaregistry `
  --sku Basic

# Build image en ACR
az acr build `
  --registry urbiaregistry `
  --image propintel-api:latest `
  .

# Listar imágenes
az acr repository list --name urbiaregistry

# ─────────────────────────────────────────────────────────────────────────────
# 11. STORAGE
# ─────────────────────────────────────────────────────────────────────────────

# Listar storage accounts
az storage account list --resource-group urbia-rg --output table

# Ver keys (para conexión)
az storage account keys list `
  --resource-group urbia-rg `
  --account-name urbia*

# ─────────────────────────────────────────────────────────────────────────────
# 12. COSTES
# ─────────────────────────────────────────────────────────────────────────────

# Ver costes actuales (últimos 30 días)
az costmanagement forecast --timeframe ActualToDate

# Crear presupuesto alerta
az consumption budget create `
  --budget-name "urbia-monthly" `
  --category "Consumption" `
  --limit 100 `
  --threshold 90

# ─────────────────────────────────────────────────────────────────────────────
# 13. DIAGNOSTICO / TROUBLESHOOTING
# ─────────────────────────────────────────────────────────────────────────────

# Ver errores despliegue
az deployment operation group list `
  --resource-group urbia-rg `
  --deployment-name urbia-*

# Probar conectividad DB
az postgres flexible-server connect `
  --resource-group urbia-rg `
  --server-name urbia-db

# Ver eventos actividad
az monitor activity-log list `
  --resource-group urbia-rg `
  --output table

# Ver alertas
az monitor metrics alert list --resource-group urbia-rg

# ─────────────────────────────────────────────────────────────────────────────
# AYUDA
# ─────────────────────────────────────────────────────────────────────────────

# Ver ayuda para cualquier comando
az [comando] --help

# Ejemplos: 
az webapp --help
az postgres --help
az deployment --help
