using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/municipios")]
public class MunicipiosController(PropIntelDbContext db) : ControllerBase
{
    // GET /api/municipios?q=gij&limit=20&solo_con_datos=false
    // Búsqueda de municipios por nombre — para el selector del frontend
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MunicipioDto>>> Buscar(
        [FromQuery] string? q = null,
        [FromQuery] int limit = 20,
        [FromQuery] bool soloConDatos = false)
    {
        var query = db.Municipios.AsQueryable();

        if (soloConDatos)
            query = query.Where(m => m.TieneDatos);

        if (!string.IsNullOrWhiteSpace(q))
        {
            // Normalización básica: minúsculas y sin tildes en la comparación
            var termino = q.ToLower().Trim();
            query = query.Where(m =>
                m.NombreNorm.Contains(termino) ||
                m.Nombre.ToLower().Contains(termino));
        }
        else
        {
            // Sin búsqueda: devolvemos los más poblados primero
            query = query.OrderByDescending(m => m.Poblacion ?? 0);
        }

        var result = await query
            .OrderByDescending(m => m.TieneDatos)   // con datos primero
            .ThenByDescending(m => m.Poblacion ?? 0)
            .Take(limit)
            .Select(m => new MunicipioDto(
                m.IdIne,
                m.Nombre,
                m.Provincia,
                m.Comunidad,
                m.TieneDatos,
                m.Lat,
                m.Lon
            ))
            .ToListAsync();

        return Ok(result);
    }

    // GET /api/municipios/{idIne}
    // Detalle de un municipio concreto
    [HttpGet("{idIne}")]
    public async Task<ActionResult<MunicipioDto>> GetById(string idIne)
    {
        var m = await db.Municipios.FindAsync(idIne);
        if (m is null) return NotFound();

        return Ok(new MunicipioDto(
            m.IdIne, m.Nombre, m.Provincia, m.Comunidad,
            m.TieneDatos, m.Lat, m.Lon));
    }

    // GET /api/municipios/populares?limit=10
    // Los municipios más poblados con datos disponibles — para mostrar por defecto
    [HttpGet("populares")]
    public async Task<ActionResult<IEnumerable<MunicipioDto>>> GetPopulares(
        [FromQuery] int limit = 10)
    {
        var result = await db.Municipios
            .Where(m => m.TieneDatos)
            .OrderByDescending(m => m.Poblacion ?? 0)
            .Take(limit)
            .Select(m => new MunicipioDto(
                m.IdIne, m.Nombre, m.Provincia, m.Comunidad,
                m.TieneDatos, m.Lat, m.Lon))
            .ToListAsync();

        return Ok(result);
    }
}
