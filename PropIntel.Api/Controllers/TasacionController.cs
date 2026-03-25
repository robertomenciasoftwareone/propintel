using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

/// <summary>
/// Motor de Valoración Automatizada (AVM) basado en datos propios de Catastro,
/// Portal Notarial e Idealista/Fotocasa.
/// Preparado para conectar tasadoras comerciales (Tinsa, Gloval) vía interfaz.
/// </summary>
[Authorize]
[ApiController]
[Route("api/tasacion")]
public class TasacionController : ControllerBase
{
    private readonly PropIntelDbContext _db;

    public TasacionController(PropIntelDbContext db) => _db = db;

    // POST /api/tasacion/estimar
    /// <summary>
    /// Calcula una estimación AVM del valor de mercado de un inmueble.
    /// Combina medianas de anuncios activos del vecindario + datos notariales.
    /// </summary>
    [HttpPost("estimar")]
    public async Task<ActionResult<EstimacionAvmDto>> Estimar([FromBody] EstimacionRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Ciudad))
            return BadRequest(new { error = "El campo ciudad es obligatorio" });

        var ciudadNorm = req.Ciudad.ToLowerInvariant().Trim();

        // 1. Precio notarial medio de la ciudad/zona
        var notarialQuery = _db.DatosNotariales
            .Where(d => d.Ciudad.ToLower() == ciudadNorm)
            .OrderByDescending(d => d.Periodo);

        double? precioNotarial = null;
        var notarial = await notarialQuery.FirstOrDefaultAsync();
        precioNotarial = notarial?.PrecioMedioM2;

        // 2. Anuncios comparables (misma ciudad, activos, precio_m2 conocido)
        var anunciosBase = _db.Anuncios
            .Where(a => a.Activo
                     && a.Ciudad.ToLower() == ciudadNorm
                     && a.PrecioM2 != null
                     && a.PrecioM2 > 0);

        // Filtrar por habitaciones si se especifica (±1)
        if (req.Habitaciones.HasValue)
        {
            anunciosBase = anunciosBase.Where(a =>
                a.Habitaciones == null ||
                Math.Abs(a.Habitaciones.Value - req.Habitaciones.Value) <= 1);
        }

        var comparablesRaw = await anunciosBase
            .Select(a => new
            {
                a.Id,
                a.PrecioM2,
                a.SuperficieM2,
                a.Habitaciones,
                a.Distrito,
                a.Fuente,
                a.Url,
                a.Lat,
                a.Lon,
            })
            .ToListAsync();

        // Si tenemos coordenadas, filtrar por radio ~1km
        List<ComparableDto> comparables;
        if (req.Lat.HasValue && req.Lon.HasValue)
        {
            comparables = comparablesRaw
                .Where(a => a.Lat.HasValue && a.Lon.HasValue)
                .Select(a =>
                {
                    var dist = HaversineM(req.Lat.Value, req.Lon.Value, a.Lat!.Value, a.Lon!.Value);
                    return new { a, dist };
                })
                .Where(x => x.dist <= 1500)
                .OrderBy(x => x.dist)
                .Take(20)
                .Select(x => new ComparableDto(
                    Id:           x.a.Id,
                    PrecioM2:     x.a.PrecioM2!.Value,
                    SuperficieM2: x.a.SuperficieM2,
                    Habitaciones: x.a.Habitaciones,
                    Distrito:     x.a.Distrito,
                    Fuente:       x.a.Fuente,
                    Url:          x.a.Url,
                    DistanciaM:   Math.Round(x.dist, 0)
                ))
                .ToList();
        }
        else
        {
            // Sin coordenadas: tomamos muestra aleatoria de la ciudad
            comparables = comparablesRaw
                .OrderBy(_ => Guid.NewGuid())
                .Take(20)
                .Select(a => new ComparableDto(
                    Id:           a.Id,
                    PrecioM2:     a.PrecioM2!.Value,
                    SuperficieM2: a.SuperficieM2,
                    Habitaciones: a.Habitaciones,
                    Distrito:     a.Distrito,
                    Fuente:       a.Fuente,
                    Url:          a.Url,
                    DistanciaM:   0
                ))
                .ToList();
        }

        if (comparables.Count == 0 && precioNotarial == null)
            return NotFound(new { error = "Sin datos suficientes para estimar valor en esta ciudad" });

        // 3. Calcular estimación AVM
        var precios = comparables.Select(c => c.PrecioM2).ToList();
        if (precios.Count == 0 && precioNotarial.HasValue)
            precios = [precioNotarial.Value];

        precios.Sort();
        var mediana   = Mediana(precios);
        var p25       = Percentil(precios, 0.25);
        var p75       = Percentil(precios, 0.75);

        // Combinar asking con notarial (peso 60/40 si tenemos ambos)
        double precioBase;
        string metodo;
        if (precioNotarial.HasValue && precios.Count > 0)
        {
            precioBase = mediana * 0.6 + precioNotarial.Value * 0.4;
            metodo = $"AVM combinado: {comparables.Count} comparables asking (peso 60%) + datos notariales (peso 40%)";
        }
        else if (precios.Count > 0)
        {
            precioBase = mediana;
            metodo = $"AVM basado en {comparables.Count} comparables de mercado activos";
        }
        else
        {
            precioBase = precioNotarial!.Value;
            metodo = "AVM basado en precio notarial medio de la zona";
        }

        var superficie = req.Superficie ?? 80.0;
        var estimado   = Math.Round(precioBase * superficie, 0);
        var rangoMin   = Math.Round(p25 * superficie, 0);
        var rangoMax   = Math.Round(p75 * superficie, 0);

        var dto = new EstimacionAvmDto(
            PrecioEstimado:    estimado,
            RangoMin:          rangoMin,
            RangoMax:          rangoMax,
            ComparablesUsados: comparables.Count,
            Metodologia:       metodo,
            ValorCatastral:    null, // Se completa en frontend tras llamar a /catastro/ficha
            PrecioNotarial:    precioNotarial.HasValue ? Math.Round(precioNotarial.Value * superficie, 0) : null,
            Comparables:       comparables.Take(5).ToList()
        );

        return Ok(dto);
    }

    // GET /api/tasacion/comparables?lat=40.4168&lon=-3.7038&radio=500
    /// <summary>
    /// Devuelve anuncios activos dentro del radio (metros) ordenados por distancia.
    /// </summary>
    [HttpGet("comparables")]
    public async Task<ActionResult<List<ComparableDto>>> GetComparables(
        [FromQuery] double lat,
        [FromQuery] double lon,
        [FromQuery] int radio = 500)
    {
        if (lat < 27 || lat > 44 || lon < -19 || lon > 5)
            return BadRequest(new { error = "Coordenadas fuera del rango de España" });

        radio = Math.Clamp(radio, 100, 5000);

        var anuncios = await _db.Anuncios
            .Where(a => a.Activo && a.PrecioM2 != null && a.Lat != null && a.Lon != null)
            .Select(a => new
            {
                a.Id, a.PrecioM2, a.SuperficieM2, a.Habitaciones,
                a.Distrito, a.Fuente, a.Url, a.Lat, a.Lon
            })
            .ToListAsync();

        var resultado = anuncios
            .Select(a =>
            {
                var dist = HaversineM(lat, lon, a.Lat!.Value, a.Lon!.Value);
                return new { a, dist };
            })
            .Where(x => x.dist <= radio)
            .OrderBy(x => x.dist)
            .Take(30)
            .Select(x => new ComparableDto(
                Id:           x.a.Id,
                PrecioM2:     x.a.PrecioM2!.Value,
                SuperficieM2: x.a.SuperficieM2,
                Habitaciones: x.a.Habitaciones,
                Distrito:     x.a.Distrito,
                Fuente:       x.a.Fuente,
                Url:          x.a.Url,
                DistanciaM:   Math.Round(x.dist, 0)
            ))
            .ToList();

        return Ok(resultado);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static double HaversineM(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000; // metros
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double ToRad(double deg) => deg * Math.PI / 180;

    private static double Mediana(List<double> sorted) =>
        sorted.Count % 2 == 0
            ? (sorted[sorted.Count / 2 - 1] + sorted[sorted.Count / 2]) / 2.0
            : sorted[sorted.Count / 2];

    private static double Percentil(List<double> sorted, double p)
    {
        if (sorted.Count == 0) return 0;
        var idx = (int)Math.Floor(p * (sorted.Count - 1));
        return sorted[Math.Clamp(idx, 0, sorted.Count - 1)];
    }
}
