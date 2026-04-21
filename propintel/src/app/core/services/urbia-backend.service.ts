import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminPatronBusqueda {
  patron: string;
  veces: number;
}

export interface AdminMetricasDia {
  fecha: string;
  count: number;
}

export interface AdminMetricas {
  usuariosRegistrados: number;
  busquedas: number;
  tiempoMedioSegundos: number;
  porcentajeUsuariosRecurrentes: number;
  suscripcionesNewsletter: number;
  patrones: AdminPatronBusqueda[];
  busquedasPorDia?: AdminMetricasDia[];
}

export interface AnuncioDetalle {
  id: number;
  fuente: string;
  url: string;
  titulo?: string;
  precioTotal: number;
  precioM2?: number;
  superficieM2?: number;
  habitaciones?: number;
  ciudad: string;
  distrito?: string;
  tipoInmueble?: string;
  notarialMedioM2?: number;
  gapPct?: number;
}

export interface AsistentePregunta {
  pregunta: string;
  municipio?: string;
  barrio?: string;
  precioMaximo?: number;
  habitaciones?: number;
}

export interface AsistenteAnuncioResumen {
  id: number;
  fuente: string;
  titulo?: string;
  precioTotal: number;
  precioM2?: number;
  superficieM2?: number;
  habitaciones?: number;
  distrito?: string;
  tipoInmueble?: string;
  fechaScraping: string;
  url: string;
}

export interface AsistenteRespuesta {
  respuesta: string;
  totalResultados: number;
  muestra: AsistenteAnuncioResumen[];
}

export interface TransporteStop {
  nombre: string;
  tipo: string;
  lat: number;
  lon: number;
  fuente: string;
  linea?: string;
}

export interface PortalScrapingStats {
  portal: string;
  totalAnuncios: number;
  ultimaEjecucion: string;
}

export interface FotocasaResumenStats {
  totalAnuncios: number;
  ultimaEjecucion: string;
}

export interface ScrapingStats {
  totalAnuncios: number;
  anunciosMadrid: number;
  anunciosBarcelona: number;
  ultimaEjecucion?: string;
  ejecucionesHoy: number;
  portalesActivos: number;
  coberturaZonas?: number;
  portales: PortalScrapingStats[];
  fotocasaResumen?: FotocasaResumenStats;
}

export interface IneDataPoint {
  periodo: string;
  valor: number | null;
}

export interface IneIpvSerie {
  serie: string;
  descripcion: string;
  datos: IneDataPoint[];
}

export interface EstadisticasResumen {
  ipvVarAnual: { valor: number | null; periodo: string; unidad: string; fuente: string };
  hipotecasNumero: { valor: number | null; periodo: string; unidad: string; fuente: string };
  hipotecasImporte: { valor: number | null; unidad: string; fuente: string };
  fuentes: { nombre: string; url: string }[];
}

@Injectable({ providedIn: 'root' })
export class UrbiaBackendService {
  private http = inject(HttpClient);
  private apiBase = environment.apiUrl;
  private apiKey = environment.apiKey;

  private get authHeaders() {
    return { headers: { 'X-Api-Key': this.apiKey } };
  }

  getAnuncio(id: number): Observable<AnuncioDetalle> {
    return this.http.get<AnuncioDetalle>(`${this.apiBase}/anuncios/${id}`, this.authHeaders);
  }

  enviarEvento(payload: {
    evento: string;
    sessionId?: string;
    userEmail?: string;
    municipio?: string;
    barrio?: string;
    payloadJson?: string;
  }): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.apiBase}/metricas/evento`, payload, this.authHeaders);
  }

  suscribirNewsletter(payload: {
    email: string;
    nombre?: string;
    municipioInteres?: string;
    barrioInteres?: string;
  }): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.apiBase}/newsletter/suscribir`, payload, this.authHeaders);
  }

  getMetricasAdmin(dias = 30): Observable<AdminMetricas> {
    return this.http.get<AdminMetricas>(`${this.apiBase}/metricas/admin`, {
      ...this.authHeaders,
      params: { dias }
    });
  }

  preguntarAsistente(payload: AsistentePregunta): Observable<AsistenteRespuesta> {
    return this.http.post<AsistenteRespuesta>(`${this.apiBase}/asistente/preguntar`, payload, this.authHeaders);
  }

  getTransportes(bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number }): Observable<TransporteStop[]> {
    return this.http.get<TransporteStop[]>(`${this.apiBase}/transportes`, {
      ...this.authHeaders,
      params: {
        minLat: bbox.minLat,
        minLon: bbox.minLon,
        maxLat: bbox.maxLat,
        maxLon: bbox.maxLon
      }
    });
  }

  getScrapingStats(): Observable<ScrapingStats> {
    return this.http.get<ScrapingStats>(`${this.apiBase}/scraping-stats`, this.authHeaders);
  }

  getEstadisticasResumen(): Observable<EstadisticasResumen> {
    return this.http.get<EstadisticasResumen>(`${this.apiBase}/estadisticas/resumen`, this.authHeaders);
  }

  getEstadisticasIpv(periodos = 8): Observable<IneIpvSerie[]> {
    return this.http.get<IneIpvSerie[]>(`${this.apiBase}/estadisticas/ine/ipv`,
      { ...this.authHeaders, params: { periodos } });
  }

  getEstadisticasHipotecas(periodos = 12): Observable<IneIpvSerie[]> {
    return this.http.get<IneIpvSerie[]>(`${this.apiBase}/estadisticas/ine/hipotecas`,
      { ...this.authHeaders, params: { periodos } });
  }
}
