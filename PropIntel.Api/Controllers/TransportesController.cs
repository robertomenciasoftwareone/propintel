using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PropIntel.Api.Controllers;

public record TransporteStopDto(string Nombre, string Tipo, double Lat, double Lon, string Fuente);

[AllowAnonymous]
[ApiController]
[Route("api/transportes")]
public class TransportesController(IHttpClientFactory httpFactory) : ControllerBase
{
    // Fuente real OSM Overpass (sin API key) para estaciones y paradas de transporte.
    private const string OverpassUrl = "https://overpass-api.de/api/interpreter";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransporteStopDto>>> Get(
        [FromQuery] double? minLat,
        [FromQuery] double? minLon,
        [FromQuery] double? maxLat,
        [FromQuery] double? maxLon)
    {
        // BBox Madrid por defecto.
        var a = minLat ?? 40.30;
        var b = minLon ?? -3.89;
        var c = maxLat ?? 40.55;
        var d = maxLon ?? -3.55;

        if (a >= c || b >= d)
            return BadRequest("bbox invalida");

        var query = BuildOverpassQuery(a, b, c, d);
        using var client = httpFactory.CreateClient();

        try
        {
            var content = new StringContent(query, Encoding.UTF8, "text/plain");
            using var resp = await client.PostAsync(OverpassUrl, content);
            resp.EnsureSuccessStatusCode();

            await using var stream = await resp.Content.ReadAsStreamAsync();
            using var doc = await JsonDocument.ParseAsync(stream);

            var list = new List<TransporteStopDto>();
            if (!doc.RootElement.TryGetProperty("elements", out var elements))
                return Ok(list);

            foreach (var e in elements.EnumerateArray())
            {
                if (!e.TryGetProperty("lat", out var latEl) || !e.TryGetProperty("lon", out var lonEl))
                    continue;

                var lat = latEl.GetDouble();
                var lon = lonEl.GetDouble();
                var tags = e.TryGetProperty("tags", out var t) ? t : default;

                var name = tags.ValueKind != JsonValueKind.Undefined && tags.TryGetProperty("name", out var n)
                    ? n.GetString() ?? "Parada"
                    : "Parada";

                var tipo = "transporte";
                if (tags.ValueKind != JsonValueKind.Undefined)
                {
                    if (tags.TryGetProperty("station", out var station))
                    {
                        var v = station.GetString()?.ToLowerInvariant();
                        if (v == "subway") tipo = "metro";
                        else if (v == "train") tipo = "cercanias";
                    }
                    else if (tags.TryGetProperty("railway", out var railway))
                    {
                        var v = railway.GetString()?.ToLowerInvariant();
                        if (v is "station" or "halt") tipo = "cercanias";
                    }
                    else if (tags.TryGetProperty("public_transport", out var pt) && pt.GetString() == "station")
                    {
                        tipo = "intercambiador";
                    }
                }

                list.Add(new TransporteStopDto(name, tipo, lat, lon, "OpenStreetMap/Overpass"));
            }

            return Ok(list.Take(300));
        }
        catch
        {
            // Lista completa de paradas/estaciones principales de Madrid para fallback
            return Ok(new[]
            {
                // Metro
                new TransporteStopDto("Sol", "metro", 40.4169, -3.7035, "fallback"),
                new TransporteStopDto("Retiro", "metro", 40.4153, -3.6833, "fallback"),
                new TransporteStopDto("Atocha", "metro", 40.4066, -3.6890, "fallback"),
                new TransporteStopDto("Goya", "metro", 40.4301, -3.6792, "fallback"),
                new TransporteStopDto("Paseo de Recoletos", "metro", 40.4227, -3.6878, "fallback"),
                new TransporteStopDto("Sevilla", "metro", 40.4142, -3.6948, "fallback"),
                new TransporteStopDto("Banco de España", "metro", 40.4197, -3.6917, "fallback"),
                new TransporteStopDto("Chueca", "metro", 40.4267, -3.6997, "fallback"),
                new TransporteStopDto("Alonso Martínez", "metro", 40.4282, -3.6945, "fallback"),
                new TransporteStopDto("Embajadores", "metro", 40.4032, -3.6975, "fallback"),
                new TransporteStopDto("Lavapiés", "metro", 40.4081, -3.7025, "fallback"),
                new TransporteStopDto("Tirso de Molina", "metro", 40.4104, -3.7045, "fallback"),
                new TransporteStopDto("La Latina", "metro", 40.4100, -3.7130, "fallback"),
                new TransporteStopDto("Plaza Mayor", "metro", 40.4163, -3.7123, "fallback"),
                new TransporteStopDto("Callao", "metro", 40.4248, -3.7074, "fallback"),
                new TransporteStopDto("Gran Vía", "metro", 40.4194, -3.7019, "fallback"),
                new TransporteStopDto("Moncloa", "intercambiador", 40.4355, -3.7196, "fallback"),
                new TransporteStopDto("Nuevos Ministerios", "intercambiador", 40.4468, -3.6922, "fallback"),
                new TransporteStopDto("Chamartín", "cercanias", 40.4720, -3.6827, "fallback"),
                new TransporteStopDto("Recoletos", "cercanias", 40.4227, -3.6878, "fallback"),
                new TransporteStopDto("Príncipe de Vergara", "metro", 40.4357, -3.6792, "fallback"),
                new TransporteStopDto("Colón", "metro", 40.4319, -3.6876, "fallback"),
                new TransporteStopDto("Serrano", "metro", 40.4334, -3.6823, "fallback"),
                new TransporteStopDto("Ibiza", "metro", 40.4354, -3.6735, "fallback"),
                new TransporteStopDto("Sainz de Baranda", "metro", 40.4271, -3.6743, "fallback")
            });
        }
    }

    private static string BuildOverpassQuery(double minLat, double minLon, double maxLat, double maxLon)
    {
        string F(double x) => x.ToString(CultureInfo.InvariantCulture);
        var bbox = $"{F(minLat)},{F(minLon)},{F(maxLat)},{F(maxLon)}";

        // Consulta amplia: metro + cercanías + autobús + estaciones
        return $@"[out:json][timeout:30];
(
    node[""railway""=""station""]({bbox});
    node[""station""=""subway""]({bbox});
    node[""public_transport""=""station""]({bbox});
    node[""railway""=""halt""]({bbox});
    node[""amenity""=""bus_station""]({bbox});
    node[""highway""=""bus_stop""]({bbox});
    node[""public_transport""=""stop_position""]({bbox});
);
out body;";
    }
}
