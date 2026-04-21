using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace PropIntel.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/gemini")]
public class GeminiController(IHttpClientFactory httpFactory, IConfiguration config) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] JsonElement body)
    {
        var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY")
                  ?? config["Gemini:ApiKey"]
                  ?? "";

        if (string.IsNullOrWhiteSpace(apiKey))
            return StatusCode(503, new { error = "Gemini API key not configured on server." });

        var client = httpFactory.CreateClient();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}";

        var json = body.GetRawText();
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync(url, content);
        var responseBody = await response.Content.ReadAsStringAsync();

        return StatusCode((int)response.StatusCode, JsonSerializer.Deserialize<JsonElement>(responseBody));
    }

    [HttpPost("vision")]
    public async Task<IActionResult> Vision([FromBody] JsonElement body)
    {
        var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY")
                  ?? config["Gemini:ApiKey"]
                  ?? "";

        if (string.IsNullOrWhiteSpace(apiKey))
            return StatusCode(503, new { error = "Gemini API key not configured on server." });

        var client = httpFactory.CreateClient();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}";

        var json = body.GetRawText();
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync(url, content);
        var responseBody = await response.Content.ReadAsStringAsync();

        return StatusCode((int)response.StatusCode, JsonSerializer.Deserialize<JsonElement>(responseBody));
    }
}
