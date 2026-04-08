import { Component, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import { KpiCardsComponent } from '../../shared/components/kpi-cards.component';
import { EvolucionChartComponent } from '../../shared/components/evolucion-chart.component';
import { GapDistritosComponent } from '../../shared/components/gap-distritos.component';
import { RangoFiableComponent } from '../../shared/components/rango-fiable.component';
import { TransaccionesTableComponent } from '../../shared/components/transacciones-table.component';
import { ServiciosPanelComponent } from '../../shared/components/servicios-panel.component';
import { NotarialTableComponent } from '../../shared/components/notarial-table.component';
import { MacroContextoComponent } from '../../shared/components/macro-contexto.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    UpperCasePipe,
    KpiCardsComponent,
    EvolucionChartComponent,
    GapDistritosComponent,
    RangoFiableComponent,
    TransaccionesTableComponent,
    NotarialTableComponent,
    ServiciosPanelComponent,
    MacroContextoComponent,
  ],
  template: `
    <div class="dashboard">

      <!-- ── INSIGHT HEADER ── -->
      <div class="page-header">
        <div class="header-left">
          <div class="city-label">
            <div class="live-pulse"></div>
            {{ svc.ciudadData().nombre | uppercase }}
          </div>
          <h1 class="insight-headline">
            Los pisos en
            <span class="city-highlight">{{ svc.ciudadData().nombre }}</span>
            tienen un precio
            <span class="headline-accent">
            {{ svc.ciudadData().gap ? ((svc.ciudadData().gap > 0 ? '+' : '') + svc.ciudadData().gap.toFixed(0) + '%') : 'sobrevalorado' }}
            </span>
            vs transacciones reales
          </h1>
          <p class="header-sub">Asking Price (Idealista / Fotocasa) vs Precio Real Notarial · Actualizado hoy</p>
        </div>
        <div class="header-badge">
          <div class="badge-inner">
            <span class="badge-label">FUENTE</span>
            <span class="badge-value">Notariado</span>
          </div>
        </div>
      </div>

      <app-kpi-cards />
      <app-macro-contexto />
      <app-evolucion-chart />
      <app-gap-distritos />
      <app-rango-fiable />
      <app-transacciones-table />
      <app-notarial-table />
      <app-servicios-panel />
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 32px 36px;
      display: flex; flex-direction: column; gap: 24px;
      animation: fadeIn .4s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #F8FAFC;
      min-height: 100vh;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    /* Header */
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 20px;
      background: #FFFFFF;
      border: 1px solid rgba(0, 52, 255, 0.06);
      border-radius: 16px;
      padding: 32px 36px;
      box-shadow: 0 10px 30px -10px rgba(0, 52, 255, 0.05);
    }
    .header-left { display: flex; flex-direction: column; gap: 12px; }
    .city-label {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.10em; color: #94A3B8;
      text-transform: uppercase;
      font-variant: small-caps;
    }
    .live-pulse {
      width: 7px; height: 7px; border-radius: 50%; background: #00B5A3;
      box-shadow: 0 0 0 0 rgba(0, 181, 163, .5);
      animation: livePulse 2s ease-in-out infinite;
    }
    @keyframes livePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(0, 181, 163, .35); }
      50% { box-shadow: 0 0 0 7px rgba(0, 181, 163, 0); }
    }
    .insight-headline {
      font-size: 26px; font-weight: 800; color: #0F172A;
      letter-spacing: -0.04em; line-height: 1.2;
      max-width: 580px; margin: 0;
    }
    .city-highlight { color: #0052FF; }
    .headline-accent {
      background: #FFF7ED; color: #F59E0B;
      padding: 2px 10px; border-radius: 6px; font-weight: 800;
    }
    .header-sub { font-size: 12px; color: #94A3B8; margin: 0; font-weight: 400; }

    .header-badge {
      background: #ECFDF5;
      border: 1px solid rgba(0, 181, 163, 0.15);
      border-radius: 14px;
      padding: 16px 22px;
      text-align: center;
    }
    .badge-inner { display: flex; flex-direction: column; gap: 4px; }
    .badge-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #00B5A3; }
    .badge-value { font-size: 16px; font-weight: 800; color: #00896E; font-family: 'JetBrains Mono', monospace; }

    @media (max-width: 900px) {
      .dashboard { padding: 16px; }
      .insight-headline { font-size: 20px; }
    }
  `]
})
export class DashboardComponent {
  svc = inject(InmobiliarioService);
}
