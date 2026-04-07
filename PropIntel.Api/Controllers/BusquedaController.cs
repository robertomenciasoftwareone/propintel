using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/busqueda")]
public class BusquedaController(PropIntelDbContext db) : ControllerBase
{
    private static readonly Random Rng = new();

    // GET /api/busqueda?municipio=madrid&precioMax=400000&barrio=salamanca&habitaciones=3&m2Min=60&...
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BusquedaResultadoDto>>> Buscar(
        [FromQuery] string municipio,
        [FromQuery] int precioMax,
        [FromQuery] string? barrio,
        [FromQuery] double? m2Min,
        [FromQuery] double? m2Max,
        [FromQuery] int? habitaciones,
        [FromQuery] int? banos,
        [FromQuery] bool? exterior,
        [FromQuery] bool? ascensor,
        [FromQuery] string? planta)
    {
        if (string.IsNullOrWhiteSpace(municipio) || precioMax <= 0)
            return BadRequest("municipio y precioMax son obligatorios.");

        var ciudadNorm = municipio.ToLowerInvariant().Trim();
        var isNpgsql = db.Database.IsNpgsql();

        var query = db.Anuncios
            .Where(a => a.Activo && a.PrecioTotal <= precioMax);

        if (isNpgsql)
        {
            query = query.Where(a => a.Ciudad == ciudadNorm || EF.Functions.ILike(a.Ciudad, ciudadNorm));
        }
        else
        {
            query = query.Where(a => (a.Ciudad ?? string.Empty).ToLower() == ciudadNorm);
        }

        if (!string.IsNullOrWhiteSpace(barrio))
        {
            var barrioNorm = barrio.Trim().ToLowerInvariant();
            query = isNpgsql
                ? query.Where(a => EF.Functions.ILike(a.Distrito ?? "", $"%{barrioNorm}%"))
                : query.Where(a => (a.Distrito ?? string.Empty).ToLower().Contains(barrioNorm));
        }

        if (m2Min.HasValue)
            query = query.Where(a => a.SuperficieM2 >= m2Min.Value);

        if (m2Max.HasValue)
            query = query.Where(a => a.SuperficieM2 <= m2Max.Value);

        if (habitaciones.HasValue)
            query = query.Where(a => a.Habitaciones >= habitaciones.Value);

        var anunciosRaw = await query
            .OrderByDescending(a => a.FechaScraping)
            .Take(200)
            .ToListAsync();

        var anuncios = anunciosRaw
            .GroupBy(a =>
                !string.IsNullOrWhiteSpace(a.CanonicalKey)
                    ? a.CanonicalKey!
                    : BuildFallbackKey(a))
            .Select(g => g
                .OrderByDescending(x => x.FechaScraping)
                .ThenBy(x => x.PrecioTotal)
                .First())
            .ToList();

        // Obtener precios notariales y de gaps para calcular precio medio zona
        var zonas = anuncios.Select(a => a.Distrito ?? ciudadNorm).Distinct().ToList();

        var notariales = await db.DatosNotariales
            .Where(d => d.Ciudad == ciudadNorm)
            .OrderByDescending(d => d.Periodo)
            .ToListAsync();

        var gaps = await db.GapsAnalisis
            .Where(g => g.Ciudad == ciudadNorm)
            .OrderByDescending(g => g.Periodo)
            .ToListAsync();

        // Determinar si el usuario está autenticado (header X-User-Email presente)
        var userEmail = Request.Headers["X-User-Email"].FirstOrDefault();
        var isAuthenticated = !string.IsNullOrEmpty(userEmail);

        var resultados = anuncios.Select(a =>
        {
            var zona = a.Distrito ?? ciudadNorm;

            // Precio notarial para la zona
            var notarial = notariales.FirstOrDefault(n => n.Municipio == zona)
                        ?? notariales.FirstOrDefault();
            var notarialM2 = notarial?.PrecioMedioM2 ?? 0;

            // Asking medio de la zona (desde gaps)
            var gap = gaps.FirstOrDefault(g => g.Zona == zona)
                   ?? gaps.FirstOrDefault();
            var askingMedioM2 = gap?.AskingMedioM2 ?? (a.PrecioM2 ?? 0);

            // Precio medio zona = media simple de notarial + asking
            var precioMedioZona = (notarialM2 > 0 && askingMedioM2 > 0)
                ? (notarialM2 + askingMedioM2) / 2.0
                : (notarialM2 > 0 ? notarialM2 : askingMedioM2);

            var precioM2 = a.PrecioM2 ?? (a.SuperficieM2 > 0 ? a.PrecioTotal / (double)a.SuperficieM2 : 0);
            var semaforoPct = precioMedioZona > 0
                ? ((precioM2 - precioMedioZona) / precioMedioZona) * 100.0
                : 0;

            var semaforoColor = semaforoPct >= 5.0 ? "rojo"
                : semaforoPct <= -5.0 ? "verde"
                : "amarillo";

            // Coordenadas: usar las del registro si existen, si no usar centroide del distrito
            double baseLat, baseLon;
            if (a.Lat.HasValue && a.Lat.Value != 0 && a.Lon.HasValue && a.Lon.Value != 0)
            {
                baseLat = a.Lat.Value;
                baseLon = a.Lon.Value;
            }
            else
            {
                var centroide = GetDistritoCentroide(a.Distrito ?? "", ciudadNorm);
                baseLat = centroide.lat;
                baseLon = centroide.lon;
            }
            // Ofuscar coordenadas para usuarios no autenticados (+/- ~200m) y añadir
            // dispersión para que no se solapen los markers en el mismo punto
            double latAprox = baseLat + (Rng.NextDouble() - 0.5) * 0.006;
            double lonAprox = baseLon + (Rng.NextDouble() - 0.5) * 0.008;

            return new BusquedaResultadoDto(
                Id: a.Id,
                LatAprox: latAprox,
                LonAprox: lonAprox,
                LatExacta: isAuthenticated ? a.Lat : null,
                LonExacta: isAuthenticated ? a.Lon : null,
                PrecioTotal: a.PrecioTotal,
                PrecioM2: a.PrecioM2,
                SuperficieM2: a.SuperficieM2,
                Habitaciones: a.Habitaciones,
                TipoInmueble: a.TipoInmueble,
                Titulo: isAuthenticated ? a.Titulo : null,
                Fuente: isAuthenticated ? a.Fuente : null,
                Url: isAuthenticated ? a.Url : null,
                Distrito: a.Distrito,
                SemaforoColor: semaforoColor,
                SemaforoPct: Math.Round(semaforoPct, 1),
                PrecioMedioZona: Math.Round(precioMedioZona, 0)
            );
        }).ToList();

        return Ok(resultados);
    }

    // Centroides aproximados de distritos de Madrid (lat, lon)
    private static readonly Dictionary<string, (double lat, double lon)> DistritosMADRID = new(StringComparer.OrdinalIgnoreCase)
    {
        ["centro"]              = (40.4168, -3.7038),
        ["arganzuela"]          = (40.3997, -3.6983),
        ["retiro"]              = (40.4090, -3.6817),
        ["salamanca"]           = (40.4320, -3.6784),
        ["chamartin"]           = (40.4600, -3.6770),
        ["chamartín"]           = (40.4600, -3.6770),
        ["tetuan"]              = (40.4620, -3.7060),
        ["tetuán"]              = (40.4620, -3.7060),
        ["chamberi"]            = (40.4360, -3.7050),
        ["chamberí"]            = (40.4360, -3.7050),
        ["fuencarral-el pardo"] = (40.5000, -3.7100),
        ["fuencarral"]          = (40.5000, -3.7100),
        ["moncloa-aravaca"]     = (40.4320, -3.7520),
        ["moncloa"]             = (40.4320, -3.7520),
        ["latina"]              = (40.4050, -3.7380),
        ["carabanchel"]         = (40.3820, -3.7230),
        ["usera"]               = (40.3900, -3.7070),
        ["puente de vallecas"]  = (40.3940, -3.6620),
        ["vallecas"]            = (40.3940, -3.6620),
        ["moratalaz"]           = (40.4050, -3.6460),
        ["ciudad lineal"]       = (40.4380, -3.6560),
        ["hortaleza"]           = (40.4700, -3.6460),
        ["vicalvaro"]           = (40.4070, -3.6030),
        ["vicálvaro"]           = (40.4070, -3.6030),
        ["san blas-canillejas"] = (40.4350, -3.6140),
        ["san blas"]            = (40.4350, -3.6140),
        ["barajas"]             = (40.4770, -3.5830),
        ["villa de vallecas"]   = (40.3710, -3.6280),
        ["villaverde"]          = (40.3490, -3.7080),
    };

    // Centroides para otras ciudades (centroide del municipio)
    private static readonly Dictionary<string, (double lat, double lon)> MunicipiosCentroid = new(StringComparer.OrdinalIgnoreCase)
    {
        ["madrid"]              = (40.4168, -3.7038),
        ["alcala de henares"]   = (40.4817, -3.3639),
        ["alcobendas"]          = (40.5473, -3.6407),
        ["alcorcon"]            = (40.3493, -3.8257),
        ["mostoles"]            = (40.3222, -3.8640),
        ["leganes"]             = (40.3282, -3.7637),
        ["getafe"]              = (40.3058, -3.7326),
        ["fuenlabrada"]         = (40.2841, -3.7943),
        ["pozuelo de alarcon"]  = (40.4368, -3.8138),
        ["las rozas"]           = (40.4945, -3.8726),
        ["majadahonda"]         = (40.4720, -3.8723),
        ["boadilla del monte"]  = (40.4048, -3.8775),
    };

    private static (double lat, double lon) GetDistritoCentroide(string distrito, string ciudad)
    {
        var key = distrito.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(key) && DistritosMADRID.TryGetValue(key, out var dc))
            return dc;

        var ciudadKey = ciudad.Trim().ToLowerInvariant();
        if (MunicipiosCentroid.TryGetValue(ciudadKey, out var mc))
            return mc;

        return (40.4168, -3.7038); // Madrid centro como fallback
    }

    private static string BuildFallbackKey(Anuncio a)
    {
        var ciudad = (a.Ciudad ?? "").Trim().ToLowerInvariant();
        var distrito = (a.Distrito ?? "").Trim().ToLowerInvariant();
        var m2 = a.SuperficieM2.HasValue ? Math.Round(a.SuperficieM2.Value / 5.0) * 5 : 0;
        var hab = a.Habitaciones ?? 0;
        var precioK = (int)Math.Round(a.PrecioTotal / 5000.0);
        return $"{ciudad}|{distrito}|m2:{m2}|h:{hab}|p:{precioK}";
    }
}

public record BusquedaResultadoDto(
    int Id,
    double LatAprox,
    double LonAprox,
    double? LatExacta,
    double? LonExacta,
    int PrecioTotal,
    double? PrecioM2,
    double? SuperficieM2,
    int? Habitaciones,
    string? TipoInmueble,
    string? Titulo,
    string? Fuente,
    string? Url,
    string? Distrito,
    string SemaforoColor,
    double SemaforoPct,
    double PrecioMedioZona
);
