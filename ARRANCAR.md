# PropIntel — Cómo arrancar el proyecto

## Orden correcto de arranque

```
1. PostgreSQL  →  2. Backend (.NET)  →  3. Frontend (Angular)
```

---

## 1. PostgreSQL (Base de datos)

### Tu setup: Docker (contenedor `propintel-pg`)

```bash
docker start propintel-pg
```

✅ Listo cuando veas el contenedor en estado `running`:
```bash
docker ps | grep propintel-pg
```

> Si el contenedor no existe (primera vez):
```bash
docker run -d --name propintel-pg \
  -e POSTGRES_DB=propintel \
  -e POSTGRES_USER=propintel_user \
  -e POSTGRES_PASSWORD=local123 \
  -p 5432:5432 postgres:16
```
> Luego crear las tablas (solo la primera vez):
```bash
docker exec -i propintel-pg psql -U propintel_user -d propintel < C:\Proyectos\PropIntel\propintel-scraper\scripts\init_db.sql
```

---

## 2. Backend (.NET API)

> ⚠️ IMPORTANTE: usar `ASPNETCORE_ENVIRONMENT=Development` para que cargue la API key correcta

### Windows CMD:
```cmd
cd C:\Proyectos\PropIntel\PropIntel.Api
set ASPNETCORE_ENVIRONMENT=Development
dotnet run --urls "http://localhost:5050"
```

### Windows PowerShell:
```powershell
cd C:\Proyectos\PropIntel\PropIntel.Api
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --urls "http://localhost:5050"
```

### Git Bash / WSL:
```bash
cd "c:/Proyectos/PropIntel/PropIntel.Api"
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls "http://localhost:5050"
```

✅ Listo cuando veas: `Now listening on: http://localhost:5050`

### Verificar:
```bash
curl -H "X-Api-Key: dev-propintel-key-2026" http://localhost:5050/api/ciudades/madrid/mapa
```

---

## 3. Frontend (Angular)

```bash
cd C:\Proyectos\PropIntel\propintel
npm start
```

✅ Listo cuando veas: `Application bundle generation complete`
🌐 Abrir en: http://localhost:4200

---

## 4. Scraper (Python) — opcional, para cargar viviendas

### Ciclo completo (Notarial + Fotocasa + Gaps)
```bash
cd C:\Proyectos\PropIntel\propintel-scraper
.venv\Scripts\python.exe main.py
```

### Solo Fotocasa (funciona de día, más rápido)
```bash
cd C:\Proyectos\PropIntel\propintel-scraper
.venv\Scripts\python.exe -c "
import asyncio
from scrapers.fotocasa_scraper import run_fotocasa_scraper
from services.db_service import DBService

async def main():
    db = DBService()
    anuncios = await run_fotocasa_scraper(max_paginas=10)
    guardados = db.guardar_anuncios(anuncios)
    print(f'{len(anuncios)} scrapeados, {guardados} nuevos guardados')

asyncio.run(main())
"
```

### Solo Idealista (lanzar de madrugada, de día bloquea la IP)
```bash
cd C:\Proyectos\PropIntel\propintel-scraper
.venv\Scripts\python.exe -c "
import asyncio
from scrapers.idealista_scraper import run_idealista_scraper
from services.db_service import DBService

async def main():
    db = DBService()
    anuncios = await run_idealista_scraper(max_paginas=3)
    guardados = db.guardar_anuncios(anuncios)
    print(f'{len(anuncios)} scrapeados, {guardados} nuevos guardados')

asyncio.run(main())
"
```

---

## Resumen de puertos y credenciales

| Servicio | URL / Puerto | Credencial |
|----------|-------------|------------|
| Frontend | http://localhost:4200 | — |
| Backend | http://localhost:5050 | API Key: `dev-propintel-key-2026` |
| PostgreSQL | localhost:5432 | user: `propintel_user` / pass: `local123` / db: `propintel` |

---

## Solución de problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| Mapa muestra 0 viviendas | Back no levantado o BD vacía | Arrancar back + lanzar scraper Fotocasa |
| `Invalid API key` en el back | Falta `ASPNETCORE_ENVIRONMENT=Development` | Añadir variable antes de `dotnet run` |
| `Failed to connect to 127.0.0.1:5432` | PostgreSQL no está corriendo | Arrancar PostgreSQL primero |
| Idealista bloquea con CAPTCHA | IP marcada | Esperar 4-24h y lanzar de madrugada |
| Front no actualiza cambios | Caché de Angular | Parar `npm start` y relanzar |
