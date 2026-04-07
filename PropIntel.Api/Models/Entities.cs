using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PropIntel.Api.Models;

[Table("municipios")]
public class Municipio
{
    [Key] public string IdIne { get; set; } = "";         // "28079" = Madrid
    public string Nombre { get; set; } = "";
    public string NombreNorm { get; set; } = "";          // sin tildes, minúsculas
    public string? Provincia { get; set; }
    public string? Comunidad { get; set; }
    public int? Poblacion { get; set; }
    public bool TieneDatos { get; set; } = false;
    public double? Lat { get; set; }
    public double? Lon { get; set; }
    public string? SlugIdealista { get; set; }
    public string? SlugFotocasa { get; set; }
    public DateTime? ActualizadoEn { get; set; }
}

[Table("datos_notariales")]
public class DatoNotarial
{
    [Key] public int Id { get; set; }
    public string Ciudad { get; set; } = "";
    public string Municipio { get; set; } = "";
    public string? CodigoPostal { get; set; }
    public double PrecioMedioM2 { get; set; }
    public double? PrecioMinM2 { get; set; }
    public double? PrecioMaxM2 { get; set; }
    public int NumTransacciones { get; set; }
    public string Periodo { get; set; } = "";       // "2026-03"
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}

[Table("anuncios")]
public class Anuncio
{
    [Key] public int Id { get; set; }
    public string IdExterno { get; set; } = "";
    public string Fuente { get; set; } = "";
    public string Url { get; set; } = "";
    public string? Titulo { get; set; }
    public int PrecioTotal { get; set; }
    public double? PrecioM2 { get; set; }
    public double? SuperficieM2 { get; set; }
    public int? Habitaciones { get; set; }
    public string Ciudad { get; set; } = "";
    public string? Distrito { get; set; }
    public string? TipoInmueble { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaScraping { get; set; } = DateTime.UtcNow;
    public string? Cp { get; set; }
    public double? Lat { get; set; }
    public double? Lon { get; set; }
    public string? CanonicalKey { get; set; }
}

[Table("codigos_postales")]
public class CodigoPostal
{
    [Key] public string Cp { get; set; } = "";
    public string? Nombre { get; set; }
    public string? Provincia { get; set; }
    public double? Lat { get; set; }
    public double? Lon { get; set; }
    public string? MunicipioIne { get; set; }
}

[Table("analytics_eventos")]
public class AnalyticsEvento
{
    [Key] public long Id { get; set; }
    public string Evento { get; set; } = "";
    public string? SessionId { get; set; }
    public string? UserEmail { get; set; }
    public string? Municipio { get; set; }
    public string? Barrio { get; set; }
    public string? PayloadJson { get; set; }
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}

[Table("newsletter_suscripciones")]
public class NewsletterSuscripcion
{
    [Key] public long Id { get; set; }
    public string Email { get; set; } = "";
    public string? Nombre { get; set; }
    public string? MunicipioInteres { get; set; }
    public string? BarrioInteres { get; set; }
    public bool Activa { get; set; } = true;
    public DateTime CreadaEn { get; set; } = DateTime.UtcNow;
    public DateTime? ActualizadaEn { get; set; }
}

[Table("gap_analisis")]
public class GapAnalisis
{
    [Key] public int Id { get; set; }
    public string Ciudad { get; set; } = "";
    public string Zona { get; set; } = "";
    public string? CodigoPostal { get; set; }
    // Asking combinado (todas las fuentes disponibles)
    public double AskingMedioM2 { get; set; }
    public double NotarialMedioM2 { get; set; }
    public double GapPct { get; set; }
    public int NumAnuncios { get; set; }
    public int NumTransacciones { get; set; }
    // Desglose por portal
    public double? AskingIdealistaM2 { get; set; }
    public double? AskingFotocasaM2 { get; set; }
    public double? GapIdealistaPct { get; set; }
    public double? GapFotocasaPct { get; set; }
    public int NumAnunciosIdealista { get; set; }
    public int NumAnunciosFotocasa { get; set; }
    public string Periodo { get; set; } = "";
    public DateTime CalculadoEn { get; set; } = DateTime.UtcNow;
}

[Table("alertas")]
public class Alerta
{
    [Key] public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Zona { get; set; } = "";
    public string Ciudad { get; set; } = "";
    public double PrecioMaxAsking { get; set; }
    public double GapMinimoPct { get; set; }
    public bool Activa { get; set; } = true;
    public string? Descripcion { get; set; }
    public string EmailDestino { get; set; } = "";
    public DateTime CreadaEn { get; set; } = DateTime.UtcNow;
    public ICollection<DisparoAlerta> Disparos { get; set; } = [];
}

[Table("disparos_alertas")]
public class DisparoAlerta
{
    [Key] public int Id { get; set; }
    public string AlertaId { get; set; } = "";
    public string AnuncioUrl { get; set; } = "";
    public string Zona { get; set; } = "";
    public double AskingM2 { get; set; }
    public double NotarialM2 { get; set; }
    public double GapPct { get; set; }
    public bool EmailEnviado { get; set; }
    public bool Leido { get; set; }
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public Alerta? Alerta { get; set; }
}

// ── DTOs de respuesta ────────────────────────────────────────────────────────

public record CiudadResumenDto(
    string Ciudad,
    double AskingMedioM2,
    double NotarialMedioM2,
    double GapPct,
    int TxMes,
    string Periodo
);

public record GapZonaDto(
    string Zona,
    double AskingMedioM2,
    double NotarialMedioM2,
    double GapPct,
    int NumAnuncios,
    int NumTransacciones,
    double? AskingIdealistaM2,
    double? AskingFotocasaM2,
    double? GapIdealistaPct,
    double? GapFotocasaPct,
    int NumAnunciosIdealista,
    int NumAnunciosFotocasa
);

public record HistoricoMesDto(
    string Mes,
    string Periodo,
    double Asking,
    double Notarial,
    double Gap,
    double? AskingIdealista,
    double? AskingFotocasa
);

public record TransaccionDto(
    int Id,
    string Zona,
    double AskingM2,
    double NotarialM2,
    double GapPct,
    double? SuperficieM2,
    DateTime Fecha,
    string Fuente,
    string Url,
    string? TipoInmueble,
    int? Habitaciones,
    string? Titulo
);

public record AlertaCreateDto(
    string Zona,
    string Ciudad,
    double PrecioMaxAsking,
    double GapMinimoPct,
    string? Descripcion,
    string EmailDestino
);

public record AlertaDto(
    string Id,
    string Zona,
    string Ciudad,
    double PrecioMaxAsking,
    double GapMinimoPct,
    bool Activa,
    string? Descripcion,
    string EmailDestino,
    DateTime CreadaEn
);

public record MunicipioDto(
    string IdIne,
    string Nombre,
    string? Provincia,
    string? Comunidad,
    bool TieneDatos,
    double? Lat,
    double? Lon
);

public record DisparoDto(
    int Id,
    string AlertaId,
    string Zona,
    double AskingM2,
    double NotarialM2,
    double GapPct,
    bool Leido,
    DateTime CreadoEn,
    string AnuncioUrl
);

public record AnuncioMapaDto(
    int Id,
    string Zona,
    double Lat,
    double Lon,
    int PrecioTotal,
    double PrecioM2,
    double NotarialM2,
    double GapPct,
    double? SuperficieM2,
    string? TipoInmueble,
    int? Habitaciones,
    string Fuente,
    string Url,
    string? Titulo
);

// ── DTOs para detalle de anuncio + catastro ──────────────────────────────

public record AnuncioDetalleDto(
    int Id,
    string IdExterno,
    string Fuente,
    string Url,
    string? Titulo,
    int PrecioTotal,
    double? PrecioM2,
    double? SuperficieM2,
    int? Habitaciones,
    string Ciudad,
    string? Distrito,
    string? TipoInmueble,
    DateTime FechaScraping,
    double? NotarialMedioM2,
    double? NotarialMinM2,
    double? NotarialMaxM2,
    int? NumTransacciones,
    string? NotarialPeriodo,
    double? GapPct,
    string? GapPeriodo
);

public record AnuncioResumenDto(
    int Id,
    string Fuente,
    string? Titulo,
    int PrecioTotal,
    double? PrecioM2,
    double? SuperficieM2,
    int? Habitaciones,
    string? Distrito,
    string? TipoInmueble,
    DateTime FechaScraping,
    string Url
);

public record NotarialZonaDto(
    string Ciudad,
    string Municipio,
    double PrecioMedioM2,
    double? PrecioMinM2,
    double? PrecioMaxM2,
    int NumTransacciones,
    string Periodo
);

public record CatastroResultDto(
    bool Encontrado,
    string? Error,
    List<CatastroInmuebleDto> Inmuebles
);

public record CatastroInmuebleDto(
    string ReferenciaCatastral,
    string Uso,
    double? SuperficieM2,
    string? AnoConstruccion,
    string? Direccion,
    string? CodigoPostal,
    string? Planta,
    string? Puerta,
    string UrlCatastro
);

public record CatastroFichaDto(
    string Rc,
    string? Direccion,
    string? CodigoPostal,
    string? Municipio,
    string? Provincia,
    string? Uso,
    string? TipoInmueble,
    double? SuperficieTotal,
    double? SuperficieConstruida,
    int? AnnoConstruccion,
    string? ValorCatastral,
    int? NumPlantasSobre,
    int? NumPlantasBajo,
    string? Planta,
    string? Puerta,
    string UrlFicha
);

public record ValorReferenciaDto(
    string Rc,
    decimal? ValorReferencia,
    int Anno,
    string? Mensaje
);

public record PrecioCpDto(
    string Cp,
    double? Lat,
    double? Lon,
    double PrecioM2,
    int NumAnuncios,
    double? GapPct,
    string? Nombre
);

public record EstimacionAvmDto(
    double PrecioEstimado,
    double RangoMin,
    double RangoMax,
    int ComparablesUsados,
    string Metodologia,
    double? ValorCatastral,
    double? PrecioNotarial,
    List<ComparableDto> Comparables
);

public record ComparableDto(
    int Id,
    double PrecioM2,
    double? SuperficieM2,
    int? Habitaciones,
    string? Distrito,
    string Fuente,
    string Url,
    double DistanciaM
);

public record EstimacionRequestDto(
    string? Rc,
    double? Lat,
    double? Lon,
    double? Superficie,
    int? Habitaciones,
    string Ciudad
);

public record IneIpvDto(
    string Serie,
    string Descripcion,
    List<IneDataPointDto> Datos
);

public record IneDataPointDto(
    string Periodo,
    double? Valor
);

public record BdeTipoInteresDto(
    string Fecha,
    double? TipoHipotecario,
    double? Euribor
);

public record AnalyticsEventCreateDto(
    string Evento,
    string? SessionId,
    string? UserEmail,
    string? Municipio,
    string? Barrio,
    string? PayloadJson
);

public record NewsletterSubscribeDto(
    string Email,
    string? Nombre,
    string? MunicipioInteres,
    string? BarrioInteres
);

public record BusquedasDiaDto(string Fecha, int Count);

public record AdminMetricasDto(
    int UsuariosRegistrados,
    int Busquedas,
    int TiempoMedioSegundos,
    int PorcentajeUsuariosRecurrentes,
    int SuscripcionesNewsletter,
    List<PatronBusquedaDto> Patrones,
    List<BusquedasDiaDto> BusquedasPorDia
);

public record PatronBusquedaDto(
    string Patron,
    int Veces
);

public record AsistentePreguntaDto(
    string Pregunta,
    string? Municipio,
    string? Barrio,
    int? PrecioMaximo,
    int? Habitaciones
);

public record AsistenteRespuestaDto(
    string Respuesta,
    int TotalResultados,
    List<AnuncioResumenDto> Muestra
);

[Table("usuarios")]
public class Usuario
{
    [Key] public int Id { get; set; }
    public string Email { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string? PasswordHash { get; set; }
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}

public record LoginRequestDto(string Email, string Nombre);
public record UsuarioDto(int Id, string Email, string Nombre, DateTime CreadoEn);
