using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/metricas")]
public class MetricasController(PropIntelDbContext db) : ControllerBase
{
    [HttpPost("evento")]
    public async Task<IActionResult> RegistrarEvento([FromBody] AnalyticsEventCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Evento))
            return BadRequest("evento es obligatorio");

        var ev = new AnalyticsEvento
        {
            Evento = dto.Evento.Trim().ToLowerInvariant(),
            SessionId = dto.SessionId,
            UserEmail = dto.UserEmail,
            Municipio = dto.Municipio,
            Barrio = dto.Barrio,
            PayloadJson = dto.PayloadJson,
            CreadoEn = DateTime.UtcNow,
        };

        db.AnalyticsEventos.Add(ev);
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpGet("admin")]
    public async Task<ActionResult<AdminMetricasDto>> GetMetricasAdmin([FromQuery] int dias = 30)
    {
        if (dias <= 0 || dias > 365) dias = 30;
        var desde = DateTime.UtcNow.AddDays(-dias);

        // Simple scalar queries — safe to run in SQL
        var usuariosRegistrados = await db.AnalyticsEventos
            .Where(e => e.CreadoEn >= desde && e.Evento == "registro"
                     && e.UserEmail != null && e.UserEmail != "")
            .Select(e => e.UserEmail)
            .Distinct()
            .CountAsync();

        var busquedas = await db.AnalyticsEventos
            .CountAsync(e => e.CreadoEn >= desde && e.Evento == "busqueda");

        var newsletter = await db.NewsletterSuscripciones
            .Where(n => n.Activa && n.CreadaEn >= desde)
            .CountAsync();

        // Complex GroupBy → load raw data then compute in memory
        var sesionesRaw = await db.AnalyticsEventos
            .Where(e => e.CreadoEn >= desde && e.SessionId != null)
            .Select(e => new { e.SessionId, e.CreadoEn, e.Evento })
            .ToListAsync();

        var sesiones = sesionesRaw
            .GroupBy(e => e.SessionId!)
            .Select(g => new
            {
                Min = g.Min(x => x.CreadoEn),
                Max = g.Max(x => x.CreadoEn),
                Visitas = g.Count(x => x.Evento == "visit")
            })
            .ToList();

        var tiempoMedioSegundos = sesiones.Count == 0
            ? 0
            : (int)Math.Round(sesiones.Average(s => (s.Max - s.Min).TotalSeconds));

        var recurrentes = sesiones.Count == 0
            ? 0
            : (int)Math.Round(100.0 * sesiones.Count(s => s.Visitas > 1) / sesiones.Count);

        var busquedasRaw = await db.AnalyticsEventos
            .Where(e => e.CreadoEn >= desde && e.Evento == "busqueda")
            .Select(e => new { e.Municipio, e.Barrio })
            .ToListAsync();

        var patrones = busquedasRaw
            .GroupBy(e => (e.Municipio ?? "sin-municipio") + "|" + (e.Barrio ?? "sin-barrio"))
            .Select(g => new PatronBusquedaDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Veces)
            .Take(15)
            .ToList();

        var fechasBusquedas = await db.AnalyticsEventos
            .Where(e => e.Evento == "busqueda" && e.CreadoEn >= DateTime.UtcNow.AddDays(-14))
            .Select(e => e.CreadoEn)
            .ToListAsync();

        var busquedasPorDia = fechasBusquedas
            .GroupBy(d => d.Date)
            .Select(g => new BusquedasDiaDto(g.Key.ToString("yyyy-MM-dd"), g.Count()))
            .OrderBy(x => x.Fecha)
            .ToList();

        return Ok(new AdminMetricasDto(
            UsuariosRegistrados: usuariosRegistrados,
            Busquedas: busquedas,
            TiempoMedioSegundos: tiempoMedioSegundos,
            PorcentajeUsuariosRecurrentes: recurrentes,
            SuscripcionesNewsletter: newsletter,
            Patrones: patrones,
            BusquedasPorDia: busquedasPorDia
        ));
    }
}
