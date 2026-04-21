import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { UrbiaBackendService, AdminMetricas } from '../../core/services/urbia-backend.service';

@Component({
  selector: 'app-admin-validacion',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <div class="admin-wrap">

      <header class="admin-header">
        <div>
          <h1 class="admin-title">Panel de métricas</h1>
          <p class="admin-sub">Adopción y comportamiento — últimos {{ dias }} días</p>
        </div>
        <div class="live-badge">
          <span class="live-dot"></span>LIVE
        </div>
      </header>

      <ng-container *ngIf="metricas() as m; else loadingTpl">

        <!-- KPI cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Usuarios registrados</div>
            <div class="kpi-val">{{ m.usuariosRegistrados }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Búsquedas realizadas</div>
            <div class="kpi-val">{{ m.busquedas }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Tiempo medio sesión</div>
            <div class="kpi-val">{{ m.tiempoMedioSegundos }}s</div>
          </div>
          <div class="kpi-card kpi-accent">
            <div class="kpi-label">Usuarios recurrentes</div>
            <div class="kpi-val">{{ m.porcentajeUsuariosRecurrentes }}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Suscritos newsletter</div>
            <div class="kpi-val">{{ m.suscripcionesNewsletter }}</div>
          </div>
        </div>

        <!-- Sparkline -->
        <div class="section-card" *ngIf="(m.busquedasPorDia?.length ?? 0) > 0">
          <div class="section-head">
            <div class="section-title">Búsquedas por día</div>
            <div class="section-sub">Últimos 14 días</div>
          </div>
          <div class="sparkline-wrap">
            <svg viewBox="0 0 460 60" class="sparkline-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#2563EB" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#2563EB" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <!-- Area fill -->
              <polygon
                [attr.points]="sparklineArea()"
                fill="url(#sparkGrad)"
              />
              <!-- Line -->
              <polyline
                [attr.points]="sparklinePoints()"
                fill="none"
                stroke="#2563EB"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            </svg>
            <!-- Day labels -->
            <div class="spark-labels">
              <span *ngFor="let d of m.busquedasPorDia" class="spark-lbl">
                {{ d.fecha.slice(5) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Top municipios -->
        <div class="section-card" *ngIf="topMunicipios().length > 0">
          <div class="section-head">
            <div class="section-title">Top municipios buscados</div>
          </div>
          <div class="muni-list">
            <div class="muni-row" *ngFor="let r of topMunicipios(); let i = index">
              <div class="muni-rank">#{{ i + 1 }}</div>
              <div class="muni-name">{{ r.municipio }}</div>
              <div class="muni-bar-wrap">
                <div class="muni-bar" [style.width.%]="r.pct"></div>
              </div>
              <div class="muni-count">{{ r.count }}</div>
            </div>
          </div>
        </div>

        <!-- Patrones completos -->
        <div class="section-card">
          <div class="section-head">
            <div class="section-title">Patrones de búsqueda</div>
            <div class="section-sub">municipio + barrio, top 15</div>
          </div>
          <div *ngIf="m.patrones.length === 0" class="empty">Sin datos todavía.</div>
          <div class="patron-list">
            <div class="patron-row" *ngFor="let p of m.patrones">
              <span class="patron-key">{{ p.patron }}</span>
              <span class="patron-bar-wrap">
                <span class="patron-bar"
                  [style.width.%]="m.patrones[0].veces > 0 ? (p.veces / m.patrones[0].veces * 100) : 0">
                </span>
              </span>
              <span class="patron-count">{{ p.veces }}</span>
            </div>
          </div>
        </div>

      </ng-container>

      <ng-template #loadingTpl>
        <div class="loading-wrap">
          <div class="loading-spinner"></div>
          <span>Cargando métricas…</span>
        </div>
      </ng-template>

      <div class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</div>

    </div>
  `,
  styles: [`
    .admin-wrap {
      min-height: 100vh;
      padding: 28px;
      background: #F7F9FB;
      font-family: 'DM Sans', sans-serif;
      display: flex; flex-direction: column; gap: 20px;
    }

    /* Header */
    .admin-header {
      display: flex; justify-content: space-between; align-items: flex-start;
    }
    .admin-title {
      font-size: 26px; font-weight: 800; color: #1A1A1A;
      letter-spacing: -0.04em; margin: 0 0 4px;
    }
    .admin-sub { font-size: 13px; color: #6B7280; margin: 0; }
    .live-badge {
      display: flex; align-items: center; gap: 6px;
      background: #F0FDF4; border: 1px solid #BBF7D0;
      border-radius: 999px; padding: 5px 12px;
      font-size: 11px; font-weight: 700; color: #15803D;
    }
    .live-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #22C55E;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* KPI grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }
    .kpi-card {
      background: #fff; border: 1px solid #F3F4F6;
      border-radius: 14px; padding: 16px;
    }
    .kpi-accent {
      border-color: #BFDBFE;
      background: linear-gradient(135deg, #EFF6FF, #fff);
    }
    .kpi-label {
      font-size: 11px; font-weight: 700; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.07em;
      margin-bottom: 8px;
    }
    .kpi-val {
      font-size: 36px; font-weight: 800; color: #1A1A1A;
      letter-spacing: -0.05em; line-height: 1;
    }

    /* Section cards */
    .section-card {
      background: #fff; border: 1px solid #F3F4F6;
      border-radius: 14px; padding: 20px;
    }
    .section-head {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 16px;
    }
    .section-title { font-size: 14px; font-weight: 700; color: #1A1A1A; }
    .section-sub { font-size: 11px; color: #9CA3AF; }

    /* Sparkline */
    .sparkline-wrap { display: flex; flex-direction: column; gap: 4px; }
    .sparkline-svg {
      width: 100%; height: 60px;
      display: block; overflow: visible;
    }
    .spark-labels {
      display: flex; justify-content: space-between;
      flex-wrap: nowrap; overflow: hidden;
    }
    .spark-lbl { font-size: 9px; color: #D1D5DB; flex: 1; text-align: center; }

    /* Municipios */
    .muni-list { display: flex; flex-direction: column; gap: 10px; }
    .muni-row {
      display: grid;
      grid-template-columns: 24px 120px 1fr 36px;
      align-items: center; gap: 10px;
    }
    .muni-rank { font-size: 11px; font-weight: 700; color: #D1D5DB; }
    .muni-name { font-size: 13px; font-weight: 600; color: #1A1A1A; }
    .muni-bar-wrap {
      background: #F3F4F6; border-radius: 4px; height: 8px; overflow: hidden;
    }
    .muni-bar { background: #2563EB; height: 100%; border-radius: 4px; transition: width .4s; }
    .muni-count { font-size: 12px; font-weight: 700; color: #6B7280; text-align: right; }

    /* Patron list */
    .patron-list { display: flex; flex-direction: column; }
    .patron-row {
      display: grid; grid-template-columns: 160px 1fr 40px;
      align-items: center; gap: 8px;
      border-top: 1px solid #F3F4F6;
      padding: 8px 0;
    }
    .patron-row:first-child { border-top: none; }
    .patron-key { font-size: 12px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .patron-bar-wrap {
      background: #F3F4F6; border-radius: 4px; height: 6px; overflow: hidden;
    }
    .patron-bar { background: #93C5FD; height: 100%; border-radius: 4px; display: block; }
    .patron-count { font-size: 12px; font-weight: 700; color: #1A1A1A; text-align: right; }

    /* Loading */
    .loading-wrap {
      display: flex; align-items: center; gap: 10px;
      color: #6B7280; font-size: 13px; padding: 40px 0;
    }
    .loading-spinner {
      width: 20px; height: 20px;
      border: 2px solid #E5E7EB; border-top-color: #2563EB;
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty { color: #9CA3AF; font-size: 13px; }
    .error-msg { color: #DC2626; font-size: 13px; }
  `]
})
export class AdminValidacionComponent implements OnInit {
  private backend = inject(UrbiaBackendService);

  readonly dias = 30;
  readonly metricas = signal<AdminMetricas | null>(null);
  errorMsg = '';

  readonly sparklinePoints = computed(() => {
    const data = this.metricas()?.busquedasPorDia ?? [];
    if (data.length < 2) return '';
    const W = 460, H = 60, PAD = 4;
    const maxV = Math.max(...data.map(d => d.count), 1);
    return data.map((d, i) => {
      const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
      const y = H - PAD - (d.count / maxV) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  });

  readonly sparklineArea = computed(() => {
    const pts = this.sparklinePoints();
    if (!pts) return '';
    const data = this.metricas()?.busquedasPorDia ?? [];
    if (data.length < 2) return '';
    const W = 460, H = 60, PAD = 4;
    const firstX = PAD;
    const lastX = W - PAD;
    return `${firstX},${H} ${pts} ${lastX},${H}`;
  });

  readonly topMunicipios = computed(() => {
    const patrones = this.metricas()?.patrones ?? [];
    const map = new Map<string, number>();
    for (const p of patrones) {
      const muni = p.patron.split('|')[0];
      map.set(muni, (map.get(muni) ?? 0) + p.veces);
    }
    const sorted = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topCount = sorted[0]?.[1] ?? 1;
    return sorted.map(([municipio, count]) => ({
      municipio,
      count,
      pct: Math.round(count / topCount * 100),
    }));
  });

  ngOnInit(): void {
    this.backend.getMetricasAdmin(this.dias).subscribe({
      next: (m) => this.metricas.set(m),
      error: () => { this.errorMsg = 'No se pudieron cargar las métricas.'; }
    });
  }
}

