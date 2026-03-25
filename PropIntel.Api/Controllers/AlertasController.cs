using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/alertas")]
public class AlertasController(PropIntelDbContext db) : ControllerBase
{
    // GET /api/alertas
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AlertaDto>>> GetAlertas()
    {
        var alertas = await db.Alertas
            .OrderByDescending(a => a.CreadaEn)
            .Select(a => ToDto(a))
            .ToListAsync();
        return Ok(alertas);
    }

    // GET /api/alertas/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<AlertaDto>> GetAlerta(string id)
    {
        var alerta = await db.Alertas.FindAsync(id);
        if (alerta is null) return NotFound();
        return Ok(ToDto(alerta));
    }

    // POST /api/alertas
    [HttpPost]
    public async Task<ActionResult<AlertaDto>> CreateAlerta([FromBody] AlertaCreateDto dto)
    {
        var alerta = new Alerta
        {
            Id            = Guid.NewGuid().ToString(),
            Zona          = dto.Zona,
            Ciudad        = dto.Ciudad,
            PrecioMaxAsking = dto.PrecioMaxAsking,
            GapMinimoPct  = dto.GapMinimoPct,
            Descripcion   = dto.Descripcion,
            EmailDestino  = dto.EmailDestino,
            Activa        = true,
            CreadaEn      = DateTime.UtcNow,
        };
        db.Alertas.Add(alerta);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAlerta), new { id = alerta.Id }, ToDto(alerta));
    }

    // PUT /api/alertas/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAlerta(string id, [FromBody] AlertaCreateDto dto)
    {
        var alerta = await db.Alertas.FindAsync(id);
        if (alerta is null) return NotFound();

        alerta.Zona           = dto.Zona;
        alerta.Ciudad         = dto.Ciudad;
        alerta.PrecioMaxAsking= dto.PrecioMaxAsking;
        alerta.GapMinimoPct   = dto.GapMinimoPct;
        alerta.Descripcion    = dto.Descripcion;
        alerta.EmailDestino   = dto.EmailDestino;

        await db.SaveChangesAsync();
        return Ok(ToDto(alerta));
    }

    // PATCH /api/alertas/{id}/toggle
    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> ToggleAlerta(string id)
    {
        var alerta = await db.Alertas.FindAsync(id);
        if (alerta is null) return NotFound();
        alerta.Activa = !alerta.Activa;
        await db.SaveChangesAsync();
        return Ok(new { activa = alerta.Activa });
    }

    // DELETE /api/alertas/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAlerta(string id)
    {
        var alerta = await db.Alertas.FindAsync(id);
        if (alerta is null) return NotFound();
        db.Alertas.Remove(alerta);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/alertas/disparos?leidos=false
    [HttpGet("disparos")]
    public async Task<ActionResult<IEnumerable<DisparoDto>>> GetDisparos(
        [FromQuery] bool? leidos = null,
        [FromQuery] int dias = 30)
    {
        var desde = DateTime.UtcNow.AddDays(-dias);
        var query = db.DisparosAlertas
            .Where(d => d.CreadoEn >= desde);

        if (leidos.HasValue)
            query = query.Where(d => d.Leido == leidos.Value);

        var disparos = await query
            .OrderByDescending(d => d.CreadoEn)
            .Take(100)
            .Select(d => new DisparoDto(
                d.Id, d.AlertaId, d.Zona,
                d.AskingM2, d.NotarialM2, d.GapPct,
                d.Leido, d.CreadoEn, d.AnuncioUrl))
            .ToListAsync();

        return Ok(disparos);
    }

    // PATCH /api/alertas/disparos/{id}/leer
    [HttpPatch("disparos/{id}/leer")]
    public async Task<IActionResult> MarcarLeido(int id)
    {
        var disparo = await db.DisparosAlertas.FindAsync(id);
        if (disparo is null) return NotFound();
        disparo.Leido = true;
        await db.SaveChangesAsync();
        return Ok();
    }

    // PATCH /api/alertas/disparos/leer-todos
    [HttpPatch("disparos/leer-todos")]
    public async Task<IActionResult> MarcarTodosLeidos()
    {
        await db.DisparosAlertas
            .Where(d => !d.Leido)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.Leido, true));
        return Ok();
    }

    private static AlertaDto ToDto(Alerta a) => new(
        a.Id, a.Zona, a.Ciudad, a.PrecioMaxAsking,
        a.GapMinimoPct, a.Activa, a.Descripcion,
        a.EmailDestino, a.CreadaEn
    );
}
