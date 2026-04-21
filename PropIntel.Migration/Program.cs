using System.IO.Compression;
using Npgsql;

const string connStr = "Host=localhost;Database=propintel;Username=propintel_user;Password=local123";
const string geoNamesUrl = "https://download.geonames.org/export/zip/ES.zip";
const string geoNamesCache = "ES.txt";

Console.WriteLine("PropIntel — Migración v2");
Console.WriteLine("========================");

await using var conn = new NpgsqlConnection(connStr);
await conn.OpenAsync();
Console.WriteLine("✓ Conexión a PostgreSQL establecida\n");

async Task Exec(string sql, string desc)
{
    await using var cmd = new NpgsqlCommand(sql, conn);
    var rows = await cmd.ExecuteNonQueryAsync();
    Console.WriteLine($"✓ {desc}" + (rows >= 0 ? $" ({rows} filas)" : ""));
}

async Task<object?> Scalar(string sql)
{
    await using var cmd = new NpgsqlCommand(sql, conn);
    return await cmd.ExecuteScalarAsync();
}

// 1. Columna cp en anuncios
await Exec(
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS cp VARCHAR(5)",
    "ALTER TABLE anuncios ADD COLUMN cp VARCHAR(5)");

// 2. Rellenar cp desde codigo_postal existente
await Exec(@"
    UPDATE anuncios
    SET cp = LPAD(REGEXP_REPLACE(COALESCE(codigo_postal,''), '[^0-9]', '', 'g'), 5, '0')
    WHERE cp IS NULL
      AND codigo_postal IS NOT NULL
      AND LENGTH(REGEXP_REPLACE(codigo_postal, '[^0-9]', '', 'g')) BETWEEN 1 AND 5
      AND REGEXP_REPLACE(codigo_postal, '[^0-9]', '', 'g') != ''",
    "cp rellenado desde codigo_postal");

// 3. Índice cp
await Exec(
    "CREATE INDEX IF NOT EXISTS ix_anuncios_cp ON anuncios (cp)",
    "Índice ix_anuncios_cp creado");

// 4. Tabla codigos_postales
await Exec(@"
    CREATE TABLE IF NOT EXISTS codigos_postales (
        cp            VARCHAR(5)  PRIMARY KEY,
        nombre        VARCHAR(255),
        provincia     VARCHAR(100),
        lat           DOUBLE PRECISION,
        lon           DOUBLE PRECISION,
        municipio_ine VARCHAR(10)
    )",
    "Tabla codigos_postales creada");

// 5. Índice provincia
await Exec(
    "CREATE INDEX IF NOT EXISTS ix_cp_provincia ON codigos_postales (provincia)",
    "Índice ix_cp_provincia creado");

// Verificación final
Console.WriteLine("\n--- Estado final ---");
Console.WriteLine($"codigos_postales: {await Scalar("SELECT COUNT(*) FROM codigos_postales")} filas");
Console.WriteLine($"anuncios con cp:  {await Scalar("SELECT COUNT(*) FROM anuncios WHERE cp IS NOT NULL")} filas");

await using (var cmdCol = new NpgsqlCommand(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='anuncios' AND column_name IN ('cp','lat','lon','codigo_postal') ORDER BY column_name",
    conn))
{
    await using var rdr = await cmdCol.ExecuteReaderAsync();
    Console.WriteLine("\nColumnas verificadas en tabla anuncios:");
    while (await rdr.ReadAsync())
        Console.WriteLine($"  {rdr.GetString(0),-20} {rdr.GetString(1)}");
}

Console.WriteLine("\n✅ Migración v2 completada con éxito.");

// ─── SEED: Códigos Postales desde GeoNames ────────────────────────────────

Console.WriteLine("\n--- Seed codigos_postales desde GeoNames ---");

// Descargar si no existe caché local
if (!File.Exists(geoNamesCache))
{
    Console.Write($"Descargando {geoNamesUrl}… ");
    using var http = new HttpClient();
    http.Timeout = TimeSpan.FromSeconds(60);
    var zipBytes = await http.GetByteArrayAsync(geoNamesUrl);
    using var zipStream = new MemoryStream(zipBytes);
    using var zip = new ZipArchive(zipStream);
    var entry = zip.GetEntry("ES.txt") ?? throw new Exception("ES.txt not found in zip");
    using var entryStream = entry.Open();
    using var fileOut = File.Create(geoNamesCache);
    await entryStream.CopyToAsync(fileOut);
    Console.WriteLine("OK");
}
else
{
    Console.WriteLine($"Usando caché local: {geoNamesCache}");
}

// Parsear ES.txt (TSV)
var rows = new Dictionary<string, (string cp, string nombre, string prov, double lat, double lon)>();
foreach (var line in await File.ReadAllLinesAsync(geoNamesCache))
{
    var p = line.Split('\t');
    if (p.Length < 11) continue;
    var cp     = p[1].Trim().PadLeft(5, '0');
    var nombre = p[2].Trim();
    var prov   = p[3].Trim();
    if (!double.TryParse(p[9], System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var lat)) continue;
    if (!double.TryParse(p[10], System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var lon)) continue;
    if (!rows.ContainsKey(cp))
        rows[cp] = (cp, nombre, prov, lat, lon);
}
Console.WriteLine($"Parsed {rows.Count} CPs únicos");

// Insertar en lotes
const int batchSize = 500;
int inserted = 0;
var data = rows.Values.ToList();
const string upsertSql = @"
    INSERT INTO codigos_postales (cp, nombre, provincia, lat, lon)
    VALUES (@cp, @nombre, @prov, @lat, @lon)
    ON CONFLICT (cp) DO UPDATE SET
        nombre    = EXCLUDED.nombre,
        provincia = EXCLUDED.provincia,
        lat       = EXCLUDED.lat,
        lon       = EXCLUDED.lon";

for (int i = 0; i < data.Count; i += batchSize)
{
    var batch = data.Skip(i).Take(batchSize).ToList();
    await using var tx = await conn.BeginTransactionAsync();
    foreach (var r in batch)
    {
        await using var cmd = new NpgsqlCommand(upsertSql, conn);
        cmd.Parameters.AddWithValue("cp",     r.cp);
        cmd.Parameters.AddWithValue("nombre", r.nombre);
        cmd.Parameters.AddWithValue("prov",   r.prov);
        cmd.Parameters.AddWithValue("lat",    r.lat);
        cmd.Parameters.AddWithValue("lon",    r.lon);
        await cmd.ExecuteNonQueryAsync();
    }
    await tx.CommitAsync();
    inserted += batch.Count;
    Console.Write($"\r  {inserted}/{data.Count} CPs…");
}

Console.WriteLine($"\n✓ {inserted} códigos postales insertados en codigos_postales");
Console.WriteLine($"\n✅ Seed completado. Total: {await Scalar("SELECT COUNT(*) FROM codigos_postales")} CPs");
