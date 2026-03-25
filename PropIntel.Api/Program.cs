using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Auth;
using PropIntel.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// ── PostgreSQL ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<PropIntelDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("PropIntel"))
        .UseSnakeCaseNamingConvention()
);

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

// ── CORS — permite que Angular dev (localhost:4200) llame a la API ───────────
builder.Services.AddCors(opts =>
    opts.AddPolicy("dev", p =>
        p.WithOrigins("http://localhost:4200", "https://propintel.azurestaticapps.net")
         .AllowAnyHeader()
         .AllowAnyMethod()
    )
);

// ── API Key Authentication ────────────────────────────────────────────────────
builder.Services.AddAuthentication("ApiKey")
    .AddScheme<ApiKeyAuthOptions, ApiKeyAuthHandler>("ApiKey", _ => { });
builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("dev");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
