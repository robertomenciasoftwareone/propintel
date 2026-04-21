using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/newsletter")]
public class NewsletterController(PropIntelDbContext db) : ControllerBase
{
    [HttpPost("suscribir")]
    public async Task<IActionResult> Suscribir([FromBody] NewsletterSubscribeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || !dto.Email.Contains('@'))
            return BadRequest("email invalido");

        var email = dto.Email.Trim().ToLowerInvariant();

        var existente = await db.NewsletterSuscripciones
            .FirstOrDefaultAsync(n => n.Email == email);

        if (existente is null)
        {
            db.NewsletterSuscripciones.Add(new NewsletterSuscripcion
            {
                Email = email,
                Nombre = dto.Nombre,
                MunicipioInteres = dto.MunicipioInteres,
                BarrioInteres = dto.BarrioInteres,
                Activa = true,
                CreadaEn = DateTime.UtcNow,
            });
        }
        else
        {
            existente.Activa = true;
            existente.Nombre = string.IsNullOrWhiteSpace(dto.Nombre) ? existente.Nombre : dto.Nombre;
            existente.MunicipioInteres = string.IsNullOrWhiteSpace(dto.MunicipioInteres) ? existente.MunicipioInteres : dto.MunicipioInteres;
            existente.BarrioInteres = string.IsNullOrWhiteSpace(dto.BarrioInteres) ? existente.BarrioInteres : dto.BarrioInteres;
            existente.ActualizadaEn = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok(new { ok = true, email });
    }
}
