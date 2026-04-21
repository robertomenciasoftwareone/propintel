using System.Text.RegularExpressions;
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
    // Distritos/barrios conocidos de Madrid (en minúsculas)
    private static readonly string[] BarriosMadrid =
    [
        "chamartin", "chamartín", "salamanca", "retiro", "centro", "arganzuela",
        "latina", "carabanchel", "usera", "puente de vallecas", "vallecas",
        "moratalaz", "ciudad lineal", "hortaleza", "fuencarral", "moncloa",
        "aravaca", "barajas", "san blas", "vicálvaro", "vicalvaro",
        "villaverde", "villa de vallecas", "tetuan", "tetuán", "chamberi", "chamberí",
        "lavapiés", "lavapies", "malasaña", "chueca", "sol", "huertas",
        "prosperidad", "arturo soria", "orcasur", "carabanchel alto"
    ];

    private static readonly string[] MunicipiosMadrid =
    [
        "madrid", "boadilla", "pozuelo", "majadahonda", "las rozas", "alcobendas",
        "san sebastian de los reyes", "alcalá de henares", "alcala de henares",
        "getafe", "leganes", "fuenlabrada", "mostoles", "móstoles", "alcorcon",
        "alcorcón", "villaviciosa de odón", "villaviciosa"
    ];

    [HttpPost("preguntar")]
    public async Task<ActionResult<AsistenteRespuestaDto>> Preguntar([FromBody] AsistentePreguntaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Pregunta))
            return BadRequest("pregunta es obligatoria");

        // Parsear pregunta en lenguaje natural
        var parsed = ParsearPregunta(dto.Pregunta);

        // Los campos explícitos del DTO tienen prioridad sobre lo parseado
        var municipio   = dto.Municipio   ?? parsed.Municipio;
        var barrio      = dto.Barrio      ?? parsed.Barrio;
        var precioMax   = dto.PrecioMaximo ?? parsed.PrecioMaximo;
        var habitaciones = dto.Habitaciones ?? parsed.Habitaciones;

        var q = db.Anuncios.AsQueryable().Where(a => a.Activo);

        if (!string.IsNullOrWhiteSpace(municipio))
        {
            var m = municipio.Trim().ToLowerInvariant();
            q = q.Where(a => EF.Functions.ILike(a.Ciudad, m));
        }

        if (!string.IsNullOrWhiteSpace(barrio))
        {
            var b = barrio.Trim();
            q = q.Where(a => a.Distrito != null && EF.Functions.ILike(a.Distrito, $"%{b}%"));
        }

        if (precioMax.HasValue)
            q = q.Where(a => a.PrecioTotal <= precioMax.Value);

        if (habitaciones.HasValue)
            q = q.Where(a => a.Habitaciones >= habitaciones.Value);

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
            var filtrosAplicados = new List<string>();
            if (!string.IsNullOrWhiteSpace(barrio)) filtrosAplicados.Add($"barrio \"{barrio}\"");
            else if (!string.IsNullOrWhiteSpace(municipio)) filtrosAplicados.Add($"municipio \"{municipio}\"");
            if (habitaciones.HasValue) filtrosAplicados.Add($"{habitaciones} habitaciones");
            if (precioMax.HasValue) filtrosAplicados.Add($"hasta {precioMax:N0} EUR");

            respuesta = filtrosAplicados.Count > 0
                ? $"No encuentro inmuebles con {string.Join(", ", filtrosAplicados)}. Prueba a ampliar presupuesto o zona."
                : "No encuentro inmuebles con esos filtros. Prueba a ampliar presupuesto o zona.";
        }
        else
        {
            var precioMedio = muestraDb.Average(x => x.PrecioTotal);
            var masBarato   = muestraDb.First();
            var zonaNombre  = !string.IsNullOrWhiteSpace(barrio) ? barrio
                            : !string.IsNullOrWhiteSpace(municipio) ? municipio
                            : null;
            var zonaTexto   = zonaNombre != null ? $" en {zonaNombre}" : "";
            var habTexto    = habitaciones.HasValue ? $" de {habitaciones} o más habitaciones" : "";
            respuesta = $"He encontrado {total} inmuebles{zonaTexto}{habTexto}. Precio medio {precioMedio:N0} EUR, el más barato {masBarato.PrecioTotal:N0} EUR.";
        }

        return Ok(new AsistenteRespuestaDto(
            Respuesta: respuesta,
            TotalResultados: total,
            Muestra: muestra
        ));
    }

    private static ParsedQuery ParsearPregunta(string pregunta)
    {
        var texto = pregunta.ToLowerInvariant()
            .Replace("á", "a").Replace("é", "e").Replace("í", "i")
            .Replace("ó", "o").Replace("ú", "u").Replace("ñ", "n");

        // Habitaciones: "3 habitaciones", "3 hab", "3 dormitorios", "tres habitaciones"
        int? habitaciones = null;
        var mHab = Regex.Match(texto, @"(\d+)\s*(hab|dormitorio|habitacion)");
        if (mHab.Success && int.TryParse(mHab.Groups[1].Value, out var h))
            habitaciones = h;
        else
        {
            // palabras numéricas
            var numerosTexto = new Dictionary<string, int>
            {
                ["una"] = 1, ["dos"] = 2, ["tres"] = 3, ["cuatro"] = 4,
                ["cinco"] = 5, ["seis"] = 6, ["siete"] = 7
            };
            foreach (var (palabra, num) in numerosTexto)
            {
                if (Regex.IsMatch(texto, $@"{palabra}\s*(hab|dormitorio|habitacion)"))
                {
                    habitaciones = num;
                    break;
                }
            }
        }

        // Precio máximo: "menos de 350k", "hasta 350000", "por 300k", "max 400.000"
        int? precioMax = null;
        var mPrecio = Regex.Match(texto, @"(?:menos de|hasta|por|max|maximo)\s*(\d[\d.,]*)\s*(k|mil|m|millon)?");
        if (mPrecio.Success)
        {
            var numStr = mPrecio.Groups[1].Value.Replace(".", "").Replace(",", "");
            if (int.TryParse(numStr, out var precio))
            {
                var sufijo = mPrecio.Groups[2].Value;
                precioMax = sufijo is "k" or "mil" ? precio * 1000
                          : sufijo is "m" or "millon" ? precio * 1000000
                          : precio;
            }
        }

        // Barrio (buscar antes que municipio para mayor especificidad)
        string? barrio = null;
        foreach (var b in BarriosMadrid)
        {
            var bNorm = b.ToLowerInvariant()
                .Replace("á","a").Replace("é","e").Replace("í","i")
                .Replace("ó","o").Replace("ú","u").Replace("ñ","n");
            if (texto.Contains(bNorm))
            {
                barrio = b; // devolver con tildes originales
                break;
            }
        }

        // Municipio (solo si no encontramos barrio de Madrid)
        string? municipio = null;
        if (barrio == null || !BarriosMadrid.Contains(barrio.ToLowerInvariant()))
        {
            foreach (var m in MunicipiosMadrid)
            {
                var mNorm = m.ToLowerInvariant()
                    .Replace("á","a").Replace("é","e").Replace("í","i")
                    .Replace("ó","o").Replace("ú","u").Replace("ñ","n");
                if (texto.Contains(mNorm))
                {
                    municipio = m;
                    break;
                }
            }
        }
        else
        {
            // Si hay barrio de Madrid, el municipio es Madrid
            municipio = "madrid";
        }

        return new ParsedQuery(municipio, barrio, precioMax, habitaciones);
    }

    private record ParsedQuery(string? Municipio, string? Barrio, int? PrecioMaximo, int? Habitaciones);
}
