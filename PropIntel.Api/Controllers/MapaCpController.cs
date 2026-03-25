using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

/// <summary>
/// Endpoints para la capa de precio por código postal en el mapa interactivo.
/// </summary>
[Authorize]
[ApiController]
[Route("api/mapa")]
public class MapaCpController : ControllerBase
{
    private readonly PropIntelDbContext _db;

    public MapaCpController(PropIntelDbContext db) => _db = db;

    // GET /api/mapa/cp?ciudad=Madrid
    /// <summary>
    /// Devuelve el precio medio por m² agrupado por código postal para una ciudad.
    /// Se usa para pintar la capa coropleta/marcadores CP en el mapa Leaflet.
    /// </summary>
    [HttpGet("cp")]
    public async Task<ActionResult<List<PrecioCpDto>>> GetPreciosPorCp([FromQuery] string ciudad)
    {
        if (string.IsNullOrWhiteSpace(ciudad))
            return BadRequest(new { error = "El parámetro ciudad es obligatorio" });

        var ciudadNorm = ciudad.ToLowerInvariant().Trim();

        // Agrupamos anuncios activos con CP conocido
        var grupos = await _db.Anuncios
            .Where(a => a.Activo
                     && a.Ciudad.ToLower() == ciudadNorm
                     && a.Cp != null
                     && a.PrecioM2 != null
                     && a.PrecioM2 > 0)
            .GroupBy(a => a.Cp!)
            .Select(g => new
            {
                Cp           = g.Key,
                PrecioM2     = g.Average(a => a.PrecioM2!.Value),
                NumAnuncios  = g.Count(),
            })
            .Where(g => g.NumAnuncios >= 1)
            .ToListAsync();

        if (grupos.Count == 0)
            return Ok(new List<PrecioCpDto>());

        // Obtenemos coordenadas desde tabla codigos_postales
        var cps = grupos.Select(g => g.Cp).ToList();
        var coordDict = await _db.CodigosPostales
            .Where(c => cps.Contains(c.Cp))
            .ToDictionaryAsync(c => c.Cp, c => c);

        // Calculamos gap medio si hay datos de gap_analisis
        var gapDict = await _db.GapsAnalisis
            .Where(g => g.Ciudad.ToLower() == ciudadNorm
                     && g.CodigoPostal != null
                     && cps.Contains(g.CodigoPostal!))
            .GroupBy(g => g.CodigoPostal!)
            .Select(g => new { Cp = g.Key, GapPct = g.Average(x => x.GapPct) })
            .ToDictionaryAsync(g => g.Cp, g => g.GapPct);

        var resultado = grupos
            .Select(g =>
            {
                coordDict.TryGetValue(g.Cp, out var coord);
                gapDict.TryGetValue(g.Cp, out var gap);
                return new PrecioCpDto(
                    Cp:          g.Cp,
                    Lat:         coord?.Lat,
                    Lon:         coord?.Lon,
                    PrecioM2:    Math.Round(g.PrecioM2, 0),
                    NumAnuncios: g.NumAnuncios,
                    GapPct:      gap == 0 ? null : Math.Round(gap, 1),
                    Nombre:      coord?.Nombre
                );
            })
            .Where(d => d.Lat.HasValue && d.Lon.HasValue)
            .OrderByDescending(d => d.NumAnuncios)
            .ToList();

        return Ok(resultado);
    }

    // GET /api/mapa/cp/todas
    /// <summary>
    /// Devuelve precios por CP de todas las ciudades (para vista nacional).
    /// </summary>
    [HttpGet("cp/todas")]
    public async Task<ActionResult<List<PrecioCpDto>>> GetPreciosPorCpTodas()
    {
        var grupos = await _db.Anuncios
            .Where(a => a.Activo
                     && a.Cp != null
                     && a.PrecioM2 != null
                     && a.PrecioM2 > 0)
            .GroupBy(a => a.Cp!)
            .Select(g => new
            {
                Cp          = g.Key,
                PrecioM2    = g.Average(a => a.PrecioM2!.Value),
                NumAnuncios = g.Count(),
            })
            .Where(g => g.NumAnuncios >= 2)
            .ToListAsync();

        if (grupos.Count == 0)
            return Ok(new List<PrecioCpDto>());

        var cps = grupos.Select(g => g.Cp).ToList();
        var coordDict = await _db.CodigosPostales
            .Where(c => cps.Contains(c.Cp))
            .ToDictionaryAsync(c => c.Cp, c => c);

        var resultado = grupos
            .Select(g =>
            {
                coordDict.TryGetValue(g.Cp, out var coord);
                return new PrecioCpDto(
                    Cp:          g.Cp,
                    Lat:         coord?.Lat,
                    Lon:         coord?.Lon,
                    PrecioM2:    Math.Round(g.PrecioM2, 0),
                    NumAnuncios: g.NumAnuncios,
                    GapPct:      null,
                    Nombre:      coord?.Nombre
                );
            })
            .Where(d => d.Lat.HasValue && d.Lon.HasValue)
            .ToList();

        return Ok(resultado);
    }
}
