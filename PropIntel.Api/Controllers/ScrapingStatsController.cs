using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;

namespace PropIntel.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/scraping-stats")]
public class ScrapingStatsController(PropIntelDbContext db) : ControllerBase
{
    /// <summary>
    /// GET /api/scraping-stats
    /// Retorna un resumen visual de últimas ejecuciones, cantidad de anuncios, etc.
    /// Sirve para el dashboard de fuentes de datos.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ScrapingStatsDto>> GetScrapingStats()
    {
        var isNpgsql = db.Database.IsNpgsql();

        var totalAnuncios = await db.Anuncios.CountAsync();
        var anunciosMadrid = isNpgsql
            ? await db.Anuncios.Where(a => EF.Functions.ILike(a.Ciudad, "%madrid%")).CountAsync()
            : await db.Anuncios.Where(a => (a.Ciudad ?? "").ToLower().Contains("madrid")).CountAsync();
        var anunciosBarcelona = isNpgsql
            ? await db.Anuncios.Where(a => EF.Functions.ILike(a.Ciudad, "%barcelona%")).CountAsync()
            : await db.Anuncios.Where(a => (a.Ciudad ?? "").ToLower().Contains("barcelona")).CountAsync();

        var ultimosPortales = await db.Anuncios
            .GroupBy(a => a.Fuente.ToLower())
            .Select(g => new
            {
                Fuente = g.Key,
                Total = g.Count(),
                Ultima = g.Max(x => x.FechaScraping)
            })
            .ToListAsync();

        var portales = ultimosPortales
            .Select(x => new PortalScrapingDto(
                Portal: x.Fuente,
                TotalAnuncios: x.Total,
                UltimaEjecucion: x.Ultima
            ))
            .OrderByDescending(x => x.TotalAnuncios)
            .ToList();

        var ultimaEjecucion = ultimosPortales.Count > 0
            ? ultimosPortales.Max(x => x.Ultima)
            : (DateTime?)null;

        var hoyUtc = DateTime.UtcNow.Date;
        var ejecucionesHoy = await db.Anuncios
            .Where(a => a.FechaScraping >= hoyUtc)
            .Select(a => a.FechaScraping.Date)
            .Distinct()
            .CountAsync();

        var fotocasa = ultimosPortales.FirstOrDefault(x => x.Fuente == "fotocasa");

        return Ok(new ScrapingStatsDto(
            TotalAnuncios: totalAnuncios,
            AnunciosMadrid: anunciosMadrid,
            AnunciosBarcelona: anunciosBarcelona,
            UltimaEjecucion: ultimaEjecucion,
            EjecucionesHoy: ejecucionesHoy,
            PortalesActivos: portales.Count,
            CoberturaZonas: null,
            Portales: portales,
            FotocasaResumen: fotocasa is null
                ? null
                : new FotocasaResumenDto(
                    TotalAnuncios: fotocasa.Total,
                    UltimaEjecucion: fotocasa.Ultima
                )
        ));
    }
}

/// DTOs
public record ScrapingStatsDto(
    int TotalAnuncios,
    int AnunciosMadrid,
    int AnunciosBarcelona,
    DateTime? UltimaEjecucion,
    int EjecucionesHoy,
    int PortalesActivos,
    int? CoberturaZonas,
    List<PortalScrapingDto> Portales,
    FotocasaResumenDto? FotocasaResumen
);

public record PortalScrapingDto(
    string Portal,
    int TotalAnuncios,
    DateTime UltimaEjecucion
);

public record FotocasaResumenDto(
    int TotalAnuncios,
    DateTime UltimaEjecucion
);
