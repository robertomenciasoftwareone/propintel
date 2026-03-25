using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PropIntel.Api.Controllers;

/// <summary>
/// Proxy para la API pública SOAP del Catastro español.
/// Evita problemas de CORS al llamar desde el frontend Angular.
/// </summary>
[Authorize]
[ApiController]
[Route("api/catastro")]
public class CatastroController : ControllerBase
{
    private const string BaseUrl = "https://ovc.catastro.meh.es/ovcservweb";
    private const string DnprcUrl = $"{BaseUrl}/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC";
    private const string CoorUrl  = $"{BaseUrl}/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR";

    private static readonly HttpClient _http = new()
    {
        Timeout = TimeSpan.FromSeconds(15)
    };

    // GET /api/catastro/inmueble?rc=1234567890123456789
    /// <summary>Consulta datos de un inmueble por referencia catastral.</summary>
    [HttpGet("inmueble")]
    public async Task<IActionResult> GetByReferencia([FromQuery] string rc)
    {
        if (string.IsNullOrWhiteSpace(rc) || rc.Length < 14)
            return BadRequest(new { error = "Referencia catastral inválida (mínimo 14 caracteres)" });

        var rc1 = rc[..7];
        var rc2 = rc[7..14];

        var queryParams = new Dictionary<string, string?>
        {
            ["Provincia"] = "", ["Municipio"] = "",
            ["SiglaVia"]  = "", ["NombreVia"] = "",
            ["Numero"]    = "", ["Bloque"]    = "",
            ["Escalera"]  = "", ["Planta"]    = "",
            ["Puerta"]    = "",
            ["RC1"] = rc1,
            ["RC2"] = rc2,
        };

        var url = DnprcUrl + "?" + string.Join("&",
            queryParams.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value ?? "")}"));

        try
        {
            var xml = await _http.GetStringAsync(url);
            return Content(xml, "application/xml");
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { error = "Error al contactar con el Catastro", detail = ex.Message });
        }
    }

    // GET /api/catastro/coordenadas?lat=40.4168&lon=-3.7038
    /// <summary>Obtiene la referencia catastral más cercana a unas coordenadas.</summary>
    [HttpGet("coordenadas")]
    public async Task<IActionResult> GetByCoordenadas(
        [FromQuery] double lat,
        [FromQuery] double lon)
    {
        if (lat < 27 || lat > 44 || lon < -19 || lon > 5)
            return BadRequest(new { error = "Coordenadas fuera del rango de España" });

        var url = $"{CoorUrl}?SRS=EPSG:4326&Coordenada_X={lon}&Coordenada_Y={lat}";

        try
        {
            var xml = await _http.GetStringAsync(url);
            return Content(xml, "application/xml");
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { error = "Error al contactar con el Catastro", detail = ex.Message });
        }
    }
}
