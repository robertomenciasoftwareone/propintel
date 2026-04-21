using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Auth;
using PropIntel.Api.Data;
using PropIntel.Api.Models;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Construir connection string desde variables individuales para evitar
// problemas de parseo con Npgsql cuando hay variables de entorno con nombres
// que coinciden con parámetros de conexión (ej: ApiKey)
string pgConn;
var dbHost = Environment.GetEnvironmentVariable("DB_HOST");
if (!string.IsNullOrWhiteSpace(dbHost))
{
    var csb = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host     = dbHost,
        Port     = int.TryParse(Environment.GetEnvironmentVariable("DB_PORT"), out var p) ? p : 5432,
        Database = Environment.GetEnvironmentVariable("DB_NAME") ?? "railway",
        Username = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres",
        Password = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "",
    };
    pgConn = csb.ConnectionString;
}
else
{
    pgConn = builder.Configuration.GetConnectionString("UrbIA")
          ?? builder.Configuration.GetConnectionString("PropIntel")
          ?? "";
}

var useInMemory = string.IsNullOrWhiteSpace(pgConn)
    || pgConn.Contains("tu-servidor.postgres.database.azure.com", StringComparison.OrdinalIgnoreCase);

if (useInMemory)
{
    builder.Services.AddDbContext<PropIntelDbContext>(opts =>
        opts.UseInMemoryDatabase("propintel-fallback"));
}
else
{
    builder.Services.AddDbContext<PropIntelDbContext>(opts =>
        opts.UseNpgsql(pgConn)
            .UseSnakeCaseNamingConvention());
}

// ── Controllers + Swagger ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PropIntel API", Version = "v1" });
    c.AddSecurityDefinition("ApiKey", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "X-Api-Key",
        In   = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Description = "API Key requerida — header X-Api-Key",
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id   = "ApiKey"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── CORS — permite Angular local, Vercel y Railway ───────────────────────────
builder.Services.AddCors(opts =>
    opts.AddPolicy("dev", p =>
        p.SetIsOriginAllowed(origin =>
        {
            if (string.Equals(origin, "http://localhost:4200", StringComparison.OrdinalIgnoreCase))
                return true;

            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                return false;

            if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
                return false;

            return uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)
                || uri.Host.EndsWith(".railway.app", StringComparison.OrdinalIgnoreCase)
                || uri.Host.EndsWith(".azurestaticapps.net", StringComparison.OrdinalIgnoreCase);
        })
         .AllowAnyHeader()
         .AllowAnyMethod()
    )
);

// ── API Key Authentication ────────────────────────────────────────────────────
builder.Services.AddAuthentication("ApiKey")
    .AddScheme<ApiKeyAuthOptions, ApiKeyAuthHandler>("ApiKey", _ => { });
builder.Services.AddAuthorization();

var app = builder.Build();

// ── Schema bootstrap (compatibilidad mientras no haya migraciones EF formales) ──
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PropIntelDbContext>();

    if (useInMemory)
    {
        await db.Database.EnsureCreatedAsync();
        await SeedInMemoryFromJsonAsync(db, app.Logger);
    }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE anuncios
            ADD COLUMN IF NOT EXISTS canonical_key VARCHAR(200);

            CREATE INDEX IF NOT EXISTS ix_anuncios_canonical_key
            ON anuncios (canonical_key);

            CREATE TABLE IF NOT EXISTS analytics_eventos (
                id              BIGSERIAL PRIMARY KEY,
                evento          VARCHAR(120) NOT NULL,
                session_id      VARCHAR(120),
                user_email      VARCHAR(255),
                municipio       VARCHAR(120),
                barrio          VARCHAR(120),
                payload_json    TEXT,
                creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS ix_analytics_evento_fecha
            ON analytics_eventos (evento, creado_en DESC);

            CREATE TABLE IF NOT EXISTS newsletter_suscripciones (
                id                  BIGSERIAL PRIMARY KEY,
                email               VARCHAR(255) NOT NULL UNIQUE,
                nombre              VARCHAR(120),
                municipio_interes   VARCHAR(120),
                barrio_interes      VARCHAR(120),
                activa              BOOLEAN NOT NULL DEFAULT TRUE,
                creada_en           TIMESTAMP NOT NULL DEFAULT NOW(),
                actualizada_en      TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS ix_newsletter_activa
            ON newsletter_suscripciones (activa);

            CREATE TABLE IF NOT EXISTS usuarios (
                id            SERIAL PRIMARY KEY,
                email         VARCHAR(255) NOT NULL UNIQUE,
                nombre        VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255),
                creado_en     TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);
        ");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "No se pudo aplicar schema bootstrap al arrancar");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("dev");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.Run();

static async Task SeedInMemoryFromJsonAsync(PropIntelDbContext db, ILogger logger)
{
    if (await db.Anuncios.AnyAsync())
        return;

    var seedDir = Path.Combine(AppContext.BaseDirectory, "Seed");
    if (!Directory.Exists(seedDir))
    {
        logger.LogWarning("Seed directory no encontrada: {SeedDir}", seedDir);
        return;
    }

    var jsonOptions = new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true
    };

    var anunciosPath = Path.Combine(seedDir, "anuncios_fotocasa_madrid.json");
    if (File.Exists(anunciosPath))
    {
        var anunciosJson = await File.ReadAllTextAsync(anunciosPath);
        var anunciosSeed = JsonSerializer.Deserialize<List<AnuncioSeedDto>>(anunciosJson, jsonOptions) ?? [];
        foreach (var x in anunciosSeed)
        {
            db.Anuncios.Add(new Anuncio
            {
                IdExterno = x.IdExterno ?? string.Empty,
                Fuente = x.Fuente ?? "fotocasa",
                Url = x.Url ?? string.Empty,
                Titulo = x.Titulo,
                PrecioTotal = x.PrecioTotal,
                PrecioM2 = x.PrecioM2,
                SuperficieM2 = x.SuperficieM2,
                Habitaciones = x.Habitaciones,
                Ciudad = x.Ciudad ?? "madrid",
                Distrito = x.Distrito,
                TipoInmueble = x.TipoInmueble,
                Activo = x.Activo,
                FechaScraping = x.FechaScraping ?? DateTime.UtcNow,
                Cp = x.Cp,
                Lat = x.Lat,
                Lon = x.Lon,
                CanonicalKey = x.CanonicalKey,
            });
        }
    }

    var notarialPath = Path.Combine(seedDir, "datos_notariales_madrid.json");
    if (File.Exists(notarialPath))
    {
        var notarialesJson = await File.ReadAllTextAsync(notarialPath);
        var notarialesSeed = JsonSerializer.Deserialize<List<DatoNotarialSeedDto>>(notarialesJson, jsonOptions) ?? [];
        foreach (var x in notarialesSeed)
        {
            db.DatosNotariales.Add(new DatoNotarial
            {
                Ciudad = x.Ciudad ?? "madrid",
                Municipio = x.Municipio ?? "Madrid",
                CodigoPostal = x.CodigoPostal,
                PrecioMedioM2 = x.PrecioMedioM2,
                PrecioMinM2 = x.PrecioMinM2,
                PrecioMaxM2 = x.PrecioMaxM2,
                NumTransacciones = x.NumTransacciones,
                Periodo = x.Periodo ?? string.Empty,
                CreadoEn = x.CreadoEn ?? DateTime.UtcNow,
            });
        }
    }

    var gapsPath = Path.Combine(seedDir, "gaps_madrid.json");
    if (File.Exists(gapsPath))
    {
        var gapsJson = await File.ReadAllTextAsync(gapsPath);
        var gapsSeed = JsonSerializer.Deserialize<List<GapAnalisisSeedDto>>(gapsJson, jsonOptions) ?? [];
        foreach (var x in gapsSeed)
        {
            db.GapsAnalisis.Add(new GapAnalisis
            {
                Ciudad = x.Ciudad ?? "madrid",
                Zona = x.Zona ?? "Madrid",
                CodigoPostal = x.CodigoPostal,
                AskingMedioM2 = x.AskingMedioM2,
                NotarialMedioM2 = x.NotarialMedioM2,
                GapPct = x.GapPct,
                NumAnuncios = x.NumAnuncios,
                NumTransacciones = x.NumTransacciones,
                AskingIdealistaM2 = x.AskingIdealistaM2,
                AskingFotocasaM2 = x.AskingFotocasaM2,
                GapIdealistaPct = x.GapIdealistaPct,
                GapFotocasaPct = x.GapFotocasaPct,
                NumAnunciosIdealista = x.NumAnunciosIdealista,
                NumAnunciosFotocasa = x.NumAnunciosFotocasa,
                Periodo = x.Periodo ?? string.Empty,
                CalculadoEn = x.CalculadoEn ?? DateTime.UtcNow,
            });
        }
    }

    await db.SaveChangesAsync();
    logger.LogInformation("Seed in-memory aplicado: {Anuncios} anuncios, {Notariales} notariales, {Gaps} gaps",
        await db.Anuncios.CountAsync(),
        await db.DatosNotariales.CountAsync(),
        await db.GapsAnalisis.CountAsync());
}

file sealed class AnuncioSeedDto
{
    public string? IdExterno { get; set; }
    public string? Fuente { get; set; }
    public string? Url { get; set; }
    public string? Titulo { get; set; }
    public int PrecioTotal { get; set; }
    public double? PrecioM2 { get; set; }
    public double? SuperficieM2 { get; set; }
    public int? Habitaciones { get; set; }
    public string? Ciudad { get; set; }
    public string? Distrito { get; set; }
    public string? TipoInmueble { get; set; }
    public bool Activo { get; set; }
    public DateTime? FechaScraping { get; set; }
    public string? Cp { get; set; }
    public double? Lat { get; set; }
    public double? Lon { get; set; }
    public string? CanonicalKey { get; set; }
}

file sealed class DatoNotarialSeedDto
{
    public string? Ciudad { get; set; }
    public string? Municipio { get; set; }
    public string? CodigoPostal { get; set; }
    public double PrecioMedioM2 { get; set; }
    public double? PrecioMinM2 { get; set; }
    public double? PrecioMaxM2 { get; set; }
    public int NumTransacciones { get; set; }
    public string? Periodo { get; set; }
    public DateTime? CreadoEn { get; set; }
}

file sealed class GapAnalisisSeedDto
{
    public string? Ciudad { get; set; }
    public string? Zona { get; set; }
    public string? CodigoPostal { get; set; }
    public double AskingMedioM2 { get; set; }
    public double NotarialMedioM2 { get; set; }
    public double GapPct { get; set; }
    public int NumAnuncios { get; set; }
    public int NumTransacciones { get; set; }
    public double? AskingIdealistaM2 { get; set; }
    public double? AskingFotocasaM2 { get; set; }
    public double? GapIdealistaPct { get; set; }
    public double? GapFotocasaPct { get; set; }
    public int NumAnunciosIdealista { get; set; }
    public int NumAnunciosFotocasa { get; set; }
    public string? Periodo { get; set; }
    public DateTime? CalculadoEn { get; set; }
}
