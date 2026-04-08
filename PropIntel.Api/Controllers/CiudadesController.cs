using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/ciudades")]
public class CiudadesController(PropIntelDbContext db) : ControllerBase
{
    // GET /api/ciudades
    // Resumen de todos los municipios con datos, ordenados por población
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CiudadResumenDto>>> GetCiudades()
    {
        // Leemos dinámicamente los municipios que tienen gaps calculados
        var ciudades = await db.GapsAnalisis
            .Select(g => g.Ciudad)
            .Distinct()
            .ToListAsync();

        var result = new List<CiudadResumenDto>();

        foreach (var ciudad in ciudades)
        {
            // Último periodo con datos
            var ultimoPeriodo = await db.GapsAnalisis
                .Where(g => g.Ciudad == ciudad)
                .MaxAsync(g => (string?)g.Periodo);

            if (ultimoPeriodo is null) continue;

            var gaps = await db.GapsAnalisis
                .Where(g => g.Ciudad == ciudad && g.Periodo == ultimoPeriodo)
                .ToListAsync();

            if (!gaps.Any()) continue;

            var txMes = await db.DatosNotariales
                .Where(d => d.Ciudad == ciudad && d.Periodo == ultimoPeriodo)
                .SumAsync(d => (int?)d.NumTransacciones) ?? 0;

            result.Add(new CiudadResumenDto(
                Ciudad:         ciudad,
                AskingMedioM2:  Math.Round(gaps.Average(g => g.AskingMedioM2), 0),
                NotarialMedioM2:Math.Round(gaps.Average(g => g.NotarialMedioM2), 0),
                GapPct:         Math.Round(gaps.Average(g => g.GapPct), 1),
                TxMes:          txMes,
                Periodo:        ultimoPeriodo
            ));
        }

        return Ok(result);
    }

    // GET /api/ciudades/{ciudad}/gaps
    // Gaps por zona del último periodo — para el dashboard de distritos
    [HttpGet("{ciudad}/gaps")]
    public async Task<ActionResult<IEnumerable<GapZonaDto>>> GetGapsPorZona(string ciudad)
    {
        var ultimoPeriodo = await db.GapsAnalisis
            .Where(g => g.Ciudad == ciudad)
            .MaxAsync(g => (string?)g.Periodo);

        if (ultimoPeriodo is null) return NotFound();

        var gaps = await db.GapsAnalisis
            .Where(g => g.Ciudad == ciudad && g.Periodo == ultimoPeriodo)
            .OrderByDescending(g => g.GapPct)
            .Select(g => new GapZonaDto(
                g.Zona,
                Math.Round(g.AskingMedioM2, 0),
                Math.Round(g.NotarialMedioM2, 0),
                Math.Round(g.GapPct, 1),
                g.NumAnuncios,
                g.NumTransacciones,
                g.AskingIdealistaM2.HasValue ? Math.Round(g.AskingIdealistaM2.Value, 0) : null,
                g.AskingFotocasaM2.HasValue ? Math.Round(g.AskingFotocasaM2.Value, 0) : null,
                g.GapIdealistaPct.HasValue ? Math.Round(g.GapIdealistaPct.Value, 1) : null,
                g.GapFotocasaPct.HasValue ? Math.Round(g.GapFotocasaPct.Value, 1) : null,
                g.NumAnunciosIdealista,
                g.NumAnunciosFotocasa
            ))
            .ToListAsync();

        return Ok(gaps);
    }

    // GET /api/ciudades/{ciudad}/historico?meses=12
    // Evolución mensual asking vs notarial — para el gráfico de líneas
    [HttpGet("{ciudad}/historico")]
    public async Task<ActionResult<IEnumerable<HistoricoMesDto>>> GetHistorico(
        string ciudad,
        [FromQuery] int meses = 12)
    {
        var desde = DateTime.UtcNow.AddMonths(-meses).ToString("yyyy-MM");

        var datos = await db.GapsAnalisis
            .Where(g => g.Ciudad == ciudad && g.Periodo.CompareTo(desde) >= 0)
            .GroupBy(g => g.Periodo)
            .Select(grp => new
            {
                Periodo = grp.Key,
                Asking  = grp.Average(g => g.AskingMedioM2),
                Notarial= grp.Average(g => g.NotarialMedioM2),
                Gap     = grp.Average(g => g.GapPct),
                AskingIdealista = grp.Where(g => g.AskingIdealistaM2 != null)
                    .Average(g => (double?)g.AskingIdealistaM2),
                AskingFotocasa = grp.Where(g => g.AskingFotocasaM2 != null)
                    .Average(g => (double?)g.AskingFotocasaM2),
            })
            .OrderBy(x => x.Periodo)
            .ToListAsync();

        var result = datos.Select(d => new HistoricoMesDto(
            Mes:     PeriodoAMes(d.Periodo),
            Periodo: d.Periodo,
            Asking:  Math.Round(d.Asking, 0),
            Notarial:Math.Round(d.Notarial, 0),
            Gap:     Math.Round(d.Gap, 1),
            AskingIdealista: d.AskingIdealista.HasValue ? Math.Round(d.AskingIdealista.Value, 0) : null,
            AskingFotocasa:  d.AskingFotocasa.HasValue ? Math.Round(d.AskingFotocasa.Value, 0) : null
        ));

        return Ok(result);
    }

    // GET /api/ciudades/{ciudad}/transacciones?zona=&dias=7
    // Últimas transacciones scrapeadas — tabla de anuncios notariales
    [HttpGet("{ciudad}/transacciones")]
    public async Task<ActionResult<IEnumerable<TransaccionDto>>> GetTransacciones(
        string ciudad,
        [FromQuery] string? zona = null,
        [FromQuery] int dias = 90)
    {
        var desde = DateTime.UtcNow.AddDays(-dias);

        var query = db.Anuncios
            .Where(a =>
                a.Ciudad == ciudad &&
                a.Activo &&
                a.FechaScraping >= desde &&
                a.PrecioM2.HasValue);

        if (!string.IsNullOrEmpty(zona))
            query = query.Where(a => a.Distrito == zona);

        // Cruzamos con datos notariales por municipio
        var ultimoPeriodo = await db.DatosNotariales
            .Where(d => d.Ciudad == ciudad)
            .MaxAsync(d => (string?)d.Periodo);

        var notariales = ultimoPeriodo != null
            ? await db.DatosNotariales
                .Where(d => d.Ciudad == ciudad && d.Periodo == ultimoPeriodo)
                .ToListAsync()
            : [];

        var notarialPorZona = notariales
            .Where(n => !string.IsNullOrEmpty(n.Municipio))
            .ToDictionary(n => n.Municipio!, StringComparer.OrdinalIgnoreCase);

        var anuncios = await query
            .OrderByDescending(a => a.FechaScraping)
            .Take(50)
            .ToListAsync();

        var notarialCiudadFallbackTx = notariales
            .OrderByDescending(n => n.NumTransacciones)
            .FirstOrDefault();

        var result = anuncios.Select(a =>
        {
            var zonaKey = a.Distrito ?? ciudad;
            notarialPorZona.TryGetValue(zonaKey, out var notZona);
            if (notZona == null) notarialPorZona.TryGetValue(ciudad, out notZona);
            if (notZona == null) notZona = notarialCiudadFallbackTx;
            var notarialM2 = notZona?.PrecioMedioM2 ?? a.PrecioM2!.Value;
            var gap = (a.PrecioM2!.Value - notarialM2) / notarialM2 * 100;
            return new TransaccionDto(
                Id:          a.Id,
                Zona:        a.Distrito ?? ciudad,
                AskingM2:    Math.Round(a.PrecioM2.Value, 0),
                NotarialM2:  Math.Round(notarialM2, 0),
                GapPct:      Math.Round(gap, 1),
                SuperficieM2:a.SuperficieM2,
                Fecha:       a.FechaScraping,
                Fuente:      a.Fuente,
                Url:         a.Url,
                TipoInmueble:a.TipoInmueble,
                Habitaciones:a.Habitaciones,
                Titulo:      a.Titulo
            );
        });

        return Ok(result);
    }

    // GET /api/ciudades/{ciudad}/notarial
    // Datos notariales por zona del último periodo — precios reales de compraventa
    [HttpGet("{ciudad}/notarial")]
    public async Task<ActionResult<IEnumerable<NotarialZonaDto>>> GetNotarial(string ciudad)
    {
        var ultimoPeriodo = await db.DatosNotariales
            .Where(d => d.Ciudad == ciudad)
            .MaxAsync(d => (string?)d.Periodo);

        if (ultimoPeriodo is null) return NotFound();

        var datos = await db.DatosNotariales
            .Where(d => d.Ciudad == ciudad && d.Periodo == ultimoPeriodo)
            .OrderByDescending(d => d.NumTransacciones)
            .Select(d => new NotarialZonaDto(
                d.Ciudad,
                d.Municipio,
                Math.Round(d.PrecioMedioM2, 0),
                d.PrecioMinM2.HasValue ? Math.Round(d.PrecioMinM2.Value, 0) : null,
                d.PrecioMaxM2.HasValue ? Math.Round(d.PrecioMaxM2.Value, 0) : null,
                d.NumTransacciones,
                d.Periodo
            ))
            .ToListAsync();

        return Ok(datos);
    }

    // GET /api/ciudades/{ciudad}/mapa
    // Anuncios con coordenadas (por zona) para vista de mapa
    [HttpGet("{ciudad}/mapa")]
    public async Task<ActionResult<IEnumerable<AnuncioMapaDto>>> GetMapa(string ciudad)
    {
        var anuncios = await db.Anuncios
            .Where(a => a.Ciudad == ciudad && a.Activo && a.PrecioM2.HasValue)
            .OrderByDescending(a => a.FechaScraping)
            .Take(1000)
            .ToListAsync();

        if (!anuncios.Any()) return Ok(Array.Empty<AnuncioMapaDto>());

        var ultimoPeriodo = await db.DatosNotariales
            .Where(d => d.Ciudad == ciudad)
            .MaxAsync(d => (string?)d.Periodo);

        var notariales = ultimoPeriodo != null
            ? await db.DatosNotariales
                .Where(d => d.Ciudad == ciudad && d.Periodo == ultimoPeriodo)
                .ToListAsync()
            : new List<DatoNotarial>();

        var notarialPorZona = notariales
            .Where(n => !string.IsNullOrEmpty(n.Municipio))
            .ToDictionary(n => n.Municipio!, StringComparer.OrdinalIgnoreCase);

        // Center coordinates per zone (with small jitter per pin)
        // Keys stored in both accented and unaccented forms for robust matching
        var zonaCentrosBase = new List<(string Key, double Lat, double Lon)>
        {
            // Madrid
            ("Madrid",          40.4168, -3.7038),
            ("Salamanca",       40.4310, -3.6790),
            ("Chamberí",        40.4350, -3.7040),
            ("Chamberi",        40.4350, -3.7040),
            ("Tetuán",          40.4600, -3.6970),
            ("Tetuan",          40.4600, -3.6970),
            ("Carabanchel",     40.3840, -3.7380),
            ("Retiro",          40.4100, -3.6830),
            ("Centro",          40.4151, -3.7074),
            ("Arganzuela",      40.3990, -3.6980),
            ("Moncloa",         40.4350, -3.7200),
            ("Vallecas",        40.3810, -3.6590),
            ("Ciudad Lineal",   40.4380, -3.6550),
            ("Hortaleza",       40.4740, -3.6390),
            ("Fuencarral",      40.4800, -3.7100),
            ("Latina",          40.4050, -3.7330),
            // Barcelona
            ("Barcelona",       41.3874,  2.1686),
            ("Eixample",        41.3880,  2.1620),
            ("Gràcia",          41.4040,  2.1570),
            ("Gracia",          41.4040,  2.1570),
            ("Sant Martí",      41.4050,  2.1990),
            ("Sant Marti",      41.4050,  2.1990),
            ("Sarrià",          41.4000,  2.1230),
            ("Sarria",          41.4000,  2.1230),
            ("Les Corts",       41.3830,  2.1270),
            ("Sants",           41.3730,  2.1390),
            ("Nou Barris",      41.4380,  2.1750),
            ("Horta-Guinardó",  41.4200,  2.1720),
            ("Horta-Guinardo",  41.4200,  2.1720),
            ("Sant Andreu",     41.4320,  2.1870),
            ("Ciutat Vella",    41.3820,  2.1760),
            // Asturias
            ("Oviedo",          43.3614, -5.8494),
            ("Gijón",           43.5322, -5.6611),
            ("Gijon",           43.5322, -5.6611),
            ("Avilés",          43.5567, -5.9247),
            ("Aviles",          43.5567, -5.9247),
            ("Siero",           43.3860, -5.7640),
            ("Llanera",         43.3720, -5.8780),
            // Valencia
            ("Valencia",        39.4699, -0.3763),
            ("Ruzafa",          39.4610, -0.3730),
            ("L'Eixample",      39.4680, -0.3690),
            ("Campanar",        39.4870, -0.3940),
            ("Quatre Carreres", 39.4450, -0.3680),
            ("Poblats Marítims",39.4600, -0.3370),
            ("Extramurs",       39.4720, -0.3810),
            ("Benimaclet",      39.4830, -0.3580),
            // Sevilla
            ("Sevilla",         37.3886, -5.9823),
            ("Triana",          37.3830, -6.0020),
            ("Los Remedios",    37.3760, -6.0050),
            ("Nervión",         37.3870, -5.9680),
            ("Macarena",        37.4050, -5.9780),
            ("Casco Antiguo",   37.3920, -5.9960),
            ("Sur",             37.3720, -5.9840),
        };

        var zonaCentros = new Dictionary<string, (double Lat, double Lon)>(StringComparer.OrdinalIgnoreCase);
        foreach (var (k, lat, lon) in zonaCentrosBase)
            zonaCentros.TryAdd(k, (lat, lon));

        // Also map ciudad names directly to their capital coords as fallback
        var ciudadFallback = new Dictionary<string, (double Lat, double Lon)>(StringComparer.OrdinalIgnoreCase)
        {
            ["madrid"]    = (40.4168, -3.7038),
            ["barcelona"] = (41.3874,  2.1686),
            ["asturias"]  = (43.3614, -5.8494),
            ["valencia"]  = (39.4699, -0.3763),
            ["sevilla"]   = (37.3886, -5.9823),
        };

        var rng = new Random();
        var result = new List<AnuncioMapaDto>();

        // Notarial de la ciudad como fallback general
        var notarialCiudadFallback = notariales
            .OrderByDescending(n => n.NumTransacciones)
            .FirstOrDefault();

        foreach (var a in anuncios)
        {
            var zonaKey = a.Distrito ?? ciudad;
            notarialPorZona.TryGetValue(zonaKey, out var notZona);
            // Fallback 1: notarial de la ciudad genérica
            if (notZona == null) notarialPorZona.TryGetValue(ciudad, out notZona);
            // Fallback 2: notarial con más transacciones de la ciudad
            if (notZona == null) notZona = notarialCiudadFallback;
            var notarialM2 = notZona?.PrecioMedioM2 ?? a.PrecioM2!.Value;
            var gap = (a.PrecioM2!.Value - notarialM2) / notarialM2 * 100;

            double lat, lon;

            // Prioridad 1: coordenadas reales del anuncio (vienen de la API de Idealista)
            if (a.Lat.HasValue && a.Lon.HasValue)
            {
                lat = a.Lat.Value;
                lon = a.Lon.Value;
            }
            // Prioridad 2: centro del distrito con jitter
            else if (zonaCentros.TryGetValue(zonaKey, out var centro) ||
                     ciudadFallback.TryGetValue(ciudad, out centro))
            {
                lat = centro.Lat + (rng.NextDouble() - 0.5) * 0.008;
                lon = centro.Lon + (rng.NextDouble() - 0.5) * 0.008;
            }
            else
            {
                continue; // sin coordenadas — no se puede pintar
            }

            result.Add(new AnuncioMapaDto(
                Id:           a.Id,
                Zona:         zonaKey,
                Lat:          Math.Round(lat, 6),
                Lon:          Math.Round(lon, 6),
                PrecioTotal:  a.PrecioTotal,
                PrecioM2:     Math.Round(a.PrecioM2.Value, 0),
                NotarialM2:   Math.Round(notarialM2, 0),
                GapPct:       Math.Round(gap, 1),
                SuperficieM2: a.SuperficieM2,
                TipoInmueble: a.TipoInmueble,
                Habitaciones: a.Habitaciones,
                Fuente:       a.Fuente,
                Url:          a.Url,
                Titulo:       a.Titulo
            ));
        }

        return Ok(result);
    }

    private static string PeriodoAMes(string periodo)
    {
        // "2026-03" → "Mar"
        if (!DateTime.TryParse(periodo + "-01", out var fecha)) return periodo;
        return fecha.ToString("MMM", new System.Globalization.CultureInfo("es-ES"));
    }
}
