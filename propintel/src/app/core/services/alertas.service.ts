import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Alerta } from '../models/inmobiliario.model';
import { environment } from '../../../environments/environment';

export interface AlertaDisparo {
  id: number;
  alertaId: string;
  zona: string;
  askingActual: number;
  notarialReferencia: number;
  gapActual: number;
  fecha: Date;
  leida: boolean;
  anuncioUrl: string;
  descripcion?: string;
}

// Mock inicial mientras API no está disponible
const ALERTAS_MOCK: Alerta[] = [
  { id: 'a1', zona: 'Tetuán',       ciudad: 'madrid',   precioMaxAsking: 4000, gapMinimo: 10, activa: true,  creadaEn: new Date('2026-01-15'), descripcion: 'Piso inversión' },
  { id: 'a2', zona: 'Carabanchel',  ciudad: 'madrid',   precioMaxAsking: 3000, gapMinimo: 8,  activa: true,  creadaEn: new Date('2026-02-01'), descripcion: 'Reformar y vender' },
  { id: 'a3', zona: 'Vallecas',     ciudad: 'madrid',   precioMaxAsking: 2800, gapMinimo: 15, activa: false, creadaEn: new Date('2025-12-10'), descripcion: 'Primera vivienda' },
];
const DISPAROS_MOCK: AlertaDisparo[] = [
  { id: 1, alertaId: 'a1', zona: 'Tetuán',      askingActual: 3850, notarialReferencia: 3480, gapActual: 10.6, fecha: new Date(Date.now() - 7200000),    leida: false, anuncioUrl: '#', descripcion: 'Piso inversión' },
  { id: 2, alertaId: 'a1', zona: 'Tetuán',      askingActual: 3920, notarialReferencia: 3480, gapActual: 12.6, fecha: new Date(Date.now() - 93600000),   leida: false, anuncioUrl: '#', descripcion: 'Piso inversión' },
  { id: 3, alertaId: 'a2', zona: 'Carabanchel', askingActual: 2780, notarialReferencia: 2562, gapActual: 8.5,  fecha: new Date(Date.now() - 259200000),  leida: true,  anuncioUrl: '#', descripcion: 'Reformar y vender' },
];

@Injectable({ providedIn: 'root' })
export class AlertasService {

  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/alertas`;

  readonly alertas  = signal<Alerta[]>(ALERTAS_MOCK);
  readonly disparos = signal<AlertaDisparo[]>(DISPAROS_MOCK);

  readonly alertasActivas   = computed(() => this.alertas().filter(a => a.activa));
  readonly disparosNoLeidos = computed(() => this.disparos().filter(d => !d.leida));
  readonly totalNoLeidos    = computed(() => this.disparosNoLeidos().length);



  // ── API calls (con fallback a mock si la API no está disponible) ──────────

  cargarAlertas(): void {
    this.http.get<any[]>(this.api).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (data) {
        this.alertas.set(data.map(a => ({
          id: a.id, zona: a.zona, ciudad: a.ciudad,
          precioMaxAsking: a.precioMaxAsking,
          gapMinimo: a.gapMinimoPct,
          activa: a.activa, creadaEn: new Date(a.creadaEn),
          descripcion: a.descripcion,
        })));
      }
    });
  }

  cargarDisparos(): void {
    this.http.get<any[]>(`${this.api}/disparos`).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (data) {
        this.disparos.set(data.map(d => ({
          id: d.id, alertaId: d.alertaId, zona: d.zona,
          askingActual: d.askingM2, notarialReferencia: d.notarialM2,
          gapActual: d.gapPct, fecha: new Date(d.creadoEn),
          leida: d.leido, anuncioUrl: d.anuncioUrl,
        })));
      }
    });
  }

  crearAlerta(alerta: Omit<Alerta, 'id' | 'creadaEn'>): void {
    const body = {
      zona: alerta.zona, ciudad: alerta.ciudad,
      precioMaxAsking: alerta.precioMaxAsking,
      gapMinimoPct: alerta.gapMinimo,
      descripcion: alerta.descripcion,
      emailDestino: 'usuario@example.com',   // TODO: auth
    };
    this.http.post<any>(this.api, body).pipe(
      catchError(() => of(null))
    ).subscribe(resp => {
      const nueva: Alerta = {
        id: resp?.id ?? 'local-' + Date.now(),
        ...alerta,
        creadaEn: new Date(),
      };
      this.alertas.update(list => [...list, nueva]);
    });
  }

  toggleAlerta(id: string): void {
    this.http.patch(`${this.api}/${id}/toggle`, {}).pipe(
      catchError(() => of(null))
    ).subscribe();
    this.alertas.update(list =>
      list.map(a => a.id === id ? { ...a, activa: !a.activa } : a)
    );
  }

  eliminarAlerta(id: string): void {
    this.http.delete(`${this.api}/${id}`).pipe(
      catchError(() => of(null))
    ).subscribe();
    this.alertas.update(list => list.filter(a => a.id !== id));
  }

  marcarLeidoDisparo(idx: number): void {
    const d = this.disparos()[idx];
    if (!d) return;
    this.http.patch(`${this.api}/disparos/${d.id}/leer`, {}).pipe(
      catchError(() => of(null))
    ).subscribe();
    this.disparos.update(list =>
      list.map((item, i) => i === idx ? { ...item, leida: true } : item)
    );
  }

  marcarTodosLeidos(): void {
    this.http.patch(`${this.api}/disparos/leer-todos`, {}).pipe(
      catchError(() => of(null))
    ).subscribe();
    this.disparos.update(list => list.map(d => ({ ...d, leida: true })));
  }

  tiempoRelativo(fecha: Date): string {
    const diff = Date.now() - fecha.getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (h < 1)   return 'hace menos de 1h';
    if (h < 24)  return `hace ${h}h`;
    if (d === 1) return 'ayer';
    return `hace ${d} días`;
  }
}
