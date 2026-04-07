# 📁 Carpeta Azure: Infraestructura como Código (IaC)

## 📂 Contenido

```
azure/
├── main.bicep              # Definición de toda la infraestructura
├── parameters.json         # Parámetros para el despliegue
├── deploy.ps1              # Script PowerShell despliegue automático
└── DEPLOYMENT.md           # Guía completa paso a paso
```

---

## 🏗️ Qué se despliega

### **`main.bicep`** - Infraestructura completa
Recursos Azure que se crean:

1. **Static Web Apps** (Frontend Angular)
   - Dominio automático: `urbia-web.azurestaticapps.net`
   - Precio: **0 € (siempre gratis)**
   - Incluye CI/CD desde GitHub

2. **App Service + Plan B1** (API .NET)
   - URL: `urbia-api.azurewebsites.net`
   - Precio: **0 € durante 12 meses**, después ~47 €/mes
   - SKU: B1 (1 vCore, 1.75 GB RAM - pequeño pero suficiente)

3. **PostgreSQL Flexible Server**
   - Hostname: `urbia-db.postgres.database.azure.com`
   - Precio: **0 € durante 12 meses**, después ~30-70 €/mes
   - SKU: Standard_B1ms (pequeño pero escalable)
   - Backup incluido (7 días)

4. **Cosmos DB** (opcional, para migración futura)
   - Precio: **0 € (free tier 100 RU/s)**
   - Escalable después: ~10-50 €/mes
   - SQL API (compatible con queries SQL-like)

5. **Key Vault** (Gestión de secretos)
   - Almacena contraseñas de BD, API keys
   - Precio: ~0.6 € /mes

6. **Application Insights** (Monitoring)
   - Logs, tracing, alertas
   - Precio: Primeros 5GB gratis/mes

7. **Storage Account** (Logs, backups, CDN)
   - Precio: ~0.02-0.2 € /mes (según uso)

8. **VNet + Private DNS**
   - Seguridad: PostgreSQL en red privada
   - Precio: 0 € (incluido)

---

## ⚙️ Parámetros (`parameters.json`)

```json
{
  "projectName": "urbia",                    // Nombre del proyecto
  "location": "westeurope",                  // Región Azure
  "postgresqlUsername": "urbiaadmin",        // Usuario BD
  "postgresqlPassword": "CAMBIAR_AQUI",      // 📝 CAMBIAR ANTES DESPLEGAR
  "apiKey": "CAMBIAR_AQUI"                   // 📝 CAMBIAR ANTES DESPLEGAR
}
```

**Antes de desplegar:**
1. Cambiar `postgresqlPassword` por algo seguro (mínimo 12 caracteres, números + símbolos)
2. Cambiar `apiKey` por una clave aleatoria

---

## 🚀 Despliegue

### Opción 1: Automático (Recomendado)
```powershell
.\deploy.ps1 `
  -SubscriptionId "tu-subscription-id" `
  -PostgresPassword "ContrasenaSegura123!!" `
  -ApiKey "TuApiKey_Produccion"
```

### Opción 2: Manual
```bash
az deployment group create \
  --resource-group urbia-rg \
  --template-file main.bicep \
  --parameters parameters.json
```

---

## 💰 Línea de tiempo de costes

| Período | Frontend | API | BD PostgreSQL | Total |
|---------|----------|-----|---------------|-------|
| **Mes 1-3** | 0 € | 0 € | 0 € | **~0-5 €** (crédito 200 USD) |
| **Mes 4-12** | 0 € | 0 € | 0 € | **~0-5 €** (primeros 12 meses) |
| **Mes 13+** | 0 € | 47 € | 50 € | **~97-100 €** |

**Con Cosmos DB (en lugar de PostgreSQL):**
- Mes 1+: 0 € (free tier 100 RU/s)
- Después: 0-10 € (según escala)

---

## 🔧 Personalización

Editar `main.bicep` para:

- **Cambiar región:** `param location string = 'westeurope'` → `eastus`, `uksouth`, etc.
- **Cambiar SKU App Service:** `B1` → `B2`, `S1`, etc.
- **Cambiar SKU PostgreSQL:** `Standard_B1ms` → `Standard_B2s`, etc.
- **Habilitar Cosmos DB:** Cambiar `enableFreeTier: true`

---

## 📊 Outputs (después del despliegue)

Después de ejecutar, obtendrás:
```
resourceGroupName: urbia-rg
appServiceUrl: https://urbia-api.azurewebsites.net
staticWebAppUrl: urbia-web.azurestaticapps.net
postgresqlHostname: urbia-db.postgres.database.azure.com
cosmosDbEndpoint: https://urbia-cosmos.documents.azure.com
keyVaultName: urbia-kv-xxxxx
```

---

## 🔗 Enlaces útiles

- [Azure Portal](https://portal.azure.com)
- [Bicep Documentation](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Free Tier Details](https://azure.microsoft.com/free/)
- [Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)

---

**¿Problemas?** Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para troubleshooting.
