using Microsoft.EntityFrameworkCore;
using PropIntel.Api.Models;

namespace PropIntel.Api.Data;

public class PropIntelDbContext(DbContextOptions<PropIntelDbContext> options)
    : DbContext(options)
{
    public DbSet<Municipio>     Municipios       => Set<Municipio>();
    public DbSet<DatoNotarial>  DatosNotariales  => Set<DatoNotarial>();
    public DbSet<Anuncio>       Anuncios         => Set<Anuncio>();
    public DbSet<GapAnalisis>   GapsAnalisis     => Set<GapAnalisis>();
    public DbSet<Alerta>        Alertas          => Set<Alerta>();
    public DbSet<DisparoAlerta> DisparosAlertas  => Set<DisparoAlerta>();
    public DbSet<CodigoPostal>  CodigosPostales  => Set<CodigoPostal>();
    public DbSet<AnalyticsEvento> AnalyticsEventos => Set<AnalyticsEvento>();
    public DbSet<NewsletterSuscripcion> NewsletterSuscripciones => Set<NewsletterSuscripcion>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // snake_case column mapping (coincide con Python/psycopg2)
        mb.Entity<Municipio>(e =>
        {
            e.HasKey(p => p.IdIne);
            e.Property(p => p.IdIne).HasColumnName("id_ine");
            e.Property(p => p.Nombre).HasColumnName("nombre");
            e.Property(p => p.NombreNorm).HasColumnName("nombre_norm");
            e.Property(p => p.Provincia).HasColumnName("provincia");
            e.Property(p => p.Comunidad).HasColumnName("comunidad");
            e.Property(p => p.Poblacion).HasColumnName("poblacion");
            e.Property(p => p.TieneDatos).HasColumnName("tiene_datos");
            e.Property(p => p.Lat).HasColumnName("lat");
            e.Property(p => p.Lon).HasColumnName("lon");
            e.Property(p => p.SlugIdealista).HasColumnName("slug_idealista");
            e.Property(p => p.SlugFotocasa).HasColumnName("slug_fotocasa");
            e.Property(p => p.ActualizadoEn).HasColumnName("actualizado_en");
        });

        mb.Entity<DatoNotarial>(e =>
        {
            e.Property(p => p.Ciudad).HasColumnName("ciudad");
            e.Property(p => p.Municipio).HasColumnName("municipio");
            e.Property(p => p.CodigoPostal).HasColumnName("codigo_postal");
            e.Property(p => p.PrecioMedioM2).HasColumnName("precio_medio_m2");
            e.Property(p => p.PrecioMinM2).HasColumnName("precio_min_m2");
            e.Property(p => p.PrecioMaxM2).HasColumnName("precio_max_m2");
            e.Property(p => p.NumTransacciones).HasColumnName("num_transacciones");
            e.Property(p => p.Periodo).HasColumnName("periodo");
            e.Property(p => p.CreadoEn).HasColumnName("creado_en");
        });

        mb.Entity<Anuncio>(e =>
        {
            e.Property(p => p.IdExterno).HasColumnName("id_externo");
            e.Property(p => p.Fuente).HasColumnName("fuente");
            e.Property(p => p.Url).HasColumnName("url");
            e.Property(p => p.Titulo).HasColumnName("titulo");
            e.Property(p => p.PrecioTotal).HasColumnName("precio_total");
            e.Property(p => p.PrecioM2).HasColumnName("precio_m2");
            e.Property(p => p.SuperficieM2).HasColumnName("superficie_m2");
            e.Property(p => p.Habitaciones).HasColumnName("habitaciones");
            e.Property(p => p.Ciudad).HasColumnName("ciudad");
            e.Property(p => p.Distrito).HasColumnName("distrito");
            e.Property(p => p.TipoInmueble).HasColumnName("tipo_inmueble");
            e.Property(p => p.Activo).HasColumnName("activo");
            e.Property(p => p.FechaScraping).HasColumnName("fecha_scraping");
            e.Property(p => p.Cp).HasColumnName("codigo_postal");
            e.Property(p => p.Lat).HasColumnName("lat");
            e.Property(p => p.Lon).HasColumnName("lon");
            e.Property(p => p.CanonicalKey).HasColumnName("canonical_key");
            e.Property(p => p.FotoPrincipal).HasColumnName("foto_principal");
        });

        mb.Entity<AnalyticsEvento>(e =>
        {
            e.Property(p => p.Evento).HasColumnName("evento");
            e.Property(p => p.SessionId).HasColumnName("session_id");
            e.Property(p => p.UserEmail).HasColumnName("user_email");
            e.Property(p => p.Municipio).HasColumnName("municipio");
            e.Property(p => p.Barrio).HasColumnName("barrio");
            e.Property(p => p.PayloadJson).HasColumnName("payload_json");
            e.Property(p => p.CreadoEn).HasColumnName("creado_en");
        });

        mb.Entity<NewsletterSuscripcion>(e =>
        {
            e.Property(p => p.Email).HasColumnName("email");
            e.Property(p => p.Nombre).HasColumnName("nombre");
            e.Property(p => p.MunicipioInteres).HasColumnName("municipio_interes");
            e.Property(p => p.BarrioInteres).HasColumnName("barrio_interes");
            e.Property(p => p.Activa).HasColumnName("activa");
            e.Property(p => p.CreadaEn).HasColumnName("creada_en");
            e.Property(p => p.ActualizadaEn).HasColumnName("actualizada_en");
        });

        mb.Entity<CodigoPostal>(e =>
        {
            e.HasKey(p => p.Cp);
            e.Property(p => p.Cp).HasColumnName("cp");
            e.Property(p => p.Nombre).HasColumnName("nombre");
            e.Property(p => p.Provincia).HasColumnName("provincia");
            e.Property(p => p.Lat).HasColumnName("lat");
            e.Property(p => p.Lon).HasColumnName("lon");
            e.Property(p => p.MunicipioIne).HasColumnName("municipio_ine");
        });

        mb.Entity<Usuario>(e =>
        {
            e.Property(p => p.Email).HasColumnName("email");
            e.Property(p => p.Nombre).HasColumnName("nombre");
            e.Property(p => p.PasswordHash).HasColumnName("password_hash");
            e.Property(p => p.CreadoEn).HasColumnName("creado_en");
            e.HasIndex(p => p.Email).IsUnique();
        });

        mb.Entity<GapAnalisis>(e =>
        {
            e.Property(p => p.Ciudad).HasColumnName("ciudad");
            e.Property(p => p.Zona).HasColumnName("zona");
            e.Property(p => p.CodigoPostal).HasColumnName("codigo_postal");
            e.Property(p => p.AskingMedioM2).HasColumnName("asking_medio_m2");
            e.Property(p => p.NotarialMedioM2).HasColumnName("notarial_medio_m2");
            e.Property(p => p.GapPct).HasColumnName("gap_pct");
            e.Property(p => p.NumAnuncios).HasColumnName("num_anuncios");
            e.Property(p => p.NumTransacciones).HasColumnName("num_transacciones");
            e.Property(p => p.AskingIdealistaM2).HasColumnName("asking_idealista_m2");
            e.Property(p => p.AskingFotocasaM2).HasColumnName("asking_fotocasa_m2");
            e.Property(p => p.GapIdealistaPct).HasColumnName("gap_idealista_pct");
            e.Property(p => p.GapFotocasaPct).HasColumnName("gap_fotocasa_pct");
            e.Property(p => p.NumAnunciosIdealista).HasColumnName("num_anuncios_idealista");
            e.Property(p => p.NumAnunciosFotocasa).HasColumnName("num_anuncios_fotocasa");
            e.Property(p => p.Periodo).HasColumnName("periodo");
            e.Property(p => p.CalculadoEn).HasColumnName("calculado_en");
        });

        mb.Entity<Alerta>(e =>
        {
            e.Property(p => p.Zona).HasColumnName("zona");
            e.Property(p => p.Ciudad).HasColumnName("ciudad");
            e.Property(p => p.PrecioMaxAsking).HasColumnName("precio_max_asking");
            e.Property(p => p.GapMinimoPct).HasColumnName("gap_minimo_pct");
            e.Property(p => p.Activa).HasColumnName("activa");
            e.Property(p => p.Descripcion).HasColumnName("descripcion");
            e.Property(p => p.EmailDestino).HasColumnName("email_destino");
            e.Property(p => p.CreadaEn).HasColumnName("creada_en");
        });

        mb.Entity<DisparoAlerta>(e =>
        {
            e.Property(p => p.AlertaId).HasColumnName("alerta_id");
            e.Property(p => p.AnuncioUrl).HasColumnName("anuncio_url");
            e.Property(p => p.Zona).HasColumnName("zona");
            e.Property(p => p.AskingM2).HasColumnName("asking_m2");
            e.Property(p => p.NotarialM2).HasColumnName("notarial_m2");
            e.Property(p => p.GapPct).HasColumnName("gap_pct");
            e.Property(p => p.EmailEnviado).HasColumnName("email_enviado");
            e.Property(p => p.Leido).HasColumnName("leido");
            e.Property(p => p.CreadoEn).HasColumnName("creado_en");
            e.HasOne(d => d.Alerta).WithMany(a => a.Disparos).HasForeignKey(d => d.AlertaId);
        });
    }
}
