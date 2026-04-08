import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, catchError } from 'rxjs';
import { CiudadData, HistoricoMes, DistritoGap, Transaccion, Municipio, AnuncioDetalle, CatastroResult, NotarialZona, AnuncioResumen } from '../models/inmobiliario.model';
import { environment } from '../../../environments/environment';

// ── DTOs que devuelve la API .NET ──────────────────────────────────────────
interface CiudadResumenDto {
  ciudad: string;
  askingMedioM2: number;
  notarialMedioM2: number;
  gapPct: number;
  txMes: number;
  periodo: string;
}
interface GapZonaDto {
  zona: string;
  askingMedioM2: number;
  notarialMedioM2: number;
  gapPct: number;
  numAnuncios: number;
  numTransacciones: number;
  askingIdealistaM2?: number | null;
  askingFotocasaM2?: number | null;
  gapIdealistaPct?: number | null;
  gapFotocasaPct?: number | null;
  numAnunciosIdealista: number;
  numAnunciosFotocasa: number;
}
interface HistoricoMesDto {
  mes: string;
  periodo: string;
  asking: number;
  notarial: number;
  gap: number;
  askingIdealista?: number | null;
  askingFotocasa?: number | null;
}
interface TransaccionDto {
  id: number;
  zona: string;
  askingM2: number;
  notarialM2: number;
  gapPct: number;
  superficieM2?: number;
  fecha: string;
  fuente: string;
  url: string;
  tipoInmueble?: string;
  habitaciones?: number;
  titulo?: string;
}
interface NotarialZonaDto {
  ciudad: string;
  municipio: string;
  precioMedioM2: number;
  precioMinM2?: number | null;
  precioMaxM2?: number | null;
  numTransacciones: number;
  periodo: string;
}
interface MunicipioDto {
  idIne: string;
  nombre: string;
  provincia?: string;
  comunidad?: string;
  tieneDatos: boolean;
  lat?: number;
  lon?: number;
}

@Injectable({ providedIn: 'root' })
export class InmobiliarioService {

  private http = inject(HttpClient);
  private apiBase = environment.apiUrl;
  private apiKey = environment.apiKey;
  private get authHeaders() {
    return { headers: { 'X-Api-Key': this.apiKey } };
  }

  // ── Estado reactivo ────────────────────────────────────────────────────────
  readonly ciudadActiva = signal<string>('madrid');
  readonly loading      = signal(false);
  readonly ciudadData   = signal<CiudadData>(this.buildEmpty('madrid', 'Madrid'));

  // ── Municipios para el autocomplete ────────────────────────────────────────
  readonly municipios   = signal<Municipio[]>([]);

  constructor() {
    this.cargarCiudad('madrid', 'Madrid');
  }

  // ── Cambiar ciudad y cargar datos ──────────────────────────────────────────
  setCiudad(id: string, nombre?: string): void {
    this.ciudadActiva.set(id);
    this.cargarCiudad(id, nombre);
  }

  cargarCiudad(id: string, nombre?: string): void {
    this.loading.set(true);

    forkJoin({
      resumen:   this.http.get<CiudadResumenDto[]>(`${this.apiBase}/ciudades`, this.authHeaders).pipe(catchError(() => of(null))),
      gaps:      this.http.get<GapZonaDto[]>(`${this.apiBase}/ciudades/${id}/gaps`, this.authHeaders).pipe(catchError(() => of(null))),
      historico: this.http.get<HistoricoMesDto[]>(`${this.apiBase}/ciudades/${id}/historico`, this.authHeaders).pipe(catchError(() => of(null))),
      txs:       this.http.get<TransaccionDto[]>(`${this.apiBase}/ciudades/${id}/transacciones`, this.authHeaders).pipe(catchError(() => of(null))),
      notarial:  this.http.get<NotarialZonaDto[]>(`${this.apiBase}/ciudades/${id}/notarial`, this.authHeaders).pipe(catchError(() => of(null))),
    }).subscribe(({ resumen, gaps, historico, txs, notarial }) => {
      let data = this.buildEmpty(id, nombre ?? id);

      // Resumen KPI
      const r = resumen?.find(c => c.ciudad === id);
      if (r) {
        data.askingMedio   = r.askingMedioM2;
        data.notarialMedio = r.notarialMedioM2;
        data.gap           = r.gapPct;
        data.txMes         = r.txMes;
      }

      // Distritos con desglose por fuente
      if (gaps?.length) {
        data.distritos = gaps.map(g => ({
          nombre:               g.zona,
          gap:                  g.gapPct,
          asking:               g.askingMedioM2,
          notarial:             g.notarialMedioM2,
          askingIdealista:      g.askingIdealistaM2 ?? null,
          askingFotocasa:       g.askingFotocasaM2 ?? null,
          gapIdealista:         g.gapIdealistaPct ?? null,
          gapFotocasa:          g.gapFotocasaPct ?? null,
          numAnunciosIdealista: g.numAnunciosIdealista,
          numAnunciosFotocasa:  g.numAnunciosFotocasa,
        }));

        // Calcular medias ponderadas de fuente para las KPI cards
        const idealistaVals = gaps.filter(g => g.askingIdealistaM2 != null).map(g => g.askingIdealistaM2!);
        const fotocasaVals  = gaps.filter(g => g.askingFotocasaM2 != null).map(g => g.askingFotocasaM2!);
        if (idealistaVals.length) {
          data.askingIdealista = Math.round(idealistaVals.reduce((a, b) => a + b, 0) / idealistaVals.length);
        }
        if (fotocasaVals.length) {
          data.askingFotocasa = Math.round(fotocasaVals.reduce((a, b) => a + b, 0) / fotocasaVals.length);
        }
      }

      // Histórico con multi-fuente
      if (historico?.length) {
        data.historico = historico.map(h => ({
          mes:            h.mes,
          asking:         h.asking,
          notarial:       h.notarial,
          gap:            h.gap,
          transacciones:  0,
          askingIdealista: h.askingIdealista ?? null,
          askingFotocasa:  h.askingFotocasa ?? null,
        }));
      }

      // Transacciones
      if (txs?.length) {
        data.transacciones = txs.map((t, i) => ({
          id:             `tx-${i}`,
          anuncioId:      t.id,
          zona:           id,
          distrito:       t.zona,
          askingPrecio:   t.askingM2,
          notarialPrecio: t.notarialM2,
          gap:            t.gapPct,
          m2:             t.superficieM2 ?? 0,
          fecha:          new Date(t.fecha),
          fuente:         t.fuente as any,
          url:            t.url,
          tipoInmueble:   t.tipoInmueble ?? 'Piso',
          habitaciones:   t.habitaciones ?? 0,
          titulo:         t.titulo ?? '',
        }));
      }

      // Notarial por zona
      if (notarial?.length) {
        data.notariales = notarial.map(n => ({
          municipio:        n.municipio,
          precioMedioM2:    n.precioMedioM2,
          precioMinM2:      n.precioMinM2 ?? null,
          precioMaxM2:      n.precioMaxM2 ?? null,
          numTransacciones: n.numTransacciones,
          periodo:          n.periodo,
        }));
      }

      this.ciudadData.set(data);
      this.loading.set(false);
    });
  }

  // ── Buscar municipios (autocomplete) ───────────────────────────────────────
  buscarMunicipios(query: string, soloConDatos = false): void {
    const params: any = { q: query, limit: 20 };
    if (soloConDatos) params.soloConDatos = true;

    this.http.get<MunicipioDto[]>(`${this.apiBase}/municipios`, {
      ...this.authHeaders,
      params,
    }).pipe(catchError(() => of([]))).subscribe(result => {
      this.municipios.set(result.map(m => ({
        idIne:     m.idIne,
        nombre:    m.nombre,
        provincia: m.provincia,
        comunidad: m.comunidad,
        tieneDatos: m.tieneDatos,
        lat:       m.lat,
        lon:       m.lon,
      })));
    });
  }

  cargarMunicipiosPopulares(): void {
    this.http.get<MunicipioDto[]>(`${this.apiBase}/municipios/populares`, {
      ...this.authHeaders,
      params: { limit: 10 },
    }).pipe(catchError(() => of([]))).subscribe(result => {
      this.municipios.set(result.map(m => ({
        idIne:     m.idIne,
        nombre:    m.nombre,
        provincia: m.provincia,
        comunidad: m.comunidad,
        tieneDatos: m.tieneDatos,
        lat:       m.lat,
        lon:       m.lon,
      })));
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getGapColor(gap: number): string {
    if (gap >= 20) return '#f87171';
    if (gap >= 13) return '#e8c547';
    return '#4fd1a5';
  }

  getGapClass(gap: number): string {
    if (gap >= 20) return 'gap-high';
    if (gap >= 13) return 'gap-med';
    return 'gap-low';
  }

  // ── Detalle de anuncio ─────────────────────────────────────────────────────
  getAnuncioDetalle(id: number) {
    return this.http.get<AnuncioDetalle>(`${this.apiBase}/anuncios/${id}`, this.authHeaders);
  }

  getCatastro(anuncioId: number) {
    return this.http.get<CatastroResult>(`${this.apiBase}/anuncios/${anuncioId}/catastro`, this.authHeaders);
  }

  getAnunciosPorCiudad(ciudad: string, page = 1, size = 20) {
    return this.http.get<AnuncioResumen[]>(`${this.apiBase}/anuncios/ciudad/${ciudad}`, {
      ...this.authHeaders,
      params: { page, size }
    });
  }

  private buildEmpty(id: string, nombre: string): CiudadData {
    return {
      id, nombre,
      askingMedio: 0, notarialMedio: 0, gap: 0, txMes: 0,
      askingIdealista: null, askingFotocasa: null,
      historico: [], distritos: [], rangos: [], transacciones: [], notariales: [],
    };
  }
}
