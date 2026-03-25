using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Data;
using PropIntel.Api.Models;
using System.Xml.Linq;

namespace PropIntel.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/anuncios")]
public class AnunciosController(PropIntelDbContext db, IHttpClientFactory httpFactory) : ControllerBase
{
    private static readonly XNamespace CatNs = "http://www.catastro.meh.es/";

    // GET /api/anuncios/{id}
    // Detalle completo de un anuncio con datos notariales cruzados
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AnuncioDetalleDto>> GetDetalle(int id)
    {
        var anuncio = await db.Anuncios.FindAsync(id);
        if (anuncio is null) return NotFound();

        // Buscar dato notarial más reciente para la misma ciudad + municipio/zona
        var notarial = await db.DatosNotariales
            .Where(d => d.Ciudad == anuncio.Ciudad
                && d.Municipio == (anuncio.Distrito ?? anuncio.Ciudad))
            .OrderByDescending(d => d.Periodo)
            .FirstOrDefaultAsync();

        // Fallback: dato ciudad si no hay match por zona
        notarial ??= await db.DatosNotariales
            .Where(d => d.Ciudad == anuncio.Ciudad)
            .OrderByDescending(d => d.Periodo)
            .FirstOrDefaultAsync();

        // Buscar gap del mismo periodo para la zona
        var gap = await db.GapsAnalisis
            .Where(g => g.Ciudad == anuncio.Ciudad && g.Zona == (anuncio.Distrito ?? anuncio.Ciudad))
            .OrderByDescending(g => g.Periodo)
            .FirstOrDefaultAsync();

        var dto = new AnuncioDetalleDto(
            Id:              anuncio.Id,
            IdExterno:       anuncio.IdExterno,
            Fuente:          anuncio.Fuente,
            Url:             anuncio.Url,
            Titulo:          anuncio.Titulo,
            PrecioTotal:     anuncio.PrecioTotal,
            PrecioM2:        anuncio.PrecioM2,
            SuperficieM2:    anuncio.SuperficieM2,
            Habitaciones:    anuncio.Habitaciones,
            Ciudad:          anuncio.Ciudad,
            Distrito:        anuncio.Distrito,
            TipoInmueble:    anuncio.TipoInmueble,
            FechaScraping:   anuncio.FechaScraping,
            NotarialMedioM2: notarial?.PrecioMedioM2,
            NotarialMinM2:   notarial?.PrecioMinM2,
            NotarialMaxM2:   notarial?.PrecioMaxM2,
            NumTransacciones:notarial?.NumTransacciones,
            NotarialPeriodo: notarial?.Periodo,
            GapPct:          gap?.GapPct,
            GapPeriodo:      gap?.Periodo
        );

        return Ok(dto);
    }

    // GET /api/anuncios/{id}/catastro
    // Proxy al Catastro para buscar datos catastrales del edificio
    // usando la dirección extraída del título del anuncio
    [HttpGet("{id:int}/catastro")]
    public async Task<ActionResult<CatastroResultDto>> GetCatastro(int id)
    {
        var anuncio = await db.Anuncios.FindAsync(id);
        if (anuncio is null) return NotFound();

        // Extraer calle y número del título
        var (calle, numero) = ExtraerDireccion(anuncio.Titulo ?? "");
        if (string.IsNullOrEmpty(calle))
        {
            return Ok(new CatastroResultDto(
                Encontrado: false,
                Error: "No se pudo extraer la dirección del título del anuncio",
                Inmuebles: []
            ));
        }

        // Determinar provincia desde la ciudad
        var provincia = MapCiudadAProvincia(anuncio.Ciudad, anuncio.Distrito);
        var municipio = MapCiudadAMunicipio(anuncio.Ciudad, anuncio.Distrito);

        var client = httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(10);

        try
        {
            // Consultar Catastro: buscar por dirección
            var catUrl = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPLOC";
            var queryParams = $"?Provincia={Uri.EscapeDataString(provincia)}" +
                              $"&Municipio={Uri.EscapeDataString(municipio)}" +
                              $"&Sigla=CL&Calle={Uri.EscapeDataString(calle)}" +
                              $"&Numero={numero}&Bloque=&Escalera=&Planta=&Puerta=";

            var resp = await client.GetStringAsync(catUrl + queryParams);
            var json = System.Text.Json.JsonDocument.Parse(resp);

            var result = json.RootElement.GetProperty("consulta_dnplocResult");

            // Check for errors
            if (result.TryGetProperty("lerr", out var lerr))
            {
                var errList = lerr.EnumerateArray().ToList();
                if (errList.Count > 0)
                {
                    var errMsg = errList[0].GetProperty("des").GetString() ?? "Error desconocido";
                    return Ok(new CatastroResultDto(
                        Encontrado: false,
                        Error: errMsg,
                        Inmuebles: []
                    ));
                }
            }

            var inmuebles = new List<CatastroInmuebleDto>();

            if (result.TryGetProperty("lrcdnp", out var lrcdnp) &&
                lrcdnp.TryGetProperty("rcdnp", out var rcdnp))
            {
                var items = rcdnp.ValueKind == System.Text.Json.JsonValueKind.Array
                    ? rcdnp.EnumerateArray().ToList()
                    : [rcdnp];

                foreach (var item in items)
                {
                    var rc = item.GetProperty("rc");
                    var refCatastral = $"{rc.GetProperty("pc1").GetString()}{rc.GetProperty("pc2").GetString()}";
                    var car = rc.TryGetProperty("car", out var carVal) ? carVal.GetString() : null;
                    var cc1 = rc.TryGetProperty("cc1", out var cc1Val) ? cc1Val.GetString() : null;
                    var cc2 = rc.TryGetProperty("cc2", out var cc2Val) ? cc2Val.GetString() : null;
                    var refCompleta = car != null
                        ? $"{refCatastral}{car}{cc1}{cc2}"
                        : refCatastral;

                    string? uso = null, superficie = null, anoConstruccion = null;
                    if (item.TryGetProperty("debi", out var debi))
                    {
                        uso = debi.TryGetProperty("luso", out var l) ? l.GetString() : null;
                        superficie = debi.TryGetProperty("sfc", out var s) ? s.GetString() : null;
                        anoConstruccion = debi.TryGetProperty("ant", out var a) ? a.GetString() : null;
                    }

                    // Extraer dirección
                    string? direccion = null, codigoPostal = null, planta = null, puerta = null;
                    if (item.TryGetProperty("dt", out var dt) &&
                        dt.TryGetProperty("locs", out var locs) &&
                        locs.TryGetProperty("lous", out var lous) &&
                        lous.TryGetProperty("lourb", out var lourb))
                    {
                        if (lourb.TryGetProperty("dir", out var dir))
                        {
                            var tv = dir.TryGetProperty("tv", out var tvVal) ? tvVal.GetString() : "";
                            var nv = dir.TryGetProperty("nv", out var nvVal) ? nvVal.GetString() : "";
                            var pnp = dir.TryGetProperty("pnp", out var pnpVal) ? pnpVal.GetString() : "";
                            direccion = $"{tv} {nv}, {pnp}".Trim().TrimEnd(',').Trim();
                        }
                        if (lourb.TryGetProperty("dp", out var dp))
                            codigoPostal = dp.GetString();
                        if (lourb.TryGetProperty("loint", out var loint))
                        {
                            planta = loint.TryGetProperty("pt", out var pt) ? pt.GetString() : null;
                            puerta = loint.TryGetProperty("pu", out var pu) ? pu.GetString() : null;
                        }
                    }

                    _ = double.TryParse(superficie, out var supM2);

                    inmuebles.Add(new CatastroInmuebleDto(
                        ReferenciaCatastral: refCompleta,
                        Uso:                uso ?? "Desconocido",
                        SuperficieM2:       supM2 > 0 ? supM2 : null,
                        AnoConstruccion:    anoConstruccion,
                        Direccion:          direccion,
                        CodigoPostal:       codigoPostal,
                        Planta:             planta,
                        Puerta:             puerta,
                        UrlCatastro:        $"https://www1.sedecatastro.gob.es/CYCBienInmwordle/OVCConCiwordle.aspx?RefC={refCompleta}"
                    ));
                }
            }

            // Filtrar solo residenciales si hay muchos
            var residenciales = inmuebles.Where(i => i.Uso == "Residencial").ToList();
            var resultado = residenciales.Count > 0 ? residenciales : inmuebles;

            return Ok(new CatastroResultDto(
                Encontrado: resultado.Count > 0,
                Error: resultado.Count == 0 ? "No se encontraron inmuebles residenciales" : null,
                Inmuebles: resultado.Take(20).ToList()
            ));
        }
        catch (Exception ex)
        {
            return Ok(new CatastroResultDto(
                Encontrado: false,
                Error: $"Error consultando Catastro: {ex.Message}",
                Inmuebles: []
            ));
        }
    }

    // GET /api/anuncios/ciudad/{ciudad}
    // Lista de anuncios reales por ciudad, paginable
    [HttpGet("ciudad/{ciudad}")]
    public async Task<ActionResult<IEnumerable<AnuncioResumenDto>>> GetPorCiudad(
        string ciudad,
        [FromQuery] int page = 1,
        [FromQuery] int size = 20)
    {
        var anuncios = await db.Anuncios
            .Where(a => a.Ciudad == ciudad && a.Activo)
            .OrderByDescending(a => a.FechaScraping)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(a => new AnuncioResumenDto(
                a.Id,
                a.Fuente,
                a.Titulo,
                a.PrecioTotal,
                a.PrecioM2,
                a.SuperficieM2,
                a.Habitaciones,
                a.Distrito,
                a.TipoInmueble,
                a.FechaScraping,
                a.Url
            ))
            .ToListAsync();

        return Ok(anuncios);
    }

    // ── Helpers de extracción de dirección ────────────────────────────────────

    /// <summary>
    /// Extrae calle y número del título del anuncio de Fotocasa.
    /// Ejemplos: "Piso con terraza en Oviedo - CALLE FERNANDO ALONSO, Santo Domingo"
    ///           "Piso en venta en calle Arzobispo Guisasola, 5"
    /// </summary>
    private static (string calle, string numero) ExtraerDireccion(string titulo)
    {
        if (string.IsNullOrWhiteSpace(titulo)) return ("", "");

        // Intentar extraer del formato "CALLE NOMBRE"
        var patrones = new[]
        {
            // "CALLE XXX, Barrio" o "calle xxx, 5"
            @"(?:CALLE|CL|AVENIDA|AV|AVDA|PASEO|PS|PLAZA|PL|TRAVESÍA)\s+([^,\-]+?)(?:\s*,\s*(\d+))?(?:\s*[-,]|$)",
            // "en calle xxx" 
            @"(?:en\s+)?(?:calle|cl|avenida|av|avda|paseo|plaza)\s+([^,\-]+?)(?:\s*,\s*(\d+))?(?:\s*[-,]|$)",
            // "- CALLE xxx" (after dash)
            @"-\s*(?:CALLE|CL)\s+([^,]+?)(?:\s*,\s*(\d+))?(?:\s*[-,]|$)",
        };

        foreach (var patron in patrones)
        {
            var match = System.Text.RegularExpressions.Regex.Match(
                titulo, patron, System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var calle = match.Groups[1].Value.Trim();
                var num = match.Groups.Count > 2 ? match.Groups[2].Value.Trim() : "1";
                if (string.IsNullOrEmpty(num)) num = "1";
                return (calle, num);
            }
        }

        return ("", "");
    }

    private static string MapCiudadAProvincia(string ciudad, string? distrito)
    {
        return ciudad.ToLower() switch
        {
            "madrid" => "MADRID",
            "barcelona" => "BARCELONA",
            "asturias" => distrito?.ToUpper() switch
            {
                "OVIEDO" => "ASTURIAS",
                "GIJÓN" => "ASTURIAS",
                "AVILÉS" => "ASTURIAS",
                _ => "ASTURIAS"
            },
            "valencia" => "VALENCIA",
            "sevilla" => "SEVILLA",
            _ => ciudad.ToUpper()
        };
    }

    private static string MapCiudadAMunicipio(string ciudad, string? distrito)
    {
        return ciudad.ToLower() switch
        {
            "madrid" => distrito?.ToUpper() ?? "MADRID",
            "barcelona" => distrito?.ToUpper() ?? "BARCELONA",
            "asturias" => distrito?.ToUpper() ?? "OVIEDO",
            "valencia" => distrito?.ToUpper() ?? "VALENCIA",
            "sevilla" => distrito?.ToUpper() ?? "SEVILLA",
            _ => distrito?.ToUpper() ?? ciudad.ToUpper()
        };
    }
}
