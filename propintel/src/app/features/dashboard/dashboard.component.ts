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
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ svc.ciudadData().nombre | uppercase }}</h1>
          <p class="page-sub">Asking Price (Idealista / Fotocasa) vs Precio Real Notarial</p>
        </div>
        <div class="data-note">
          <div class="live-dot"></div>
          Actualizado hoy · Fuente: Portal Estadístico del Notariado
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
    .dashboard { padding:28px 32px; display:flex; flex-direction:column; gap:24px; animation:fadeIn .4s ease; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
    .page-header { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px; }
    .page-title  { font-family:'Bebas Neue',sans-serif; font-size:48px; letter-spacing:2px; line-height:1; }
    .page-sub    { font-size:13px; color:var(--text-secondary); margin-top:6px; font-weight:300; }
    .data-note   {
      display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-muted);
      background:rgba(79,209,165,0.05); border:1px solid rgba(79,209,165,0.15);
      padding:8px 14px; border-radius:8px;
    }
    .live-dot { width:7px; height:7px; border-radius:50%; background:var(--notarial); animation:pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    @media(max-width:1200px){ .dashboard{padding:20px} }
  `]
})
export class DashboardComponent {
  svc = inject(InmobiliarioService);
}
