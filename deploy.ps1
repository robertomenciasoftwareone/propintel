#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Script de despliegue UrbIA

.DESCRIPTION
  Despliega el frontend (Angular), la API (.NET) o ambos a Azure.

.USAGE
  .\deploy.ps1 -Target front
  .\deploy.ps1 -Target api
  .\deploy.ps1 -Target all
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("front", "api", "all")]
    [string]$Target,

    [string]$ApiTag = "latest"
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# --- Configuracion -----------------------------------------------------------
$SWA_TOKEN      = "9a6fb74cd39b936e9eeb23ecd77a2cd02462fe95588485c0f74b86b2494c3b5b02-53ef134c-ce96-45d9-b071-5779382e1892010240807ca1ce10"
$RESOURCE_GROUP = "UrbIA"
$ACR_LOGIN      = "urbiaacr2026.azurecr.io"
$ACR_NAME       = "urbiaacr2026"
$CONTAINER_APP  = "urbia-febcserwrovii-api"
$API_IMAGE      = "$ACR_LOGIN/propintel-api:$ApiTag"
$FRONT_DIR      = "$Root\propintel"
$API_DIR        = "$Root\PropIntel.Api"

# --- Helpers -----------------------------------------------------------------
function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "   OK: $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "   ERROR: $msg" -ForegroundColor Red; exit 1 }

# --- DEPLOY FRONT ------------------------------------------------------------
function Deploy-Front {
    Write-Step "Build Angular (production)..."
    Push-Location $FRONT_DIR
    npm run build -- --configuration production
    if ($LASTEXITCODE -ne 0) { Write-Err "ng build fallo" }
    Write-Ok "Build completado"

    Write-Step "Deploy a Azure Static Web Apps..."
    npx @azure/static-web-apps-cli deploy ./dist/propintel/browser `
        --deployment-token $SWA_TOKEN `
        --env production
    if ($LASTEXITCODE -ne 0) { Write-Err "SWA deploy fallo" }
    Write-Ok "Frontend desplegado -> https://nice-desert-07ca1ce10.2.azurestaticapps.net"
    Pop-Location
}

# --- DEPLOY API --------------------------------------------------------------
function Deploy-Api {
    Write-Step "Login en Azure Container Registry..."
    az acr login --name $ACR_NAME
    if ($LASTEXITCODE -ne 0) { Write-Err "az acr login fallo" }

    Write-Step "Build y push imagen Docker ($API_IMAGE)..."
    Push-Location $API_DIR
    docker build -t $API_IMAGE .
    if ($LASTEXITCODE -ne 0) { Write-Err "docker build fallo" }
    docker push $API_IMAGE
    if ($LASTEXITCODE -ne 0) { Write-Err "docker push fallo" }
    Write-Ok "Imagen subida: $API_IMAGE"
    Pop-Location

    Write-Step "Actualizar Container App..."
    az containerapp update `
        --name $CONTAINER_APP `
        --resource-group $RESOURCE_GROUP `
        --image $API_IMAGE
    if ($LASTEXITCODE -ne 0) { Write-Err "az containerapp update fallo" }
    Write-Ok "API desplegada -> https://urbia-febcserwrovii-api.kindbush-ba8050c6.centralus.azurecontainerapps.io"
}

# --- MAIN --------------------------------------------------------------------
$startTime = Get-Date

Write-Host ""
Write-Host "=== UrbIA Deploy | Target: $Target ===" -ForegroundColor Magenta

switch ($Target) {
    "front" { Deploy-Front }
    "api"   { Deploy-Api }
    "all"   { Deploy-Front; Deploy-Api }
}

$elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
Write-Host "`nDeploy completado en $elapsed s" -ForegroundColor Green
