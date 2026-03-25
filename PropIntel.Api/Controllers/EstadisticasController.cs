using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropIntel.Api.Models;

namespace PropIntel.Api.Controllers;

/// <summary>
/// Estadísticas oficiales de vivienda: INE (IPV, hipotecas) y Banco de España.
/// Todas las fuentes son públicas y gratuitas (sin API key).
/// </summary>
[Authorize]
[ApiController]
[Route("api/estadisticas")]
public class EstadisticasController : ControllerBase
{
    private static readonly HttpClient _http = new()
    {
        Timeout = TimeSpan.FromSeconds(20),
        DefaultRequestHeaders = { { "Accept", "application/json" } }
    };

    // Códigos de series del INE
    // IPV: Índice de Precios de Vivienda (base 2015=100)
    private const string IneIpvNacional    = "IPV0038"; // IPV general nacional
    private const string IneIpvNuevaVivienda = "IPV0039";
    private const string IneIpvSegundaMano = "IPV0040";

    // IneBaseUrl: API REST JSON del INE
    private const string IneBaseUrl = "https://servicios.ine.es/wstempus/js/ES";

    // ─── IPV: Índice de Precios de Vivienda ──────────────────────────────────

    // GET /api/estadisticas/ine/ipv?periodos=8
    /// <summary>
    /// Índice de Precios de Vivienda (IPV) nacional — INE.
    /// Devuelve la evolución trimestral del IPV general, vivienda nueva y segunda mano.
    /// </summary>
    [HttpGet("ine/ipv")]
    public async Task<IActionResult> GetIpv([FromQuery] int periodos = 8)
    {
        periodos = Math.Clamp(periodos, 2, 40);

        try
        {
            var series = new[]
            {
                (IneIpvNacional,      "IPV General"),
                (IneIpvNuevaVivienda, "Vivienda nueva"),
                (IneIpvSegundaMano,   "Segunda mano"),
            };

            var tareas = series.Select(async s =>
            {
                var url = $"{IneBaseUrl}/DATOS_SERIE/{s.Item1}?nult={periodos}&det=0";
                try
                {
                    var json = await _http.GetStringAsync(url);
                    using var doc = JsonDocument.Parse(json);
                    var datos = doc.RootElement
                        .GetProperty("Data")
                        .EnumerateArray()
                        .Select(d => new IneDataPointDto(
                            Periodo: d.GetProperty("NombrePeriodo").GetString() ?? "",
                            Valor:   d.TryGetProperty("Valor", out var v) && v.ValueKind != JsonValueKind.Null
                                     ? v.GetDouble() : null
                        ))
                        .ToList();

                    return new IneIpvDto(Serie: s.Item1, Descripcion: s.Item2, Datos: datos);
                }
                catch
                {
                    return new IneIpvDto(Serie: s.Item1, Descripcion: s.Item2, Datos: []);
                }
            });

            var resultado = await Task.WhenAll(tareas);
            return Ok(resultado);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = "Error al obtener datos del INE", detail = ex.Message });
        }
    }

    // GET /api/estadisticas/ine/hipotecas?periodos=12
    /// <summary>
    /// Estadísticas de hipotecas sobre viviendas — INE.
    /// Número de hipotecas constituidas y capital prestado medio mensual.
    /// </summary>
    [HttpGet("ine/hipotecas")]
    public async Task<IActionResult> GetHipotecas([FromQuery] int periodos = 12)
    {
        periodos = Math.Clamp(periodos, 2, 48);

        // Serie INE: hipotecas constituidas sobre viviendas (mensual)
        const string serieNum    = "EH0020"; // Número de hipotecas
        const string serieImport = "EH0023"; // Importe medio

        try
        {
            var tareas = new[]
            {
                (serieNum,    "Número de hipotecas"),
                (serieImport, "Importe medio (€)"),
            }.Select(async s =>
            {
                var url = $"{IneBaseUrl}/DATOS_SERIE/{s.Item1}?nult={periodos}&det=0";
                try
                {
                    var json = await _http.GetStringAsync(url);
                    using var doc = JsonDocument.Parse(json);
                    var datos = doc.RootElement
                        .GetProperty("Data")
                        .EnumerateArray()
                        .Select(d => new IneDataPointDto(
                            Periodo: d.GetProperty("NombrePeriodo").GetString() ?? "",
                            Valor:   d.TryGetProperty("Valor", out var v) && v.ValueKind != JsonValueKind.Null
                                     ? v.GetDouble() : null
                        ))
                        .ToList();

                    return new IneIpvDto(Serie: s.Item1, Descripcion: s.Item2, Datos: datos);
                }
                catch
                {
                    return new IneIpvDto(Serie: s.Item1, Descripcion: s.Item2, Datos: []);
                }
            });

            var resultado = await Task.WhenAll(tareas);
            return Ok(resultado);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = "Error al obtener hipotecas del INE", detail = ex.Message });
        }
    }

    // GET /api/estadisticas/bde/tipos-interes
    /// <summary>
    /// Tipos de interés hipotecarios — Banco de España.
    /// Tipo medio de préstamos hipotecarios para adquisición de vivienda libre.
    /// </summary>
    [HttpGet("bde/tipos-interes")]
    public async Task<IActionResult> GetTiposInteres()
    {
        try
        {
            // Devolvemos referencia a los datos públicos del BdE.
            // Su API SDMX requiere configuración adicional; se provee URL de referencia.
            var datos = new[]
            {
                new BdeTipoInteresDto(
                    Fecha:            DateTime.UtcNow.ToString("yyyy-MM"),
                    TipoHipotecario:  null,
                    Euribor:          null
                )
            };

            return Ok(new
            {
                fuente      = "Banco de España",
                descripcion = "Tipos de interés hipotecarios. Para datos en tiempo real consulte:",
                urlReferencia = "https://www.bde.es/webbde/es/estadis/infoest/bolest12.html",
                urlSdmx     = "https://www.bde.es/api/estadisticas/v2/datos?c=BI_1_1&p=12M&n=12",
                datos
            });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = "Error al obtener datos del Banco de España", detail = ex.Message });
        }
    }

    // GET /api/estadisticas/resumen
    /// <summary>
    /// Resumen ejecutivo con los últimos datos disponibles de todas las fuentes.
    /// </summary>
    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen()
    {
        try
        {
            // IPV último trimestre
            var urlIpv = $"{IneBaseUrl}/DATOS_SERIE/{IneIpvNacional}?nult=2&det=0";
            var ipvJson = await _http.GetStringAsync(urlIpv);
            using var ipvDoc = JsonDocument.Parse(ipvJson);

            var ipvData = ipvDoc.RootElement
                .GetProperty("Data")
                .EnumerateArray()
                .LastOrDefault();

            double? ipvValor = null;
            string? ipvPeriodo = null;
            if (ipvData.ValueKind != JsonValueKind.Undefined)
            {
                ipvPeriodo = ipvData.GetProperty("NombrePeriodo").GetString();
                if (ipvData.TryGetProperty("Valor", out var v) && v.ValueKind != JsonValueKind.Null)
                    ipvValor = v.GetDouble();
            }

            return Ok(new
            {
                ipv = new { valor = ipvValor, periodo = ipvPeriodo, base2015 = 100 },
                fuentes = new[]
                {
                    new { nombre = "INE - IPV", url = "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736152838&menu=ultiDatos&idp=1254735976607" },
                    new { nombre = "INE - Hipotecas", url = "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736170236&menu=ultiDatos&idp=1254735576757" },
                    new { nombre = "Banco de España", url = "https://www.bde.es/webbde/es/estadis/infoest/bolest12.html" },
                    new { nombre = "Catastro", url = "https://www.catastro.meh.es" },
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = "Error al obtener resumen de estadísticas", detail = ex.Message });
        }
    }
}
