using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/auth")]
public class AuthController(PropIntelDbContext db) : ControllerBase
{
    // POST /api/auth/login  — si no existe lo crea (registro automático)
    [HttpPost("login")]
    public async Task<ActionResult<UsuarioDto>> Login([FromBody] LoginRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest("Email y nombre son obligatorios.");

        var emailNorm = req.Email.Trim().ToLowerInvariant();

        var usuario = await db.Usuarios
            .FirstOrDefaultAsync(u => u.Email == emailNorm);

        if (usuario == null)
        {
            usuario = new Usuario
            {
                Email = emailNorm,
                Nombre = req.Nombre.Trim(),
                CreadoEn = DateTime.UtcNow
            };
            db.Usuarios.Add(usuario);
            await db.SaveChangesAsync();
        }

        return Ok(new UsuarioDto(usuario.Id, usuario.Email, usuario.Nombre, usuario.CreadoEn));
    }

    // POST /api/auth/registro
    [HttpPost("registro")]
    public async Task<ActionResult<UsuarioDto>> Registro([FromBody] LoginRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest("Email y nombre son obligatorios.");

        var emailNorm = req.Email.Trim().ToLowerInvariant();

        var existe = await db.Usuarios.AnyAsync(u => u.Email == emailNorm);
        if (existe)
        {
            // Ya existe: devolvemos sus datos (idempotente)
            var existing = await db.Usuarios.FirstAsync(u => u.Email == emailNorm);
            return Ok(new UsuarioDto(existing.Id, existing.Email, existing.Nombre, existing.CreadoEn));
        }

        var usuario = new Usuario
        {
            Email = emailNorm,
            Nombre = req.Nombre.Trim(),
            CreadoEn = DateTime.UtcNow
        };
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        return Created("", new UsuarioDto(usuario.Id, usuario.Email, usuario.Nombre, usuario.CreadoEn));
    }

    // GET /api/auth/me?email=... — recuperar usuario por email
    [HttpGet("me")]
    public async Task<ActionResult<UsuarioDto>> Me([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return BadRequest();
        var emailNorm = email.Trim().ToLowerInvariant();
        var u = await db.Usuarios.FirstOrDefaultAsync(x => x.Email == emailNorm);
        if (u == null) return NotFound();
        return Ok(new UsuarioDto(u.Id, u.Email, u.Nombre, u.CreadoEn));
    }
}
