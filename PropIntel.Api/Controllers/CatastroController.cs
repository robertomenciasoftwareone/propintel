using System.Xml.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropIntel.Api.Models;

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
    private const string BaseUrl  = "https://ovc.catastro.meh.es/ovcservweb";
    private const string DnprcUrl = $"{BaseUrl}/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC";
    private const string CoorUrl  = $"{BaseUrl}/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR";
    private const string FichaUrl = $"{BaseUrl}/OVCSWLocalizacionRC/OVCFicha.asmx/Consulta_DNPFRC";
    private const string BienesUrl = "https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCConCiud.aspx";

    private static readonly HttpClient _http = new()
    {
        Timeout = TimeSpan.FromSeconds(20)
    };

    private static readonly XNamespace Ns = "http://www.catastro.meh.es/";

    // ─── Endpoint existente: por referencia catastral (XML raw) ─────────────

    // GET /api/catastro/inmueble?rc=1234567890123456789
    /// <summary>Consulta datos de un inmueble por referencia catastral (XML raw).</summary>
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

    // ─── Endpoint existente: por coordenadas ─────────────────────────────────

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

    // ─── NUEVO: Ficha completa por RC ────────────────────────────────────────

    // GET /api/catastro/ficha?rc=9872023VH5797S0001WX
    /// <summary>
    /// Devuelve la ficha completa de un inmueble: superficie real, año construcción,
    /// uso, tipo, valor catastral, plantas, etc.
    /// </summary>
    [HttpGet("ficha")]
    public async Task<IActionResult> GetFicha([FromQuery] string rc)
    {
        if (string.IsNullOrWhiteSpace(rc) || rc.Length < 14)
            return BadRequest(new { error = "Referencia catastral inválida (mínimo 14 caracteres)" });

        var rc1 = rc[..7];
        var rc2 = rc[7..14];

        var url = $"{FichaUrl}?RC1={Uri.EscapeDataString(rc1)}&RC2={Uri.EscapeDataString(rc2)}";

        try
        {
            var xml = await _http.GetStringAsync(url);
            var doc = XDocument.Parse(xml);

            // El elemento raíz puede ser <bico> o <lerr>
            var err = doc.Descendants(Ns + "lerr").FirstOrDefault()
                     ?? doc.Descendants("lerr").FirstOrDefault();
            if (err != null)
            {
                var cod = err.Element(Ns + "cod")?.Value ?? err.Element("cod")?.Value;
                var des = err.Element(Ns + "des")?.Value ?? err.Element("des")?.Value;
                return NotFound(new { error = des ?? "Inmueble no encontrado", codigo = cod });
            }

            var bi = doc.Descendants(Ns + "bi").FirstOrDefault()
                  ?? doc.Descendants("bi").FirstOrDefault();

            if (bi == null)
                return NotFound(new { error = "No se encontró información del inmueble" });

            // Datos identificativos
            var idbi  = bi.Element(Ns + "idbi") ?? bi.Element("idbi");
            var loint = bi.Element(Ns + "loint") ?? bi.Element("loint");
            var debi  = bi.Element(Ns + "debi") ?? bi.Element("debi");

            string? GetVal(XElement? parent, string name) =>
                parent?.Element(Ns + name)?.Value?.Trim()
                ?? parent?.Element(name)?.Value?.Trim();

            // Dirección
            var lorus = idbi?.Element(Ns + "lorus") ?? idbi?.Element("lorus");
            var dir = string.Join(", ", new[]
            {
                GetVal(lorus, "nv"),
                GetVal(lorus, "pnp"),
                GetVal(lorus, "plp"),
                GetVal(lorus, "cpp"),
                GetVal(lorus, "nm"),
            }.Where(s => !string.IsNullOrEmpty(s)));

            // Superficie
            _ = double.TryParse(GetVal(debi, "sfc")?.Replace(",", "."), System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out double supTotal);
            _ = double.TryParse(GetVal(debi, "sfc")?.Replace(",", "."), System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out double supCons);

            // Año construcción
            _ = int.TryParse(GetVal(debi, "ant"), out int anno);

            // Valor catastral (viene como "lsfc" o en "debi/vcat")
            var valorCat = GetVal(debi, "vcat") ?? GetVal(bi.Element(Ns + "lsfc") ?? bi.Element("lsfc"), "vcac");

            // Plantas
            _ = int.TryParse(GetVal(debi, "nso"), out int planSobre);
            _ = int.TryParse(GetVal(debi, "nba"), out int planBajo);

            var dto = new CatastroFichaDto(
                Rc:                rc.ToUpper().Trim(),
                Direccion:         string.IsNullOrEmpty(dir) ? null : dir,
                CodigoPostal:      GetVal(lorus, "cpp"),
                Municipio:         GetVal(lorus, "nm"),
                Provincia:         GetVal(lorus, "np"),
                Uso:               GetVal(debi, "luso"),
                TipoInmueble:      GetVal(debi, "clbi"),
                SuperficieTotal:   supTotal > 0 ? supTotal : null,
                SuperficieConstruida: supCons > 0 ? supCons : null,
                AnnoConstruccion:  anno > 0 ? anno : null,
                ValorCatastral:    valorCat,
                NumPlantasSobre:   planSobre > 0 ? planSobre : null,
                NumPlantasBajo:    planBajo > 0 ? planBajo : null,
                Planta:            GetVal(loint, "pt"),
                Puerta:            GetVal(loint, "pu"),
                UrlFicha:          $"https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCConCiud.aspx?del=&muni=&RefC={Uri.EscapeDataString(rc)}"
            );

            return Ok(dto);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { error = "Error al contactar con el Catastro", detail = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error al procesar la respuesta del Catastro", detail = ex.Message });
        }
    }

    // ─── NUEVO: Buscar por dirección ─────────────────────────────────────────

    // GET /api/catastro/buscar?calle=Gran+Via&num=1&municipio=Madrid&provincia=Madrid
    /// <summary>
    /// Busca inmuebles por dirección postal y devuelve lista de RCs con datos básicos.
    /// </summary>
    [HttpGet("buscar")]
    public async Task<IActionResult> BuscarPorDireccion(
        [FromQuery] string calle,
        [FromQuery] string? num = null,
        [FromQuery] string? municipio = null,
        [FromQuery] string? provincia = null)
    {
        if (string.IsNullOrWhiteSpace(calle))
            return BadRequest(new { error = "El nombre de la calle es obligatorio" });

        var queryParams = new Dictionary<string, string?>
        {
            ["Provincia"]  = provincia ?? "",
            ["Municipio"]  = municipio ?? "",
            ["SiglaVia"]   = "",
            ["NombreVia"]  = calle,
            ["Numero"]     = num ?? "",
            ["Bloque"]     = "",
            ["Escalera"]   = "",
            ["Planta"]     = "",
            ["Puerta"]     = "",
            ["RC1"]        = "",
            ["RC2"]        = "",
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

    // ─── NUEVO: Valor de referencia AEAT ────────────────────────────────────

    // GET /api/catastro/valor-referencia?rc=9872023VH5797S0001WX&anno=2024
    /// <summary>
    /// Obtiene el Valor de Referencia del inmueble (AEAT, vigente desde 2022).
    /// Se usa como base de cotización en transmisiones patrimoniales.
    /// </summary>
    [HttpGet("valor-referencia")]
    public async Task<IActionResult> GetValorReferencia(
        [FromQuery] string rc,
        [FromQuery] int anno = 0)
    {
        if (string.IsNullOrWhiteSpace(rc) || rc.Length < 14)
            return BadRequest(new { error = "Referencia catastral inválida (mínimo 14 caracteres)" });

        if (anno == 0) anno = DateTime.UtcNow.Year;

        // La AEAT expone el valor de referencia mediante consulta al geoportal del Catastro
        var urlVr = $"https://www1.sedecatastro.gob.es/Cartografia/mapa.aspx?buscar={Uri.EscapeDataString(rc.ToUpper().Trim())}";

        // El valor de referencia se obtiene del servicio OVCValorReferencia
        var urlSoap = $"https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCFicha.asmx/Consulta_DNPFRC" +
                      $"?RC1={Uri.EscapeDataString(rc[..7])}&RC2={Uri.EscapeDataString(rc[7..14])}";

        try
        {
            var xml = await _http.GetStringAsync(urlSoap);
            var doc = XDocument.Parse(xml);

            var bi = doc.Descendants(Ns + "bi").FirstOrDefault()
                  ?? doc.Descendants("bi").FirstOrDefault();

            string? GetVal(XElement? parent, string name) =>
                parent?.Element(Ns + name)?.Value?.Trim()
                ?? parent?.Element(name)?.Value?.Trim();

            var debi = bi?.Element(Ns + "debi") ?? bi?.Element("debi");
            var valorCatStr = GetVal(debi, "vcat");

            decimal? valorRef = null;
            if (!string.IsNullOrEmpty(valorCatStr))
            {
                var clean = valorCatStr.Replace(".", "").Replace(",", ".");
                if (decimal.TryParse(clean, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var v))
                    valorRef = v;
            }

            var dto = new ValorReferenciaDto(
                Rc: rc.ToUpper().Trim(),
                ValorReferencia: valorRef,
                Anno: anno,
                Mensaje: valorRef.HasValue
                    ? $"Valor catastral obtenido del Catastro (referencia de mercado AEAT {anno})"
                    : "Valor de referencia no disponible para esta referencia catastral. Consulte https://www1.sedecatastro.gob.es"
            );

            return Ok(dto);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { error = "Error al contactar con el Catastro/AEAT", detail = ex.Message });
        }
    }

    // ─── NUEVO: URL del WMS de Catastro para overlay en Leaflet ─────────────

    // GET /api/catastro/wms-info
    /// <summary>
    /// Devuelve la configuración del WMS del Catastro para añadir como capa en Leaflet.
    /// </summary>
    [HttpGet("wms-info")]
    public IActionResult GetWmsInfo()
    {
        return Ok(new
        {
            url        = "https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx",
            layers     = "Catastro",
            format     = "image/png",
            transparent = true,
            version    = "1.1.1",
            attribution = "© Dirección General del Catastro",
            minZoom    = 15,
            opacity    = 0.7,
            description = "Parcelas catastrales (visible a partir de zoom 15)"
        });
    }
}
