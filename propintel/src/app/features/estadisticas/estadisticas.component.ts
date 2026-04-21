import { Component, OnInit, signal, inject } from '@angular/core';
import { NgIf, NgFor, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UrbiaBackendService, IneIpvSerie } from '../../core/services/urbia-backend.service';
import { MacroContextoComponent } from '../../shared/components/macro-contexto.component';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, RouterLink, MacroContextoComponent],
  template: `
    <div class="page">

      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">Estadísticas macroeconómicas</h1>
          <p class="page-sub">
            Datos oficiales del <strong>INE</strong> y <strong>Banco de España</strong> ·
            Actualización automática semanal
          </p>
        </div>
        <a routerLink="/dashboard" class="btn-ghost">← Dashboard</a>
      </div>

      <!-- Resumen KPIs -->
      <app-macro-contexto />

      <!-- Tabs -->
      <div class="tabs">
        <button [class.active]="tab() === 'ipv'"        (click)="tab.set('ipv')">IPV — Índice precios</button>
        <button [class.active]="tab() === 'hipotecas'"  (click)="tab.set('hipotecas')">Hipotecas</button>
        <button [class.active]="tab() === 'info'"       (click)="tab.set('info')">Metodología</button>
      </div>

      <!-- TAB: IPV -->
      <div class="tab-content" *ngIf="tab() === 'ipv'">
        <div class="loading-row" *ngIf="loadingIpv()">
          <div class="spinner"></div><span>Cargando series IPV…</span>
        </div>

        <div class="series-grid" *ngIf="!loadingIpv() && ipvSeries().length">
          <div class="serie-card" *ngFor="let s of ipvSeries()">
            <div class="serie-header">
              <span class="serie-nombre">{{ s.descripcion }}</span>
              <span class="serie-badge">{{ s.serie }}</span>
            </div>
            <div class="serie-table-wrap">
              <table class="serie-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th class="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let d of s.datos.slice().reverse().slice(0, 8)">
                    <td>{{ d.periodo }}</td>
                    <td class="num" [class.pos]="(d.valor ?? 0) > 0" [class.neg]="(d.valor ?? 0) < 0">
                      {{ d.valor != null ? (d.valor | number:'1.1-2':'es-ES') : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!loadingIpv() && !ipvSeries().length">
          No se pudieron cargar los datos del IPV. Comprueba la conexión con la API del INE.
        </div>
      </div>

      <!-- TAB: Hipotecas -->
      <div class="tab-content" *ngIf="tab() === 'hipotecas'">
        <div class="loading-row" *ngIf="loadingHip()">
          <div class="spinner"></div><span>Cargando datos de hipotecas…</span>
        </div>

        <div class="series-grid" *ngIf="!loadingHip() && hipSeries().length">
          <div class="serie-card" *ngFor="let s of hipSeries()">
            <div class="serie-header">
              <span class="serie-nombre">{{ s.descripcion }}</span>
              <span class="serie-badge serie-badge-green">{{ s.serie }}</span>
            </div>
            <div class="serie-table-wrap">
              <table class="serie-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th class="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let d of s.datos.slice().reverse().slice(0, 12)">
                    <td>{{ d.periodo }}</td>
                    <td class="num">
                      {{ d.valor != null ? (d.valor | number:'1.0-0':'es-ES') : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!loadingHip() && !hipSeries().length">
          No se pudieron cargar los datos de hipotecas.
        </div>
      </div>

      <!-- TAB: Info -->
      <div class="tab-content info-tab" *ngIf="tab() === 'info'">
        <div class="info-block">
          <h3>Índice de Precios de Vivienda (IPV)</h3>
          <p>
            Publicado trimestralmente por el <strong>INE</strong>. Mide la evolución de los precios de las
            viviendas de precio libre, tanto nueva como de segunda mano. Base 2007 = 100.
          </p>
          <p>
            <strong>Series utilizadas:</strong> IPV1 (Índice general), IPV3 (Var. anual general),
            IPV5 (Nueva índice), IPV7 (Nueva var. anual), IPV9 (Segunda mano índice), IPV11 (Segunda mano var. anual).
          </p>
          <a class="info-link" href="https://www.ine.es/jaxiT3/Tabla.htm?t=25171" target="_blank" rel="noopener">
            Ver en INE.es →
          </a>
        </div>
        <div class="info-block">
          <h3>Estadística de Hipotecas (HPT)</h3>
          <p>
            Publicada mensualmente por el <strong>INE</strong>. Recoge el número e importe de hipotecas
            constituidas sobre fincas. El indicador principal es el total nacional de fincas.
          </p>
          <p>
            <strong>Series utilizadas:</strong> HPT10176 (Número total nacional),
            HPT10123 (Importe total nacional).
          </p>
          <a class="info-link" href="https://www.ine.es/jaxiT3/Tabla.htm?t=24457" target="_blank" rel="noopener">
            Ver en INE.es →
          </a>
        </div>
        <div class="info-block">
          <h3>Tipos de interés hipotecarios</h3>
          <p>
            Obtenidos del dataset <strong>MIR</strong> del Banco Central Europeo (BCE).
            Serie: préstamos hipotecarios nuevos para adquisición de vivienda libre, España.
          </p>
          <a class="info-link" href="https://www.bde.es/webbde/es/estadis/infoest/bolest12.html" target="_blank" rel="noopener">
            Ver en BdE.es →
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .page {
      padding: 28px 32px;
      display: flex; flex-direction: column; gap: 22px;
      font-family: 'Inter', sans-serif;
      background: #F7F9FB;
      min-height: 100vh;
    }

    /* Header */
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 22px 28px;
    }
    .header-left { display: flex; flex-direction: column; gap: 4px; }
    .page-title { font-size: 22px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.03em; margin: 0; }
    .page-sub   { font-size: 13px; color: #6B7280; margin: 0; }
    .btn-ghost {
      font-size: 13px; font-weight: 600; color: #6B7280; text-decoration: none;
      padding: 8px 16px; border-radius: 8px; border: 1px solid #E5E7EB;
      transition: background .15s;
    }
    .btn-ghost:hover { background: #F9FAFB; color: #374151; }

    /* Tabs */
    .tabs {
      display: flex; gap: 4px;
      background: #fff; border: 1px solid #E5E7EB; border-radius: 12px;
      padding: 6px; width: fit-content;
    }
    .tabs button {
      padding: 8px 20px; font-size: 13px; font-weight: 500; color: #6B7280;
      border: none; border-radius: 8px; cursor: pointer; background: none;
      font-family: inherit; transition: all .15s;
    }
    .tabs button.active { background: #2563EB; color: #fff; font-weight: 600; }
    .tabs button:not(.active):hover { background: #F3F4F6; color: #374151; }

    /* Tab content */
    .tab-content { display: flex; flex-direction: column; gap: 16px; }

    /* Loading */
    .loading-row {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: #6B7280; padding: 20px;
    }
    .spinner {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid #E5E7EB; border-top-color: #2563EB;
      animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Series grid */
    .series-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    @media (max-width: 768px) { .series-grid { grid-template-columns: 1fr; } }

    .serie-card {
      background: #fff; border: 1px solid #E5E7EB; border-radius: 12px;
      overflow: hidden;
    }
    .serie-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; background: #F9FAFB; border-bottom: 1px solid #E5E7EB;
    }
    .serie-nombre { font-size: 12px; font-weight: 600; color: #374151; }
    .serie-badge {
      font-size: 10px; font-weight: 700; color: #2563EB; background: #EFF6FF;
      padding: 2px 8px; border-radius: 6px; letter-spacing: .04em;
    }
    .serie-badge-green { color: #059669; background: #ECFDF5; }

    .serie-table-wrap { overflow-x: auto; }
    .serie-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .serie-table th {
      text-align: left; padding: 8px 14px; color: #9CA3AF; font-weight: 600;
      font-size: 10px; text-transform: uppercase; letter-spacing: .06em;
      border-bottom: 1px solid #F3F4F6;
    }
    .serie-table th.num { text-align: right; }
    .serie-table td { padding: 7px 14px; color: #374151; border-bottom: 1px solid #F9FAFB; }
    .serie-table tr:last-child td { border-bottom: none; }
    .serie-table td.num { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
    .serie-table td.num.pos { color: #059669; }
    .serie-table td.num.neg { color: #EF4444; }

    /* Empty state */
    .empty-state {
      background: #fff; border: 1px solid #FEE2E2; border-radius: 12px;
      padding: 20px; font-size: 13px; color: #EF4444; text-align: center;
    }

    /* Info tab */
    .info-tab { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .info-block {
      background: #fff; border: 1px solid #E5E7EB; border-radius: 12px;
      padding: 20px 22px; display: flex; flex-direction: column; gap: 8px;
    }
    .info-block h3 { font-size: 14px; font-weight: 700; color: #1A1A1A; margin: 0; }
    .info-block p  { font-size: 13px; color: #6B7280; line-height: 1.6; margin: 0; }
    .info-link { font-size: 12px; color: #2563EB; text-decoration: none; font-weight: 600; margin-top: 4px; }
    .info-link:hover { text-decoration: underline; }
  `]
})
export class EstadisticasComponent implements OnInit {
  private svc = inject(UrbiaBackendService);

  tab       = signal<'ipv' | 'hipotecas' | 'info'>('ipv');
  loadingIpv = signal(true);
  loadingHip = signal(true);
  ipvSeries  = signal<IneIpvSerie[]>([]);
  hipSeries  = signal<IneIpvSerie[]>([]);

  ngOnInit() {
    this.svc.getEstadisticasIpv(12).pipe(catchError(() => of([]))).subscribe(data => {
      this.ipvSeries.set(data as IneIpvSerie[]);
      this.loadingIpv.set(false);
    });

    this.svc.getEstadisticasHipotecas(12).pipe(catchError(() => of([]))).subscribe(data => {
      this.hipSeries.set(data as IneIpvSerie[]);
      this.loadingHip.set(false);
    });
  }
}
