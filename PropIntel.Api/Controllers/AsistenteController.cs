using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/asistente")]
public class AsistenteController(PropIntelDbContext db) : ControllerBase
{
    [HttpPost("preguntar")]
    public async Task<ActionResult<AsistenteRespuestaDto>> Preguntar([FromBody] AsistentePreguntaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Pregunta))
            return BadRequest("pregunta es obligatoria");

        var q = db.Anuncios.AsQueryable().Where(a => a.Activo);

        if (!string.IsNullOrWhiteSpace(dto.Municipio))
        {
            var m = dto.Municipio.Trim().ToLowerInvariant();
            q = q.Where(a => a.Ciudad == m || EF.Functions.ILike(a.Ciudad, m));
        }

        if (!string.IsNullOrWhiteSpace(dto.Barrio))
        {
            var b = dto.Barrio.Trim().ToLowerInvariant();
            q = q.Where(a => a.Distrito != null && EF.Functions.ILike(a.Distrito, $"%{b}%"));
        }

        if (dto.PrecioMaximo.HasValue)
            q = q.Where(a => a.PrecioTotal <= dto.PrecioMaximo.Value);

        if (dto.Habitaciones.HasValue)
            q = q.Where(a => a.Habitaciones >= dto.Habitaciones.Value);

        var total = await q.CountAsync();

        var muestraDb = await q
            .OrderBy(a => a.PrecioTotal)
            .Take(5)
            .ToListAsync();

        var muestra = muestraDb.Select(a => new AnuncioResumenDto(
            Id: a.Id,
            Fuente: a.Fuente,
            Titulo: a.Titulo,
            PrecioTotal: a.PrecioTotal,
            PrecioM2: a.PrecioM2,
            SuperficieM2: a.SuperficieM2,
            Habitaciones: a.Habitaciones,
            Distrito: a.Distrito,
            TipoInmueble: a.TipoInmueble,
            FechaScraping: a.FechaScraping,
            Url: a.Url
        )).ToList();

        string respuesta;
        if (total == 0)
        {
            respuesta = "No encuentro inmuebles con esos filtros ahora mismo. Prueba a ampliar presupuesto o zona.";
        }
        else
        {
            var precioMedio = muestraDb.Average(x => x.PrecioTotal);
            var masBarato = muestraDb.First();
            respuesta = $"He encontrado {total} inmuebles. En la muestra, el precio medio es {precioMedio:N0} EUR y el mas barato cuesta {masBarato.PrecioTotal:N0} EUR.";
        }

        return Ok(new AsistenteRespuestaDto(
            Respuesta: respuesta,
            TotalResultados: total,
            Muestra: muestra
        ));
    }
}
