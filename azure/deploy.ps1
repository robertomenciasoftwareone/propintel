#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Script de despliegue automático de UrbIA en Azure
  
.DESCRIPTION
  Despliega infraestructura low-cost (Container Apps + Cosmos DB + Static Web Apps)
  
.USAGE
  .\deploy.ps1 -SubscriptionId "tu-subscription-id" -ApiKey "miApiKey" -ApiContainerImage "ghcr.io/org/propintel-api:latest"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,

    [Parameter(Mandatory=$true)]
    [string]$ApiContainerImage,
    
    [string]$ResourceGroup = "urbia-rg",
    [string]$Location = "centralus",
    [string]$ProjectName = "urbia"
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          🚀 UrbIA Azure Deployment Script                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# ─── STEP 1: Verificar requisitos ───────────────────────────────────────────
Write-Host "`n[1/5] Verificando requisitos..." -ForegroundColor Yellow

$requiredTools = @("az", "docker")
foreach ($tool in $requiredTools) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Falta instalar: $tool" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ Herramientas OK (az cli, docker disponibles)" -ForegroundColor Green

# ─── STEP 2: Login y seleccionar subscription ───────────────────────────────
Write-Host "`n[2/5] Conectando a Azure..." -ForegroundColor Yellow

az login --quiet
az account set --subscription "$SubscriptionId"
Write-Host "✓ Conectado a subscription: $SubscriptionId" -ForegroundColor Green

# ─── STEP 3: Crear Resource Group ──────────────────────────────────────────
Write-Host "`n[3/5] Creando Resource Group..." -ForegroundColor Yellow

az group create `
    --name "$ResourceGroup" `
    --location "$Location" `
    --quiet

Write-Host "✓ Resource Group creado: $ResourceGroup" -ForegroundColor Green

# ─── STEP 4: Desplegar infraestructura (Bicep) ─────────────────────────────
Write-Host "`n[4/5] Desplegando infraestructura con Bicep..." -ForegroundColor Yellow

$bicepPath = Join-Path $PSScriptRoot "main.bicep"
$paramsPath = Join-Path $PSScriptRoot "parameters.json"

if (-not (Test-Path $bicepPath)) {
    Write-Host "❌ No encontrado: $bicepPath" -ForegroundColor Red
    exit 1
}

# Actualizar parámetros dinámicos
$params = Get-Content $paramsPath | ConvertFrom-Json
$params.parameters.apiKey.value = $ApiKey
$params.parameters.apiContainerImage.value = $ApiContainerImage
$params | ConvertTo-Json -Depth 10 | Set-Content $paramsPath

# Desplegar
az deployment group create `
    --name "urbia-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
    --resource-group "$ResourceGroup" `
    --template-file "$bicepPath" `
    --parameters "$paramsPath" `
    --output table

Write-Host "✓ Infraestructura desplegada correctamente" -ForegroundColor Green

# ─── STEP 5: Build y push Docker (opcional) ──────────────────────────────
Write-Host "`n[5/5] Configuración final..." -ForegroundColor Yellow

Write-Host @"
╔════════════════════════════════════════════════════════════╗
║              ✅ DESPLIEGUE COMPLETADO                      ║
╚════════════════════════════════════════════════════════════╝

📋 PROXIMOS PASOS:

1. BUILD & PUSH DOCKER:
  docker build -t ghcr.io/TU_ORG/propintel-api:latest .
  docker push ghcr.io/TU_ORG/propintel-api:latest

2. CONECTAR GITHUB (Static Web Apps):
   - Ve a: https://portal.azure.com
   - Busca: urbia-web (Static Web App)
   - Conecta tu repositorio GitHub

3. VERIFICAR DESPLIEGUE:
  az deployment group list --resource-group "$ResourceGroup" --output table

4. URL API (Container Apps):
  az containerapp show --resource-group "$ResourceGroup" --name "$ProjectName-api" --query properties.configuration.ingress.fqdn -o tsv

5. MONITOR:
  - Log Analytics: https://portal.azure.com → Log Analytics workspaces → $ProjectName-law

NOTA IMPORTANTE:
  Tu API actual usa EF + PostgreSQL. Para funcionar con este despliegue low-cost
  necesitas adaptar persistencia a Cosmos DB o usar una DB externa low-cost.

"@ -ForegroundColor Green

Write-Host "⏱️  Tiempo completado: $((Get-Date) - $startTime).TotalSeconds segundos" -ForegroundColor Cyan
