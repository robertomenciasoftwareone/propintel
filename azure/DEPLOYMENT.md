# 🚀 UrbIA - Guía de Despliegue en Azure

## 📋 Tabla de contenidos
1. [Requisitos previos](#requisitos-previos)
2. [Crear cuenta Azure gratis](#crear-cuenta-azure-gratis)
3. [Despliegue automático](#despliegue-automático)
4. [Despliegue manual](#despliegue-manual)
5. [Costes estimados](#costes-estimados)
6. [Troubleshooting](#troubleshooting)

---

## Requisitos previos

### Software necesario:
```bash
# Instalar Azure CLI
# Windows: https://aka.ms/installazurecliwindows
# Linux/Mac: https://docs.microsoft.com/cli/azure/install-azure-cli

# Instalar Docker
# https://www.docker.com/products/docker-desktop

# Verificar instalación:
az --version
docker --version
```

### Cuenta Azure:
- Crear cuenta gratis: https://azure.microsoft.com/free
- Crédito inicial: **200 USD** durante 30 días
- Servicios siempre gratis (12 meses):
  - Static Web Apps (1 app)
  - App Service B1 (60 min/día)
  - PostgreSQL (primeros 12 meses)

---

## Crear cuenta Azure gratis

### Paso 1: Registrarse
1. Ir a https://azure.microsoft.com/free
2. Hacer clic en "Empezar gratis"
3. Ingresar email (Gmail, Outlook, etc.)
4. Aceptar términos

### Paso 2: Validar
- Verificar identidad con tarjeta de crédito (solo validación, sin cargo)
- Confirmar teléfono (SMS)

### Paso 3: Obtener Subscription ID
```bash
az login
az account list --output table
# Copiar el "SubscriptionId" (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

---

## Despliegue automático ⚡ (RECOMENDADO)

### Opción 1: Con PowerShell (Windows)

```powershell
# 1. Abrir PowerShell como administrador
# 2. Navegar al proyecto
cd C:\Proyectos\PropIntel

# 3. Ejecutar despliegue
.\azure\deploy.ps1 `
  -SubscriptionId "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" `
  -PostgresPassword "MiPassword123!Segura" `
  -ApiKey "MiApiKey_Produccion_Aqui"

# Esperar ~10 minutos mientras se despliega...
```

### Opción 2: Con Bash (Linux/Mac)

```bash
# 1. Hacer script ejecutable
chmod +x azure/deploy.sh

# 2. Ejecutar
./azure/deploy.sh \
  --subscription-id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --postgres-password "MiPassword123!Segura" \
  --api-key "MiApiKey_Produccion_Aqui"
```

---

## Despliegue manual

### Paso 1: Login en Azure
```bash
az login
az account set --subscription "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Paso 2: Crear Resource Group
```bash
az group create \
  --name urbia-rg \
  --location westeurope
```

### Paso 3: Desplegar con Bicep
```bash
# Actualizar parámetros en azure/parameters.json
# Luego:
az deployment group create \
  --resource-group urbia-rg \
  --template-file azure/main.bicep \
  --parameters azure/parameters.json \
  --output table
```

### Paso 4: Build Docker (si usas ACR)
```bash
# Crear Azure Container Registry (si no existe)
az acr create --resource-group urbia-rg --name urbiaregistry --sku Basic

# Build y push
az acr build \
  --registry urbiaregistry \
  --image propintel-api:latest \
  .
```

### Paso 5: Conectar GitHub (Static Web Apps)
1. Ir a https://portal.azure.com
2. Buscar "urbia-web" (Static Web App)
3. Hacer clic en "Configurar origen de compilación"
4. Conectar repositorio GitHub
5. Elegir rama `main` y carpeta `propintel`

---

## Costes estimados

### 💚 Primeros 3 meses (con crédito Azure gratis)

| Recurso | Precio | Cobertura |
|---------|--------|-----------|
| Static Web Apps | 0 € | Siempre gratis |
| App Service B1 | 0 € | 12 meses gratis |
| PostgreSQL | 0 € | 12 meses gratis |
| Storage + Logs | 1-5 € | Crédito 200 USD |
| **TOTAL** | **0-5 €** | **200 USD crédito** |

### 💛 Después de 3 meses (mes 4+)

| Recurso | Precio mensual |
|---------|----------------|
| Static Web Apps | 0 € (siempre gratis) |
| App Service B1 | ~47 € (después de 12 meses) |
| PostgreSQL | 30-70 € (según uso) |
| Storage | 1-5 € |
| **TOTAL** | **~80-120 €/mes** |

### 🚀 Alternativa: Cosmos DB (más barata después)

Para cambiar a Cosmos DB (requiere cambios de código):
- Primeros 3 meses: 0 € (free tier)
- Después: 0-10 € (si usas en modo serverless)

---

## Troubleshooting

### ❌ Error: "Subscription not found"
```bash
# Verificar subscription ID
az account list --output table
# Copiar el SubscriptionId correcto
```

### ❌ Error: "PostgreSQL connection failed"
```bash
# Verificar firewall
az postgres flexible-server firewall-rule create \
  --name AllowAzureIP \
  --rule-start-ip-address 0.0.0.0 \
  --rule-end-ip-address 255.255.255.255 \
  --resource-group urbia-rg \
  --server-name urbia-db
```

### ❌ Error: "Docker build failed"
```bash
# Verificar .dockerignore existe
ls -a .dockerignore

# Build local para debug
docker build -t propintel-api:test .
docker run -p 8080:8080 propintel-api:test
```

### ❌ Static Web App no desplega
1. Ir a https://portal.azure.com → urbia-web → Logs
2. Verificar que la rama `main` existe en GitHub
3. Verificar carpeta `propintel` tiene `package.json`

---

## 📞 URLs importantes

Después del despliegue:

```
Frontend: https://urbia-web.azurestaticapps.net
API:      https://urbia-api.azurewebsites.net
Portal:   https://portal.azure.com
Logs:     https://portal.azure.com → Application Insights → urbia-insights
```

---

## 🔐 Variables de entorno

Actualizar antes de desplegar (en `azure/parameters.json`):

```json
{
  "postgresqlPassword": "Cambiar_Por_ContrasenaSegura_12Chars_Min",
  "apiKey": "Cambiar_Por_API_Key_Produccion"
}
```

**Nunca** hacer commit de estas credenciales a Git.

---

## 📚 Recursos adicionales

- [Azure Bicep docs](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [PostgreSQL Flexible Server](https://learn.microsoft.com/azure/postgresql/flexible-server/)
- [Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/)
- [App Service](https://learn.microsoft.com/azure/app-service/)

---

**¿Preguntas?** Revisar logs:
```bash
az deployment group show --resource-group urbia-rg --name urbia-* --query 'properties.outputs' -o json
```
