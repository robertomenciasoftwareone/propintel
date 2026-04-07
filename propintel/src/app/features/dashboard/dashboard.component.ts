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
      padding: 28px 32px;
      display: flex; flex-direction: column; gap: 24px;
      animation: fadeIn .4s ease;
      font-family: 'Inter', sans-serif;
      background: #F7F9FB;
      min-height: 100vh;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }

    /* Header */
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 20px;
      background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 24px 28px;
    }
    .header-left { display: flex; flex-direction: column; gap: 8px; }
    .city-label {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 700; letter-spacing: .12em; color: #6B7280;
      text-transform: uppercase;
    }
    .live-pulse {
      width: 7px; height: 7px; border-radius: 50%; background: #22C55E;
      box-shadow: 0 0 0 0 rgba(34,197,94,.6);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,.4); }
      50% { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
    }
    .insight-headline {
      font-size: 26px; font-weight: 800; color: #1A1A1A;
      letter-spacing: -0.03em; line-height: 1.25;
      max-width: 560px; margin: 0;
    }
    .city-highlight { color: #2563EB; }
    .headline-accent {
      background: #FEF2F2; color: #B91C1C;
      padding: 2px 8px; border-radius: 6px;
    }
    .header-sub { font-size: 12px; color: #9CA3AF; margin: 0; }

    .header-badge {
      background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px;
      padding: 14px 20px; text-align: center;
    }
    .badge-inner { display: flex; flex-direction: column; gap: 4px; }
    .badge-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #16A34A; }
    .badge-value { font-size: 16px; font-weight: 800; color: #15803D; }

    @media (max-width: 900px) {
      .dashboard { padding: 16px; }
      .insight-headline { font-size: 20px; }
    }
  `]
})
export class DashboardComponent {
  svc = inject(InmobiliarioService);
}
