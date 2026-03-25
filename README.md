# PropIntel — Plataforma de Comparativa de Precios Inmobiliarios

**Asking Price (Idealista/Fotocasa) vs Precio Real Notarial**

Herramienta interna para identificar el gap entre el precio anunciado en portales y el precio real
escriturado ante notario. Útil para negociar compras, tasar propiedades y detectar oportunidades.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  FUENTES                                                     │
│  penotariado.com ──┐                                         │
│  Idealista        ─┼─▶  Python Scraper  ─▶  PostgreSQL      │
│  Fotocasa         ─┘    (Azure Function)    (Azure DB)       │
└──────────────────────────────────────────┬──────────────────┘
                                           │
                                    .NET 8 REST API
                                    (Azure App Service)
                                           │
                                    Angular 19 SPA
                                    (Azure Static Web Apps)
```

---

## Estructura del repositorio

```
propintel/              Angular 19 frontend
PropIntel.Api/          .NET 8 REST API
propintel-scraper/      Python scraper + Azure Function
.github/workflows/      CI/CD con GitHub Actions
```

---

## Arranque local — paso a paso

### 1. Base de datos PostgreSQL

Necesitas una instancia de PostgreSQL local o en Azure.

```bash
# Opción rápida con Docker
docker run -d \
  --name propintel-db \
  -e POSTGRES_DB=propintel \
  -e POSTGRES_USER=propintel_user \
  -e POSTGRES_PASSWORD=propintel_pass \
  -p 5432:5432 \
  postgres:16
```

### 2. Scraper Python — crear tablas y ejecutar

```bash
cd propintel-scraper

# Instalar dependencias
pip install -r requirements.txt
playwright install chromium   # navegador headless

# Configurar variables de entorno
cp .env.example .env
# → Edita .env con tu conexión PostgreSQL y SMTP

# Crear tablas en PostgreSQL
python main.py --init-db

# Ejecutar el ciclo completo (Asturias, 1 página — rápido para pruebas)
python main.py --ciudad asturias --paginas 1

# Modo scheduler diario (07:00 Madrid)
python main.py --scheduler
```

### 3. API .NET 8

```bash
cd PropIntel.Api

# Edita appsettings.json con tu connection string de PostgreSQL

dotnet run
# → API disponible en http://localhost:5000
# → Swagger en http://localhost:5000/swagger
```

**Endpoints principales:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/ciudades` | Resumen de todas las ciudades |
| GET | `/api/ciudades/{ciudad}/gaps` | Gaps por distrito |
| GET | `/api/ciudades/{ciudad}/historico` | Evolución 12 meses |
| GET | `/api/ciudades/{ciudad}/transacciones` | Últimos anuncios |
| GET | `/api/alertas` | Listar alertas |
| POST | `/api/alertas` | Crear alerta |
| PATCH | `/api/alertas/{id}/toggle` | Activar/pausar |
| DELETE | `/api/alertas/{id}` | Eliminar |
| GET | `/api/alertas/disparos` | Ver disparos |
| PATCH | `/api/alertas/disparos/leer-todos` | Marcar leídos |

### 4. Angular frontend

```bash
cd propintel

npm install
npm start
# → http://localhost:4200
```

El frontend usa **mock data por defecto**. Cuando la API esté disponible en
`http://localhost:5000`, los datos reales sustituyen automáticamente a los mocks
(fallback silencioso mediante `catchError`).

---

## Deploy en Azure

### Recursos necesarios

| Recurso | Tier recomendado | Coste aprox. |
|---------|-----------------|--------------|
| Azure Database for PostgreSQL Flexible | Burstable B1ms | ~15€/mes |
| Azure App Service (.NET API) | B1 | ~13€/mes |
| Azure Static Web Apps (Angular) | Free | 0€ |
| Azure Function App (Scraper) | Consumption | ~1€/mes |
| **Total** | | **~30€/mes** |

### Paso a paso

#### 1. Crear recursos en Azure

```bash
# Instala Azure CLI si no lo tienes
az login

GRUPO="propintel-rg"
LOCATION="westeurope"

# Grupo de recursos
az group create --name $GRUPO --location $LOCATION

# PostgreSQL
az postgres flexible-server create \
  --resource-group $GRUPO \
  --name propintel-db \
  --location $LOCATION \
  --admin-user propintel_admin \
  --admin-password "TU_PASSWORD_SEGURO" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --public-access 0.0.0.0

az postgres flexible-server db create \
  --resource-group $GRUPO \
  --server-name propintel-db \
  --database-name propintel

# App Service para la API .NET
az appservice plan create \
  --name propintel-plan \
  --resource-group $GRUPO \
  --sku B1 \
  --is-linux

az webapp create \
  --name propintel-api \
  --resource-group $GRUPO \
  --plan propintel-plan \
  --runtime "DOTNETCORE:8.0"

# Configurar connection string en App Service
az webapp config connection-string set \
  --name propintel-api \
  --resource-group $GRUPO \
  --connection-string-type PostgreSQL \
  --settings PropIntel="Host=propintel-db.postgres.database.azure.com;Database=propintel;Username=propintel_admin;Password=TU_PASSWORD_SEGURO;SSL Mode=Require;"

# Function App para el scraper Python
az storage account create \
  --name propintelscraper \
  --resource-group $GRUPO \
  --sku Standard_LRS

az functionapp create \
  --name propintel-scraper \
  --resource-group $GRUPO \
  --storage-account propintelscraper \
  --consumption-plan-location $LOCATION \
  --runtime python \
  --runtime-version 3.12 \
  --functions-version 4

# Static Web App para Angular
az staticwebapp create \
  --name propintel-web \
  --resource-group $GRUPO \
  --location $LOCATION
```

#### 2. Configurar GitHub Secrets

En tu repo → Settings → Secrets and variables → Actions:

| Secret | Cómo obtenerlo |
|--------|---------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Portal Azure → Static Web App → Manage deployment token |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Portal Azure → App Service → Get publish profile (XML completo) |
| `AZURE_FUNCTION_PUBLISH_PROFILE` | Portal Azure → Function App → Get publish profile |
| `AZURE_FUNCTION_KEY` | Portal Azure → Function App → Functions → ScraperHttp → Function Keys |
| `PROPINTEL_API_URL` | `https://propintel-api.azurewebsites.net/api` |

#### 3. Inicializar la BD en Azure

```bash
# Una vez con el scraper configurado en .env con la DB de Azure
python main.py --init-db

# Primera ejecución
python main.py --ciudad madrid --paginas 1
```

#### 4. Hacer push → deploy automático

```bash
git add .
git commit -m "feat: PropIntel v1.0"
git push origin main
# GitHub Actions despliega los 3 proyectos automáticamente
```

---

## Variables de entorno del scraper (.env)

```env
# PostgreSQL
DB_HOST=propintel-db.postgres.database.azure.com
DB_PORT=5432
DB_NAME=propintel
DB_USER=propintel_admin@propintel-db
DB_PASSWORD=TU_PASSWORD

# Azure Blob (snapshots raw — opcional)
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_CONTAINER_NAME=propintel-snapshots

# Email para alertas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuemail@gmail.com
SMTP_PASSWORD=tu_app_password    # App Password de Google

# Scraping
SCRAPER_DELAY_SECONDS=2.5        # pausa entre peticiones (respetar rate limits)
HEADLESS_BROWSER=true
SCRAPER_HORA_EJECUCION=07:00     # hora local Madrid
```

---

## Flujo de datos completo

```
07:00 cada día
     │
     ▼
Azure Function Timer
     │
     ├─▶ NotarialScraper (httpx + BS4)
     │     └─ penotariado.com → precio medio €/m² por municipio
     │
     ├─▶ IdealistaScraper (Playwright headless)
     │     └─ Idealista.com → anuncios con precio asking
     │
     ├─▶ GapCalculator
     │     ├─ Calcula gap% por zona (asking vs notarial)
     │     └─ Evalúa alertas de usuarios
     │
     ├─▶ EmailNotificador → email HTML a usuarios con oportunidades
     │
     └─▶ DBService (PostgreSQL)
           ├─ datos_notariales  (upsert por ciudad+periodo)
           ├─ anuncios          (insert nuevos)
           ├─ gap_analisis      (upsert por zona+periodo)
           └─ disparos_alertas  (insert)

Dashboard Angular (en tiempo real vía API .NET 8)
     ├─ /dashboard   → KPIs + gráfico asking vs notarial + gaps por distrito
     ├─ /historico   → tendencia 12 meses + tabla detallada
     └─ /alertas     → CRUD alertas + disparos recientes
```

---

## Roadmap sugerido

- [ ] Autenticación (Azure AD B2C o simple JWT)
- [ ] Módulo de Servicios — integración con tasadoras API
- [ ] Mapa interactivo con Leaflet (precio por CP sobre mapa)
- [ ] Fotocasa scraper (complementa Idealista)
- [ ] Exportación a PDF / Excel del informe por zona
- [ ] App móvil (Angular con Capacitor)

---

*Datos del Portal Estadístico del Notariado — públicos y anonimizados.*
*Asking prices de Idealista — datos públicos, scraping respetuoso de rate limits.*
