# Guía de despliegue: Railway + Vercel

## PASO 1 — Railway: API .NET + PostgreSQL

### 1.1 Crear cuenta y proyecto
1. Ve a https://railway.app → **Sign up** con GitHub
2. Activa el plan **Hobby** ($5/mes, necesitas tarjeta)
3. **New Project** → **Deploy from GitHub repo** → selecciona `PropIntel`

### 1.2 Configurar el servicio de la API
En el servicio que Railway crea automáticamente:
- **Settings → Root Directory**: `/` (raíz del repo, donde está el Dockerfile)
- Railway detecta el `Dockerfile` solo y construye la imagen

### 1.3 Añadir PostgreSQL
1. En tu proyecto Railway → **+ New** → **Database** → **PostgreSQL**
2. Espera a que arranque
3. Haz clic en el servicio PostgreSQL → **Connect** → copia la **Connection URL**
   Tendrá este formato: `postgresql://postgres:PASSWORD@HOST:PORT/railway`

### 1.4 Variables de entorno de la API
En el servicio de la API → **Variables** → añade:

```
ConnectionStrings__UrbIA=Host=HOST;Port=PORT;Database=railway;Username=postgres;Password=PASSWORD;SSL Mode=Require;
ApiKey=UrbIA-Prod-Temp-Key-2026
ASPNETCORE_ENVIRONMENT=Production
```

> Sustituye HOST, PORT, PASSWORD con los valores de la Connection URL de Railway PostgreSQL

### 1.5 Obtener la URL de la API
Una vez desplegado: **Settings → Networking → Public Domain**
Tendrá el formato: `https://ALGO.railway.app`

---

## PASO 2 — Actualizar URL en el frontend

Edita el archivo `propintel/src/environments/environment.production.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://TU-APP.railway.app/api',  // ← pon aquí tu URL de Railway
  apiKey: 'UrbIA-Prod-Temp-Key-2026',
  geminiApiKey: 'AIzaSyBR5ImZM-rsShEN1LRp336DlujstoBFzCI',
};
```

Haz commit y push de este cambio antes del siguiente paso.

---

## PASO 3 — Vercel: Frontend Angular

### 3.1 Crear cuenta
1. Ve a https://vercel.com → **Sign up** con GitHub

### 3.2 Importar proyecto
1. **New Project** → importa el repo `PropIntel`
2. **Root Directory**: `propintel` (la carpeta del Angular)
3. Framework: **Angular** (lo detecta automáticamente)
4. **Build Command**: `npm run build -- --configuration production`
5. **Output Directory**: `dist/propintel/browser`
6. Click **Deploy**

### 3.3 Verificar
- El `vercel.json` ya está configurado para el routing de Angular SPA
- Vercel te dará una URL del tipo `https://prop-intel.vercel.app`

---

## PASO 4 — Migrar base de datos (si tienes datos en Azure)

Si tienes datos que quieres conservar, edita y ejecuta el script:

```bash
# Edita migrate-db.sh con tus credenciales de Azure y Railway
# Luego ejecuta:
bash migrate-db.sh
```

Requisitos: tener instalado el cliente de PostgreSQL (`psql`, `pg_dump`)

---

## PASO 5 — Actualizar CORS con la URL final de Vercel (opcional)

Si tu dominio de Vercel es personalizado (no `.vercel.app`), añádelo en
`PropIntel.Api/Program.cs` en la sección de CORS.

---

## Resumen de archivos modificados

| Archivo | Cambio |
|---|---|
| `propintel/vercel.json` | Nuevo — routing SPA para Vercel |
| `railway.json` | Nuevo — configuración de build/deploy Railway |
| `Dockerfile` | PORT dinámico + healthcheck en /health |
| `PropIntel.Api/Program.cs` | CORS para Vercel/Railway + endpoint /health |
| `propintel/src/environments/environment.production.ts` | URL de Railway (debes rellenarla en PASO 2) |
| `migrate-db.sh` | Script de migración de BD Azure → Railway |
