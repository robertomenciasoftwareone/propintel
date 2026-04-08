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

    // ── Códigos verificados de series INE ───────────────────────────────────
    // IPV: Índice de Precios de Vivienda (Base 2007 = 100, trimestral, Nacional)
    // Verificados contra API: IPV1=Nacional.General.Índice, IPV3=Nacional.General.Var.anual
    private const string IpvIndiceGeneral     = "IPV1";   // Índice general nacional
    private const string IpvVarAnualGeneral   = "IPV3";   // Variación anual general  ← KPI principal
    private const string IpvIndiceNueva       = "IPV5";   // Índice nueva vivienda
    private const string IpvVarAnualNueva     = "IPV7";   // Variación anual nueva
    private const string IpvIndiceSegundaMano = "IPV9";   // Índice segunda mano
    private const string IpvVarAnualSegMano   = "IPV11";  // Variación anual segunda mano

    // HPT: Estadística de Hipotecas Total (mensual, Total Nacional)
    // Verificados: HPT10176=Número total nacional, HPT10123=Importe total nacional
    private const string HptNumeroNacional  = "HPT10176";
    private const string HptImporteNacional = "HPT10123";

    private const string IneBaseUrl = "https://servicios.ine.es/wstempus/js/ES";

    // ─── IPV: Índice de Precios de Vivienda ──────────────────────────────────

    /// <summary>
    /// Índice de Precios de Vivienda (IPV) nacional — INE.
    /// Devuelve la evolución trimestral: variación anual para General, Nueva y Segunda mano.
    /// </summary>
    [HttpGet("ine/ipv")]
    public async Task<IActionResult> GetIpv([FromQuery] int periodos = 8)
    {
        periodos = Math.Clamp(periodos, 2, 40);

        try
        {
            var series = new[]
            {
                (IpvVarAnualGeneral,  "IPV General — variación anual"),
                (IpvVarAnualNueva,    "Vivienda nueva — variación anual"),
                (IpvVarAnualSegMano,  "Segunda mano — variación anual"),
                (IpvIndiceGeneral,    "IPV General — índice (Base 2007)"),
                (IpvIndiceNueva,      "Vivienda nueva — índice (Base 2007)"),
                (IpvIndiceSegundaMano,"Segunda mano — índice (Base 2007)"),
            };

            var tareas = series.Select(async s =>
            {
                var url = $"{IneBaseUrl}/DATOS_SERIE/{s.Item1}?nult={periodos}&det=2";
                try
                {
                    var json = await _http.GetStringAsync(url);
                    using var doc = JsonDocument.Parse(json);
                    var datos = doc.RootElement
                        .GetProperty("Data")
                        .EnumerateArray()
                        .Select(d => new IneDataPointDto(
                            Periodo: d.TryGetProperty("NombrePeriodo", out var np) && np.ValueKind == JsonValueKind.String
                                     ? (np.GetString() ?? "") : FormatPeriodoIpv(d),
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

    /// <summary>
    /// Estadísticas de hipotecas total nacional — INE/HPT.
    /// Número e importe de hipotecas constituidas mensualmente.
    /// </summary>
    [HttpGet("ine/hipotecas")]
    public async Task<IActionResult> GetHipotecas([FromQuery] int periodos = 12)
    {
        periodos = Math.Clamp(periodos, 2, 48);

        try
        {
            var tareas = new[]
            {
                (HptNumeroNacional,  "Número de hipotecas — Total Nacional"),
                (HptImporteNacional, "Importe de hipotecas — Total Nacional (€)"),
            }.Select(async s =>
            {
                var url = $"{IneBaseUrl}/DATOS_SERIE/{s.Item1}?nult={periodos}&det=2";
                try
                {
                    var json = await _http.GetStringAsync(url);
                    using var doc = JsonDocument.Parse(json);
                    var datos = doc.RootElement
                        .GetProperty("Data")
                        .EnumerateArray()
                        .Select(d => new IneDataPointDto(
                            Periodo: d.TryGetProperty("NombrePeriodo", out var np) && np.ValueKind == JsonValueKind.String
                                     ? (np.GetString() ?? "") : FormatPeriodoMensual(d),
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

    /// <summary>
    /// Tipos de interés hipotecarios de referencia.
    /// Euribor 12 meses y tipo medio hipotecario (BdE/BCE).
    /// </summary>
    [HttpGet("bde/tipos-interes")]
    public async Task<IActionResult> GetTiposInteres()
    {
        // Intentar obtener Euribor 12M desde ECB Statistics
        double? euribor12m = null;
        string euriborFecha = "";
        string euriborFuente = "BCE / BdE";

        try
        {
            // ECB MIR: préstamos hipotecarios nuevos para adquisición vivienda libre, España
            // Dataset MIR, flow: M.ES.B.A2C.AM.R.A.2250.EUR.N
            var ecbUrl = "https://data.ecb.europa.eu/api/data/MIR/M.ES.B.A2C.AM.R.A.2250.EUR.N?lastNObservations=3&detail=dataonly&format=jsondata";
            var ecbJson = await _http.GetStringAsync(ecbUrl);
            using var ecbDoc = JsonDocument.Parse(ecbJson);

            if (ecbDoc.RootElement.TryGetProperty("dataSets", out var ds))
            {
                var obs = ds[0].GetProperty("series").EnumerateObject().First().Value
                              .GetProperty("observations");
                var keys = obs.EnumerateObject().OrderBy(o => int.Parse(o.Name)).ToList();
                if (keys.Count > 0)
                {
                    var last = keys[^1].Value[0];
                    if (last.ValueKind != JsonValueKind.Null)
                        euribor12m = last.GetDouble();

                    // Extract period from dimension structure
                    if (ecbDoc.RootElement.TryGetProperty("structure", out var struct_))
                    {
                        var timeDim = struct_.GetProperty("dimensions").GetProperty("observation")[0]
                                            .GetProperty("values").EnumerateArray()
                                            .Skip(keys.Count - 1).First();
                        euriborFecha = timeDim.GetProperty("id").GetString() ?? "";
                    }
                }
            }
        }
        catch
        {
            // BdE/ECB no disponible — usar valor de referencia
        }

        var datos = new[]
        {
            new BdeTipoInteresDto(
                Fecha:           string.IsNullOrEmpty(euriborFecha)
                                     ? DateTime.UtcNow.AddMonths(-2).ToString("yyyy-MM")
                                     : euriborFecha,
                TipoHipotecario: euribor12m,
                Euribor:         euribor12m
            )
        };

        return Ok(new
        {
            fuente        = euriborFuente,
            descripcion   = "Tipo de interés hipotecario para adquisición de vivienda libre — España",
            disponible    = euribor12m.HasValue,
            urlReferencia = "https://www.bde.es/webbde/es/estadis/infoest/bolest12.html",
            datos
        });
    }

    /// <summary>
    /// Resumen ejecutivo: último IPV, hipotecas y tipos de interés.
    /// </summary>
    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen()
    {
        try
        {
            var tareaIpv     = FetchLastValue(IpvVarAnualGeneral,  $"{IneBaseUrl}/DATOS_SERIE/{IpvVarAnualGeneral}?nult=2&det=2");
            var tareaHipNum  = FetchLastValue(HptNumeroNacional,   $"{IneBaseUrl}/DATOS_SERIE/{HptNumeroNacional}?nult=2&det=2");
            var tareaHipImp  = FetchLastValue(HptImporteNacional,  $"{IneBaseUrl}/DATOS_SERIE/{HptImporteNacional}?nult=2&det=2");

            await Task.WhenAll(tareaIpv, tareaHipNum, tareaHipImp);

            var (ipvValor, ipvPeriodo) = tareaIpv.Result;
            var (hipNumValor, hipNumPeriodo) = tareaHipNum.Result;
            var (hipImpValor, _) = tareaHipImp.Result;

            return Ok(new
            {
                ipvVarAnual = new
                {
                    valor   = ipvValor,
                    periodo = ipvPeriodo,
                    unidad  = "%",
                    fuente  = "INE — IPV Base 2007"
                },
                hipotecasNumero = new
                {
                    valor   = hipNumValor,
                    periodo = hipNumPeriodo,
                    unidad  = "hipotecas/mes",
                    fuente  = "INE — Estadística Hipotecas"
                },
                hipotecasImporte = new
                {
                    valor  = hipImpValor,
                    unidad = "miles € medio",
                    fuente = "INE — Estadística Hipotecas"
                },
                fuentes = new[]
                {
                    new { nombre = "INE — IPV",       url = "https://www.ine.es/jaxiT3/Tabla.htm?t=25171" },
                    new { nombre = "INE — Hipotecas", url = "https://www.ine.es/jaxiT3/Tabla.htm?t=24457" },
                    new { nombre = "Banco de España", url = "https://www.bde.es/webbde/es/estadis/infoest/bolest12.html" },
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = "Error al obtener resumen de estadísticas", detail = ex.Message });
        }
    }

    // ─── Helpers privados ───────────────────────────────────────────────────

    private async Task<(double? valor, string periodo)> FetchLastValue(string serie, string url)
    {
        try
        {
            var json = await _http.GetStringAsync(url);
            using var doc = JsonDocument.Parse(json);
            var last = doc.RootElement.GetProperty("Data").EnumerateArray().LastOrDefault();
            if (last.ValueKind == JsonValueKind.Undefined) return (null, "");

            double? val = null;
            if (last.TryGetProperty("Valor", out var v) && v.ValueKind != JsonValueKind.Null)
                val = v.GetDouble();

            string periodo = last.TryGetProperty("NombrePeriodo", out var np) && np.ValueKind == JsonValueKind.String
                            ? (np.GetString() ?? "") : "";
            return (val, periodo);
        }
        catch { return (null, ""); }
    }

    private static string FormatPeriodoIpv(JsonElement d)
    {
        if (!d.TryGetProperty("Anyo", out var y)) return "";
        int anyo = y.GetInt32();
        if (d.TryGetProperty("FK_Periodo", out var pk))
        {
            int cod = pk.GetInt32();
            string trim = cod switch { 22 => "T1", 23 => "T2", 24 => "T3", 25 => "T4", _ => $"P{cod}" };
            return $"{anyo} {trim}";
        }
        return $"{anyo}";
    }

    private static string FormatPeriodoMensual(JsonElement d)
    {
        if (!d.TryGetProperty("Anyo", out var y)) return "";
        int anyo = y.GetInt32();
        if (d.TryGetProperty("FK_Periodo", out var pk))
        {
            int mes = pk.GetInt32() - 21; // INE: 22=Jan…33=Dec (offset 21)
            if (mes >= 1 && mes <= 12)
                return $"{anyo}-{mes:D2}";
        }
        return $"{anyo}";
    }
}
