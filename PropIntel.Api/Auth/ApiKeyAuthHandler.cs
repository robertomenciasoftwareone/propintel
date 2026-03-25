using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace PropIntel.Api.Auth;

public class ApiKeyAuthOptions : AuthenticationSchemeOptions { }

public class ApiKeyAuthHandler(
    IOptionsMonitor<ApiKeyAuthOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration config
) : AuthenticationHandler<ApiKeyAuthOptions>(options, logger, encoder)
{
    private const string HeaderName = "X-Api-Key";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var key))
            return Task.FromResult(AuthenticateResult.Fail("Missing X-Api-Key header"));

        var validKey = config["ApiKey"];
        if (string.IsNullOrEmpty(validKey) || key != validKey)
            return Task.FromResult(AuthenticateResult.Fail("Invalid API key"));

        var claims  = new[] { new Claim(ClaimTypes.Name, "api-client") };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var ticket   = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
