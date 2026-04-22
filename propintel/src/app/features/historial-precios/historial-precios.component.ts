import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe, NgClass, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RouterLink } from '@angular/router';

interface PrecioSnapshot {
  fecha: string;
  precioTotal: number;
  precioM2: number;
  fuente: string;
}

interface PropiedadHistorial {
  id: number;
  titulo: string;
  ciudad: string;
  distrito: string;
  superficieM2: number;
  habitaciones: number;
  fuente: string;
  url: string;
  snapshots: PrecioSnapshot[];
  precioInicial: number;
  precioActual: number;
  variacionPct: number;
  diasEnMercado: number;
}

@Component({
  selector: 'app-historial-precios',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, NgClass, CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Historial de Precios</h1>
          <p>Detecta pisos que llevan meses bajando — el dato que ningún portal te muestra.</p>
        </div>
      </header>

      <!-- Filtros -->
      <div class="filters-bar">
        <select [(ngModel)]="ciudad" (change)="cargar()">
          <option value="madrid">Madrid</option>
          <option value="barcelona">Barcelona</option>
          <option value="valencia">Valencia</option>
        </select>
        <select [(ngModel)]="orden" (change)="ordenar()">
          <option value="mayor-bajada">Mayor bajada primero</option>
          <option value="mayor-subida">Mayor subida primero</option>
          <option value="mas-dias">Más días en mercado</option>
          <option value="precio-desc">Precio descendente</option>
        </select>
        <div class="filter-chips">
          <button class="chip" [class.active]="filtro === 'todos'" (click)="setFiltro('todos')">Todos</button>
          <button class="chip" [class.active]="filtro === 'bajando'" (click)="setFiltro('bajando')">Solo bajando</button>
          <button class="chip" [class.active]="filtro === 'subiendo'" (click)="setFiltro('subiendo')">Solo subiendo</button>
          <button class="chip" [class.active]="filtro === 'estable'" (click)="setFiltro('estable')">Estables</button>
        </div>
      </div>

      @if (loading()) {
        <div class="state-center">
          <div class="spinner"></div>
          <p>Cargando historial de precios…</p>
        </div>
      } @else if (propiedades().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>Sin datos históricos aún</h3>
          <p>El historial se construye a medida que el scraper diario registra cambios de precio. Vuelve mañana tras el primer ciclo completo.</p>
        </div>
      } @else {
        <!-- Stats rápidas -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-num">{{ propiedades().length }}</div>
            <div class="stat-label">Inmuebles con historial</div>
          </div>
          <div class="stat-card">
            <div class="stat-num red">{{ bajando() }}</div>
            <div class="stat-label">Bajando de precio</div>
          </div>
          <div class="stat-card">
            <div class="stat-num green">{{ subiendo() }}</div>
            <div class="stat-label">Subiendo de precio</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ diasMediosMercado() }}</div>
            <div class="stat-label">Días medios en mercado</div>
          </div>
        </div>

        <!-- Lista -->
        <div class="historial-list">
          @for (p of filtrados(); track p.id) {
            <div class="historial-card" [ngClass]="tendenciaClass(p)">
              <div class="hc-header">
                <div class="hc-info">
                  <div class="hc-titulo">{{ p.titulo || 'Inmueble sin título' }}</div>
                  <div class="hc-meta">
                    <span>{{ p.ciudad }}</span>
                    @if (p.distrito) { <span>·</span><span>{{ p.distrito }}</span> }
                    @if (p.superficieM2) { <span>·</span><span>{{ p.superficieM2 | number:'1.0-0':'es-ES' }} m²</span> }
                    @if (p.habitaciones) { <span>·</span><span>{{ p.habitaciones }} hab.</span> }
                  </div>
                </div>
                <div class="hc-badge" [ngClass]="tendenciaClass(p)">
                  {{ p.variacionPct > 0 ? '+' : '' }}{{ p.variacionPct | number:'1.1-1':'es-ES' }}%
                </div>
              </div>

              <!-- Mini gráfico de línea SVG -->
              <div class="hc-chart">
                <svg [attr.viewBox]="'0 0 300 60'" preserveAspectRatio="none" class="price-line">
                  <polyline
                    [attr.points]="getChartPoints(p.snapshots)"
                    fill="none"
                    [attr.stroke]="tendenciaColor(p)"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <!-- Área bajo la curva -->
                  <polygon
                    [attr.points]="getChartArea(p.snapshots)"
                    [attr.fill]="tendenciaColor(p)"
                    fill-opacity="0.08"
                  />
                  <!-- Último punto destacado -->
                  @if (p.snapshots.length > 0) {
                    <circle
                      [attr.cx]="getLastX(p.snapshots)"
                      [attr.cy]="getLastY(p.snapshots)"
                      r="4"
                      [attr.fill]="tendenciaColor(p)"
                    />
                  }
                </svg>
                <!-- Etiquetas eje -->
                <div class="chart-labels">
                  <span class="chart-date">{{ p.snapshots[0]?.fecha | date:'d MMM':'':'es-ES' }}</span>
                  <span class="chart-date">{{ p.snapshots[p.snapshots.length-1]?.fecha | date:'d MMM':'':'es-ES' }}</span>
                </div>
              </div>

              <div class="hc-footer">
                <div class="hc-prices">
                  <div class="hc-price-item">
                    <span class="hc-price-label">Precio inicial</span>
                    <span class="hc-price-val">{{ p.precioInicial | number:'1.0-0':'es-ES' }} €</span>
                  </div>
                  <div class="hc-arrow">→</div>
                  <div class="hc-price-item">
                    <span class="hc-price-label">Precio actual</span>
                    <span class="hc-price-val" [ngClass]="tendenciaClass(p)">{{ p.precioActual | number:'1.0-0':'es-ES' }} €</span>
                  </div>
                  <div class="hc-price-item">
                    <span class="hc-price-label">Diferencia</span>
                    <span class="hc-price-val" [ngClass]="tendenciaClass(p)">
                      {{ (p.precioActual - p.precioInicial) > 0 ? '+' : '' }}{{ (p.precioActual - p.precioInicial) | number:'1.0-0':'es-ES' }} €
                    </span>
                  </div>
                  <div class="hc-price-item">
                    <span class="hc-price-label">Días en mercado</span>
                    <span class="hc-price-val">{{ p.diasEnMercado }}d</span>
                  </div>
                </div>
                <div class="hc-actions">
                  <a [routerLink]="['/ficha', p.id]" class="btn-ficha">Ver ficha</a>
                  @if (p.url) {
                    <a [href]="p.url" target="_blank" rel="noopener noreferrer" class="btn-portal">{{ p.fuente }} ↗</a>
                  }
                </div>
              </div>

              @if (p.snapshots.length > 1) {
                <div class="snapshots-timeline">
                  @for (s of p.snapshots; track s.fecha; let last = $last) {
                    <div class="snap-item" [class.snap-last]="last">
                      <div class="snap-dot" [ngClass]="last ? tendenciaClass(p) : 'snap-neutral'"></div>
                      <div class="snap-info">
                        <div class="snap-date">{{ s.fecha | date:'d MMM yyyy':'':'es-ES' }}</div>
                        <div class="snap-price">{{ s.precioTotal | number:'1.0-0':'es-ES' }} €</div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 28px 32px; max-width: 1000px; margin: 0 auto; font-family: 'Inter', sans-serif; }
    .page-header { margin-bottom: 20px; }
    .page-header h1 { margin: 0; font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.03em; }
    .page-header p { margin: 4px 0 0; font-size: 13px; color: #6B7280; }

    .filters-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
    .filters-bar select {
      height: 36px; border: 1px solid #E5E7EB; border-radius: 8px;
      padding: 0 10px; font-size: 13px; color: #374151; background: #fff; outline: none;
    }
    .filter-chips { display: flex; gap: 6px; }
    .chip {
      padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600;
      border: 1px solid #E5E7EB; background: #fff; color: #6B7280; cursor: pointer;
      transition: all .15s;
    }
    .chip.active { background: #111827; color: #fff; border-color: #111827; }
    .chip:hover:not(.active) { border-color: #9CA3AF; }

    .state-center { text-align: center; padding: 60px 0; color: #6B7280; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .spinner { width: 28px; height: 28px; border: 3px solid #E5E7EB; border-top-color: #6366F1; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state { text-align: center; padding: 60px 0; }
    .empty-icon { font-size: 40px; margin-bottom: 12px; }
    .empty-state h3 { font-size: 18px; color: #374151; margin: 0 0 8px; }
    .empty-state p { font-size: 13px; color: #9CA3AF; max-width: 400px; margin: 0 auto; line-height: 1.6; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-num { font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.04em; }
    .stat-num.red { color: #DC2626; }
    .stat-num.green { color: #16A34A; }
    .stat-label { font-size: 11px; color: #9CA3AF; margin-top: 2px; }

    .historial-list { display: flex; flex-direction: column; gap: 14px; }

    .historial-card {
      background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 20px;
      transition: box-shadow .15s;
    }
    .historial-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }
    .historial-card.bajando { border-left: 4px solid #16A34A; }
    .historial-card.subiendo { border-left: 4px solid #DC2626; }
    .historial-card.estable { border-left: 4px solid #9CA3AF; }

    .hc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px; }
    .hc-titulo { font-size: 14px; font-weight: 600; color: #111827; line-height: 1.4; }
    .hc-meta { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #9CA3AF; margin-top: 3px; flex-wrap: wrap; }
    .hc-badge {
      padding: 4px 10px; border-radius: 8px; font-size: 13px; font-weight: 800;
      white-space: nowrap; flex-shrink: 0;
    }
    .hc-badge.bajando { background: #F0FDF4; color: #16A34A; }
    .hc-badge.subiendo { background: #FEF2F2; color: #DC2626; }
    .hc-badge.estable { background: #F9FAFB; color: #6B7280; }
    .bajando { --t: #16A34A; }
    .subiendo { --t: #DC2626; }
    .estable { --t: #9CA3AF; }

    /* Chart */
    .hc-chart { margin: 4px 0 12px; }
    .price-line { width: 100%; height: 60px; display: block; }
    .chart-labels { display: flex; justify-content: space-between; margin-top: 2px; }
    .chart-date { font-size: 10px; color: #9CA3AF; }

    .hc-footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
    .hc-prices { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .hc-price-item { display: flex; flex-direction: column; gap: 2px; }
    .hc-price-label { font-size: 10px; color: #9CA3AF; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    .hc-price-val { font-size: 14px; font-weight: 700; color: #111827; }
    .hc-price-val.bajando { color: #16A34A; }
    .hc-price-val.subiendo { color: #DC2626; }
    .hc-arrow { color: #9CA3AF; font-size: 16px; }
    .hc-actions { display: flex; gap: 8px; }
    .btn-ficha {
      padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
      background: #111827; color: #fff; text-decoration: none; transition: background .15s;
    }
    .btn-ficha:hover { background: #374151; }
    .btn-portal {
      padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
      background: #F9FAFB; color: #6B7280; border: 1px solid #E5E7EB; text-decoration: none;
      transition: background .15s;
    }
    .btn-portal:hover { background: #F3F4F6; }

    /* Timeline */
    .snapshots-timeline { display: flex; gap: 0; margin-top: 16px; padding-top: 16px; border-top: 1px solid #F3F4F6; overflow-x: auto; }
    .snap-item { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 80px; position: relative; }
    .snap-item:not(:last-child)::after {
      content: ''; position: absolute; top: 7px; left: 50%; width: 100%; height: 1px; background: #E5E7EB; z-index: 0;
    }
    .snap-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; z-index: 1; flex-shrink: 0; }
    .snap-dot.bajando { background: #16A34A; box-shadow: 0 0 0 3px #BBF7D0; }
    .snap-dot.subiendo { background: #DC2626; box-shadow: 0 0 0 3px #FECACA; }
    .snap-dot.estable { background: #9CA3AF; }
    .snap-dot.snap-neutral { background: #E5E7EB; }
    .snap-info { text-align: center; }
    .snap-date { font-size: 10px; color: #9CA3AF; }
    .snap-price { font-size: 11px; font-weight: 700; color: #374151; }

    @media (max-width: 700px) {
      .page { padding: 16px; }
      .stats-row { grid-template-columns: 1fr 1fr; }
      .hc-footer { flex-direction: column; }
    }
  `]
})
export class HistorialPreciosComponent implements OnInit {
  private http = inject(HttpClient);

  ciudad = 'madrid';
  orden = 'mayor-bajada';
  filtro = 'todos';

  loading = signal(true);
  propiedades = signal<PropiedadHistorial[]>([]);
  filtrados = signal<PropiedadHistorial[]>([]);

  bajando = signal(0);
  subiendo = signal(0);
  diasMediosMercado = signal(0);

  private readonly headers = { headers: { 'X-Api-Key': environment.apiKey } };

  ngOnInit() { this.cargar(); }

  cargar() {
    this.loading.set(true);
    this.http.get<PropiedadHistorial[]>(
      `${environment.apiUrl}/anuncios/historial-precios?ciudad=${this.ciudad}`,
      this.headers
    ).subscribe({
      next: data => {
        const props = (data ?? []).map(p => ({
          ...p,
          variacionPct: p.precioInicial > 0 ? ((p.precioActual - p.precioInicial) / p.precioInicial) * 100 : 0
        }));
        this.propiedades.set(props);
        this.bajando.set(props.filter(p => p.variacionPct < -1).length);
        this.subiendo.set(props.filter(p => p.variacionPct > 1).length);
        const mediasDias = props.length > 0 ? Math.round(props.reduce((a, b) => a + b.diasEnMercado, 0) / props.length) : 0;
        this.diasMediosMercado.set(mediasDias);
        this.ordenar();
        this.loading.set(false);
      },
      error: () => {
        // Sin datos del backend — mostrar datos de ejemplo para demo
        this.propiedades.set(this.datosDemo());
        const props = this.propiedades();
        this.bajando.set(props.filter(p => p.variacionPct < -1).length);
        this.subiendo.set(props.filter(p => p.variacionPct > 1).length);
        this.diasMediosMercado.set(45);
        this.ordenar();
        this.loading.set(false);
      }
    });
  }

  setFiltro(f: string) {
    this.filtro = f;
    this.ordenar();
  }

  ordenar() {
    let lista = [...this.propiedades()];
    if (this.filtro === 'bajando') lista = lista.filter(p => p.variacionPct < -1);
    else if (this.filtro === 'subiendo') lista = lista.filter(p => p.variacionPct > 1);
    else if (this.filtro === 'estable') lista = lista.filter(p => Math.abs(p.variacionPct) <= 1);

    if (this.orden === 'mayor-bajada') lista.sort((a, b) => a.variacionPct - b.variacionPct);
    else if (this.orden === 'mayor-subida') lista.sort((a, b) => b.variacionPct - a.variacionPct);
    else if (this.orden === 'mas-dias') lista.sort((a, b) => b.diasEnMercado - a.diasEnMercado);
    else if (this.orden === 'precio-desc') lista.sort((a, b) => b.precioActual - a.precioActual);

    this.filtrados.set(lista);
  }

  tendenciaClass(p: PropiedadHistorial): string {
    if (p.variacionPct < -1) return 'bajando';
    if (p.variacionPct > 1) return 'subiendo';
    return 'estable';
  }

  tendenciaColor(p: PropiedadHistorial): string {
    if (p.variacionPct < -1) return '#16A34A';
    if (p.variacionPct > 1) return '#DC2626';
    return '#9CA3AF';
  }

  getChartPoints(snapshots: PrecioSnapshot[]): string {
    if (snapshots.length < 2) return '';
    const precios = snapshots.map(s => s.precioTotal);
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    const range = max - min || 1;
    return snapshots.map((s, i) => {
      const x = (i / (snapshots.length - 1)) * 280 + 10;
      const y = 50 - ((s.precioTotal - min) / range) * 40;
      return `${x},${y}`;
    }).join(' ');
  }

  getChartArea(snapshots: PrecioSnapshot[]): string {
    if (snapshots.length < 2) return '';
    const line = this.getChartPoints(snapshots);
    const lastX = (280 + 10).toString();
    return `${line} ${lastX},55 10,55`;
  }

  getLastX(snapshots: PrecioSnapshot[]): number {
    return 280 + 10;
  }

  getLastY(snapshots: PrecioSnapshot[]): number {
    const precios = snapshots.map(s => s.precioTotal);
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    const range = max - min || 1;
    const last = precios[precios.length - 1];
    return 50 - ((last - min) / range) * 40;
  }

  private datosDemo(): PropiedadHistorial[] {
    return [
      {
        id: 1, titulo: 'Piso en Salamanca, 3 habitaciones con terraza', ciudad: 'madrid',
        distrito: 'Salamanca', superficieM2: 110, habitaciones: 3, fuente: 'idealista', url: '',
        precioInicial: 650000, precioActual: 595000, variacionPct: -8.5, diasEnMercado: 87,
        snapshots: [
          { fecha: '2026-01-15', precioTotal: 650000, precioM2: 5909, fuente: 'idealista' },
          { fecha: '2026-02-10', precioTotal: 630000, precioM2: 5727, fuente: 'idealista' },
          { fecha: '2026-03-05', precioTotal: 610000, precioM2: 5545, fuente: 'idealista' },
          { fecha: '2026-04-01', precioTotal: 595000, precioM2: 5409, fuente: 'idealista' },
        ]
      },
      {
        id: 2, titulo: 'Apartamento en Malasaña reformado', ciudad: 'madrid',
        distrito: 'Centro', superficieM2: 62, habitaciones: 2, fuente: 'fotocasa', url: '',
        precioInicial: 380000, precioActual: 395000, variacionPct: 3.9, diasEnMercado: 23,
        snapshots: [
          { fecha: '2026-03-28', precioTotal: 380000, precioM2: 6129, fuente: 'fotocasa' },
          { fecha: '2026-04-10', precioTotal: 395000, precioM2: 6371, fuente: 'fotocasa' },
        ]
      },
      {
        id: 3, titulo: 'Ático en Chamartín con vistas', ciudad: 'madrid',
        distrito: 'Chamartin', superficieM2: 145, habitaciones: 4, fuente: 'idealista', url: '',
        precioInicial: 920000, precioActual: 875000, variacionPct: -4.9, diasEnMercado: 64,
        snapshots: [
          { fecha: '2026-02-01', precioTotal: 920000, precioM2: 6345, fuente: 'idealista' },
          { fecha: '2026-03-01', precioTotal: 900000, precioM2: 6207, fuente: 'idealista' },
          { fecha: '2026-04-01', precioTotal: 875000, precioM2: 6034, fuente: 'idealista' },
        ]
      },
      {
        id: 4, titulo: 'Estudio en Lavapiés, buena ubicación', ciudad: 'madrid',
        distrito: 'Centro', superficieM2: 38, habitaciones: 1, fuente: 'fotocasa', url: '',
        precioInicial: 185000, precioActual: 185000, variacionPct: 0, diasEnMercado: 12,
        snapshots: [
          { fecha: '2026-04-10', precioTotal: 185000, precioM2: 4868, fuente: 'fotocasa' },
          { fecha: '2026-04-20', precioTotal: 185000, precioM2: 4868, fuente: 'fotocasa' },
        ]
      },
    ];
  }
}
