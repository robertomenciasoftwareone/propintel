export interface PrecioZona {
  zona: string;
  askingPrecio: number;   // €/m² de Idealista/Fotocasa
  notarialPrecio: number; // €/m² del Portal Notarial
  gap: number;            // % sobrevaloración asking vs notarial
  numTransacciones: number;
}

export interface Transaccion {
  id: string;
  anuncioId: number;
  zona: string;
  distrito: string;
  askingPrecio: number;
  notarialPrecio: number;
  gap: number;
  m2: number;
  fecha: Date;
  fuente: 'idealista' | 'fotocasa' | 'notarial';
  url: string;
  tipoInmueble: string;
  habitaciones: number;
  titulo: string;
}

export interface HistoricoMes {
  mes: string;
  asking: number;
  notarial: number;
  gap: number;
  transacciones: number;
  askingIdealista?: number | null;
  askingFotocasa?: number | null;
}

export interface DistritoGap {
  nombre: string;
  gap: number;
  asking: number;
  notarial: number;
  askingIdealista?: number | null;
  askingFotocasa?: number | null;
  gapIdealista?: number | null;
  gapFotocasa?: number | null;
  numAnunciosIdealista?: number;
  numAnunciosFotocasa?: number;
}

export interface RangoFiable {
  zona: string;
  precioMin: number;    // percentil 25 notarial
  precioMax: number;    // percentil 75 notarial
  precioMedio: number;  // mediana notarial
  askingMedio: number;  // asking actual portales
}

export interface Municipio {
  idIne: string;
  nombre: string;
  provincia?: string;
  comunidad?: string;
  tieneDatos: boolean;
  lat?: number;
  lon?: number;
}

export interface NotarialZona {
  municipio: string;
  precioMedioM2: number;
  precioMinM2: number | null;
  precioMaxM2: number | null;
  numTransacciones: number;
  periodo: string;
}

export interface CiudadData {
  id: string;
  nombre: string;
  askingMedio: number;
  notarialMedio: number;
  gap: number;
  txMes: number;
  askingIdealista?: number | null;
  askingFotocasa?: number | null;
  historico: HistoricoMes[];
  distritos: DistritoGap[];
  rangos: RangoFiable[];
  transacciones: Transaccion[];
  notariales: NotarialZona[];
}

export interface Alerta {
  id: string;
  zona: string;
  ciudad: string;
  precioMaxAsking: number;
  gapMinimo: number;       // % mínimo de gap para disparar
  activa: boolean;
  creadaEn: Date;
  descripcion?: string;
}

// ── Detalle de anuncio (ficha) ───────────────────────────────────────────

export interface AnuncioDetalle {
  id: number;
  idExterno: string;
  fuente: string;
  url: string;
  titulo: string | null;
  precioTotal: number;
  precioM2: number | null;
  superficieM2: number | null;
  habitaciones: number | null;
  ciudad: string;
  distrito: string | null;
  tipoInmueble: string | null;
  fechaScraping: Date;
  notarialMedioM2: number | null;
  notarialMinM2: number | null;
  notarialMaxM2: number | null;
  numTransacciones: number | null;
  notarialPeriodo: string | null;
  gapPct: number | null;
  gapPeriodo: string | null;
}

export interface CatastroInmueble {
  referenciaCatastral: string;
  uso: string;
  superficieM2: number | null;
  anoConstruccion: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  planta: string | null;
  puerta: string | null;
  urlCatastro: string;
}

export interface CatastroResult {
  encontrado: boolean;
  error: string | null;
  inmuebles: CatastroInmueble[];
}

// ── Precio por código postal (mapa CP) ───────────────────────────────────

export interface PrecioCP {
  cp: string;
  lat: number | null;
  lon: number | null;
  precioM2: number;
  numAnuncios: number;
  gapPct: number | null;
  nombre: string | null;
}

// ── Ficha completa del Catastro ──────────────────────────────────────────

export interface CatastroFicha {
  rc: string;
  direccion: string | null;
  codigoPostal: string | null;
  municipio: string | null;
  provincia: string | null;
  uso: string | null;
  tipoInmueble: string | null;
  superficieTotal: number | null;
  superficieConstruida: number | null;
  annoConstruccion: number | null;
  valorCatastral: string | null;
  numPlantasSobre: number | null;
  numPlantasBajo: number | null;
  planta: string | null;
  puerta: string | null;
  urlFicha: string;
}

// ── Valor de referencia AEAT ─────────────────────────────────────────────

export interface ValorReferencia {
  rc: string;
  valorReferencia: number | null;
  anno: number;
  mensaje: string | null;
}

// ── AVM: Estimación automática de valor ──────────────────────────────────

export interface Comparable {
  id: number;
  precioM2: number;
  superficieM2: number | null;
  habitaciones: number | null;
  distrito: string | null;
  fuente: string;
  url: string;
  distanciaM: number;
}

export interface EstimacionAvm {
  precioEstimado: number;
  rangoMin: number;
  rangoMax: number;
  comparablesUsados: number;
  metodologia: string;
  valorCatastral: number | null;
  precioNotarial: number | null;
  comparables: Comparable[];
}

export interface EstimacionRequest {
  rc?: string;
  lat?: number;
  lon?: number;
  superficie?: number;
  habitaciones?: number;
  ciudad: string;
}

// ── Estadísticas INE / BdE ───────────────────────────────────────────────

export interface IneDataPoint {
  periodo: string;
  valor: number | null;
}

export interface IneIpv {
  serie: string;
  descripcion: string;
  datos: IneDataPoint[];
}

export interface BdeTipoInteres {
  fecha: string;
  tipoHipotecario: number | null;
  euribor: number | null;
}
