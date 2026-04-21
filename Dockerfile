# Dockerfile para PropIntel.Api (.NET)
# Arquitectura multi-stage: build + runtime

# ──── STAGE 1: BUILD ────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiar archivos de proyecto
COPY ["PropIntel.Api/PropIntel.Api.csproj", "PropIntel.Api/"]
COPY ["PropIntel.Migration/PropIntel.Migration.csproj", "PropIntel.Migration/"]

# Restaurar dependencias
RUN dotnet restore "PropIntel.Api/PropIntel.Api.csproj"

# Copiar código fuente
COPY . .

# Compilar release
WORKDIR "/src/PropIntel.Api"
RUN dotnet build "PropIntel.Api.csproj" -c Release -o /app/build

# Publicar
RUN dotnet publish "PropIntel.Api.csproj" -c Release -o /app/publish

# ──── STAGE 2: RUNTIME ────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copiar archivos publicados desde BUILD
COPY --from=build /app/publish .

# Variables de entorno por defecto
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl --fail http://localhost:${PORT:-8080}/health || exit 1

EXPOSE 8080

# Entrypoint: Railway inyecta PORT en runtime, lo pasamos a ASPNETCORE_URLS
CMD sh -c "ASPNETCORE_URLS=http://+:${PORT:-8080} dotnet PropIntel.Api.dll"
