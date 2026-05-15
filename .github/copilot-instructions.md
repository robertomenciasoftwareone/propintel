# PropIntel — Copilot Instructions

## Proyecto

PropIntel es una plataforma inmobiliaria española que compara el **precio anunciado** (Idealista/Fotocasa) con el **precio real escriturado** ante notario. Permite detectar el gap de negociación, tasar propiedades y encontrar oportunidades de inversión.

## Arquitectura

| Capa | Tecnología | Ubicación |
|------|-----------|-----------|
| Frontend SPA | Angular 19 (standalone components) | `propintel/` |
| REST API | .NET 8 (C#), EF Core, PostgreSQL | `PropIntel.Api/` |
| Scraper / ETL | Python 3.12, Playwright, Azure Function | `propintel-scraper/` |
| Base de datos | PostgreSQL 16 (Azure DB / Railway) | — |
| Infraestructura | Azure App Service, Static Web Apps, Azure Functions | `azure/` |

## Convenciones por capa

### Angular (`propintel/src/app/`)

- **Componentes standalone** (`standalone: true`), sin NgModules.
- **Signals** (`signal()`, `computed()`, `effect()`) para estado local; evitar `Subject`/`BehaviorSubject` salvo en servicios compartidos.
- Archivos por feature en `features/<nombre>/`, servicios en `core/services/`, modelos en `core/models/`.
- Estilos con **SCSS**; usar variables del design system definidas en `styles-design-system.scss`.
- Rutas en `app.routes.ts` con lazy loading: `loadComponent(() => import(...))`.
- Llamadas HTTP siempre a través de servicios en `core/`; nunca `HttpClient` directo en componentes.
- Nombres en **camelCase** para variables/métodos, **PascalCase** para clases e interfaces.

### .NET API (`PropIntel.Api/`)

- Controllers finos: lógica de negocio en servicios o directamente en EF Core queries.
- EF Core con **snake_case naming convention** (`UseSnakeCaseNamingConvention()`).
- Entidades en `Models/Entities.cs`; los `[Table("nombre")]` usan nombres en **snake_case**.
- Conexión a BD construida desde variables de entorno individuales: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- Autenticación por **API Key** en header `X-Api-Key` (ver `Auth/ApiKeyAuthHandler.cs`).
- Fallback a base de datos en memoria (`UseInMemoryDatabase`) cuando no hay conexión configurada.
- Respuestas en **camelCase** (configurado en `AddControllers()`).
- Idioma del código: español para nombres de dominio (municipio, anuncio, tasación…), inglés para infraestructura (controller, service, handler…).

### Python Scraper (`propintel-scraper/`)

- Configuración centralizada en `config/settings.py` via `pydantic_settings`; usar variables de entorno con prefijo vacío.
- Modelos de BD en `models/db_models.py` (SQLAlchemy), esquemas Pydantic en `models/schemas.py`.
- Servicios de acceso a BD en `services/db_service.py`.
- Scrapers en `scrapers/`; cada scraper tiene su propio archivo.
- Respetar los delays configurados (`scraper_min_delay_seconds` / `scraper_max_delay_seconds`) para evitar bloqueos.
- Playwright en modo headless; capturar snapshots HTML en Azure Blob cuando `azure_storage_connection_string` está definido.
- Logging con el módulo estándar `logging`; nunca `print()` en producción.

## Base de datos (PostgreSQL)

- Tablas principales: `municipios`, `datos_notariales`, `anuncios`, `estadisticas_macro`, `codigos_postales`, `alertas`.
- Nombres de tabla y columna en **snake_case**.
- Migraciones en `propintel-scraper/scripts/`.
- Nunca hardcodear credenciales; siempre desde variables de entorno.

## Variables de entorno clave

```
# API (.NET)
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
API_KEY           # header X-Api-Key

# Scraper (Python)
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
IDEALISTA_API_KEY, IDEALISTA_API_SECRET
AZURE_STORAGE_CONNECTION_STRING
SMTP_USER, SMTP_PASSWORD
```

## Reglas generales

- **No** añadir comentarios obvios ni docstrings a código que no se modifica.
- **No** crear helpers abstractos para operaciones de un solo uso.
- Mínimo código nuevo: preferir soluciones pequeñas y directas.
- Manejar errores solo en los límites del sistema (controllers, entry points del scraper).
- Al generar endpoints nuevos, seguir el patrón de los controllers existentes (inyección de `PropIntelDbContext` por constructor, retorno `IActionResult` o `ActionResult<T>`).
- Al generar componentes Angular nuevos, usar el patrón standalone con signals.
- Los textos de UI están en **español** (es-ES).
