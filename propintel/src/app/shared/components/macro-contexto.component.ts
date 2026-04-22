import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { NgIf, NgFor, DecimalPipe, NgClass } from '@angular/common';
import { UrbiaBackendService, EstadisticasResumen, IneIpvSerie } from '../../core/services/urbia-backend.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface MacroKpi {
  label: string;
  value: number | null;
  unit: string;
  period: string;
  source: string;
  trend: 'up' | 'down' | 'neutral' | null;
  color: 'blue' | 'green' | 'amber' | 'gray';
}

@Component({
  selector: 'app-macro-contexto',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, NgClass],
  template: `
    <div class="macro-card">
      <div class="macro-header">
        <div class="macro-title-row">
          <span class="macro-title">Contexto macroeconómico</span>
          <span class="macro-badge">Datos oficiales</span>
        </div>
        <p class="macro-sub">IPV · Hipotecas · Tipos de interés — fuente INE y BdE</p>
      </div>

      <!-- Loading state -->
      <div class="macro-loading" *ngIf="loading()">
        <div class="skeleton-row">
          <div class="skeleton-kpi" *ngFor="let i of [1,2,3]"></div>
        </div>
      </div>

      <!-- Error state -->
      <div class="macro-error" *ngIf="!loading() && error()">
        <span class="error-icon">⚠️</span>
        <span>No se pudieron cargar los datos macro</span>
      </div>

      <!-- KPI Tiles -->
      <div class="macro-kpis" *ngIf="!loading() && !error()">
        <div
          class="kpi-tile"
          *ngFor="let kpi of kpis()"
          [ngClass]="'kpi-' + kpi.color"
        >
          <div class="kpi-label">{{ kpi.label }}</div>
          <div class="kpi-value-row">
            <span class="kpi-value" *ngIf="kpi.value !== null">
              {{ kpi.value | number:'1.1-1':'es-ES' }}
            </span>
            <span class="kpi-value kpi-na" *ngIf="kpi.value === null">—</span>
            <span class="kpi-unit">{{ kpi.unit }}</span>
            <span class="kpi-arrow" *ngIf="kpi.trend === 'up'">↑</span>
            <span class="kpi-arrow kpi-arrow-down" *ngIf="kpi.trend === 'down'">↓</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-period">{{ kpi.period }}</span>
            <span class="kpi-dot">·</span>
            <span class="kpi-source">{{ kpi.source }}</span>
          </div>
        </div>
      </div>

      <!-- IPV Sparkline -->
      <div class="macro-sparkline" *ngIf="!loading() && !error() && sparklinePoints().length > 1">
        <div class="sparkline-label">IPV — variación anual trimestral</div>
        <div class="sparkline-wrap">
          <svg [attr.viewBox]="'0 0 ' + svgW + ' ' + svgH" class="sparkline-svg" preserveAspectRatio="none">
            <!-- Zero line -->
            <line
              [attr.x1]="0"
              [attr.y1]="zeroY()"
              [attr.x2]="svgW"
              [attr.y2]="zeroY()"
              stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4,3"
            />
            <!-- Sparkline path -->
            <polyline
              [attr.points]="sparklinePath()"
              fill="none"
              stroke="#1A6EFF"
              stroke-width="1.5"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            <!-- Last point dot -->
            <circle
              *ngIf="sparklinePoints().length"
              [attr.cx]="sparklinePoints()[sparklinePoints().length - 1].x"
              [attr.cy]="sparklinePoints()[sparklinePoints().length - 1].y"
              r="3.5"
              fill="#1A6EFF"
            />
          </svg>
          <div class="sparkline-labels">
            <span>{{ sparklineFirst() }}</span>
            <span>{{ sparklineLast() }}</span>
          </div>
        </div>
      </div>

      <!-- Attribution -->
      <div class="macro-footer" *ngIf="!loading()">
        <span class="footer-text">Fuente oficial:&nbsp;</span>
        <a
          *ngFor="let f of fuentes(); let last = last"
          [href]="f.url" target="_blank" rel="noopener" class="footer-link"
        >{{ f.nombre }}{{ !last ? ' · ' : '' }}</a>
      </div>
    </div>
  `,
  styles: [`
    .macro-card {
      background: #F4F7FB;
      border: 1px solid rgba(0, 40, 100, 0.07);
      border-left: 3px solid #1A6EFF;
      border-radius: 20px;
      padding: 22px 26px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* Header */
    .macro-header { display: flex; flex-direction: column; gap: 4px; }
    .macro-title-row { display: flex; align-items: center; gap: 10px; }
    .macro-title {
      font-size: 15px; font-weight: 700; color: #0E1E35; letter-spacing: -0.02em;
    }
    .macro-badge {
      font-size: 10px; font-weight: 700; letter-spacing: .06em;
      text-transform: uppercase; color: #1A6EFF; background: #EEF4FF;
      border-radius: 6px; padding: 3px 9px;
    }
    .macro-sub { font-size: 12px; color: #4A6080; margin: 0; }

    /* Loading skeleton */
    .macro-loading { padding: 8px 0; }
    .skeleton-row { display: flex; gap: 12px; }
    .skeleton-kpi {
      flex: 1; height: 80px; background: #E8EDF4; border-radius: 14px;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    @keyframes shimmer {
      0%, 100% { opacity: 1; }
      50%       { opacity: .4; }
    }

    /* Error */
    .macro-error {
      font-size: 13px; color: #F59E0B; display: flex; align-items: center;
      gap: 6px; padding: 8px 0;
    }

    /* KPI Tiles */
    .macro-kpis { display: flex; gap: 12px; flex-wrap: wrap; }
    .kpi-tile {
      flex: 1; min-width: 140px;
      border-radius: 14px; padding: 14px 16px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .kpi-blue   { background: #EEF4FF; }
    .kpi-green  { background: #ECFDF5; }
    .kpi-amber  { background: #FFFBEB; }
    .kpi-gray   { background: #F4F7FB; }

    .kpi-label { font-size: 11px; font-weight: 600; color: #8FA3BE; text-transform: uppercase; letter-spacing: .06em; }
    .kpi-value-row { display: flex; align-items: baseline; gap: 4px; margin-top: 4px; }
    .kpi-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 22px; font-weight: 700; letter-spacing: -0.03em;
      color: #0E1E35;
    }
    .kpi-na { color: #8FA3BE; }
    .kpi-unit { font-size: 13px; font-weight: 500; color: #4A6080; }
    .kpi-arrow { font-size: 13px; color: #00B5A3; font-weight: 700; }
    .kpi-arrow-down { color: #F59E0B; }
    .kpi-meta { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
    .kpi-period { font-size: 11px; color: #8FA3BE; }
    .kpi-dot    { font-size: 11px; color: #C5D0DE; }
    .kpi-source { font-size: 11px; color: #8FA3BE; }

    /* Sparkline */
    .macro-sparkline { display: flex; flex-direction: column; gap: 6px; }
    .sparkline-label { font-size: 11px; font-weight: 600; color: #8FA3BE; text-transform: uppercase; letter-spacing: .06em; }
    .sparkline-wrap { display: flex; flex-direction: column; gap: 4px; }
    .sparkline-svg { width: 100%; height: 48px; display: block; }
    .sparkline-labels {
      display: flex; justify-content: space-between;
      font-size: 10px; color: #8FA3BE;
    }

    /* Footer */
    .macro-footer {
      display: flex; align-items: center; flex-wrap: wrap;
      font-size: 11px; color: #8FA3BE; gap: 2px;
      border-top: 1px solid rgba(0,40,100,0.07); padding-top: 12px; margin-top: -4px;
    }
    .footer-text { font-weight: 600; }
    .footer-link { color: #4A6080; text-decoration: none; }
    .footer-link:hover { color: #1A6EFF; text-decoration: underline; }
  `]
})
export class MacroContextoComponent implements OnInit {
  private svc = inject(UrbiaBackendService);

  readonly svgW = 320;
  readonly svgH = 48;
  readonly svgPad = 4;

  loading  = signal(true);
  error    = signal(false);
  kpis     = signal<MacroKpi[]>([]);
  fuentes  = signal<{ nombre: string; url: string }[]>([]);

  private ipvSeries = signal<{ periodo: string; valor: number }[]>([]);

  sparklinePoints = computed(() => {
    const pts = this.ipvSeries();
    if (pts.length < 2) return [];
    const vals = pts.map(p => p.valor);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const range = max - min || 1;
    const xStep = (this.svgW - this.svgPad * 2) / (pts.length - 1);
    return pts.map((p, i) => ({
      x: this.svgPad + i * xStep,
      y: this.svgH - this.svgPad - ((p.valor - min) / range) * (this.svgH - this.svgPad * 2),
      periodo: p.periodo,
      valor: p.valor,
    }));
  });

  sparklinePath = computed(() =>
    this.sparklinePoints().map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  );

  zeroY = computed(() => {
    const pts = this.ipvSeries();
    if (!pts.length) return this.svgH / 2;
    const vals = pts.map(p => p.valor);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const range = max - min || 1;
    const zeroVal = Math.max(min, Math.min(max, 0));
    return this.svgH - this.svgPad - ((zeroVal - min) / range) * (this.svgH - this.svgPad * 2);
  });

  sparklineFirst = computed(() => this.ipvSeries()[0]?.periodo ?? '');
  sparklineLast  = computed(() => this.ipvSeries()[this.ipvSeries().length - 1]?.periodo ?? '');

  ngOnInit() {
    forkJoin({
      resumen: this.svc.getEstadisticasResumen().pipe(catchError(() => of(null))),
      ipv:     this.svc.getEstadisticasIpv(8).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ resumen, ipv }) => {
        this.loading.set(false);

        if (!resumen) {
          this.error.set(true);
          return;
        }

        const r = resumen as EstadisticasResumen;
        this.fuentes.set(r.fuentes ?? []);

        const ipvValor = r.ipvVarAnual?.valor;
        const hipNum   = r.hipotecasNumero?.valor;

        this.kpis.set([
          {
            label:  'IPV — var. anual',
            value:  ipvValor ?? null,
            unit:   '%',
            period: r.ipvVarAnual?.periodo ?? '',
            source: 'INE',
            trend:  ipvValor != null ? (ipvValor >= 0 ? 'up' : 'down') : null,
            color:  'blue',
          },
          {
            label:  'Hipotecas/mes',
            value:  hipNum != null ? Math.round(hipNum) : null,
            unit:   '',
            period: r.hipotecasNumero?.periodo ?? '',
            source: 'INE',
            trend:  'neutral',
            color:  'green',
          },
          {
            label:  'Importe medio',
            value:  r.hipotecasImporte?.valor ?? null,
            unit:   'k€',
            period: '',
            source: 'INE',
            trend:  null,
            color:  'amber',
          },
        ]);

        // Populate sparkline from IPV var. anual general series
        if (ipv) {
          const varAnualSerie = (ipv as IneIpvSerie[]).find(
            s => s.serie === 'IPV3' || s.descripcion.includes('variación anual')
          );
          if (varAnualSerie) {
            this.ipvSeries.set(
              varAnualSerie.datos
                .filter(d => d.valor != null)
                .map(d => ({ periodo: d.periodo, valor: d.valor as number }))
            );
          }
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }
}
