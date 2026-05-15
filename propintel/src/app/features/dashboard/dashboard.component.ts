import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe, DecimalPipe } from '@angular/common';
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
    RouterLink, UpperCasePipe, DecimalPipe,
    KpiCardsComponent, EvolucionChartComponent, GapDistritosComponent,
    RangoFiableComponent, TransaccionesTableComponent, NotarialTableComponent,
    ServiciosPanelComponent, MacroContextoComponent,
  ],
  template: `
    <div class="dashboard">

      <!-- ── HERO: Centro de mando ── -->
      <div class="hero">
        <div class="hero-top">
          <div class="hero-text">
            <div class="live-pill">
              <div class="live-dot"></div>
              <span>{{ svc.ciudadData().nombre | uppercase }} · Datos actualizados hoy</span>
            </div>
            <h1 class="hero-title">
              Los pisos en <span class="city-hl">{{ svc.ciudadData().nombre }}</span>
              están
              <span class="gap-hl" [class.gap-pos]="svc.ciudadData().gap > 0">
                {{ svc.ciudadData().gap ? ((svc.ciudadData().gap > 0 ? '+' : '') + svc.ciudadData().gap.toFixed(0) + '%') : '—' }}
              </span>
              sobre precio notarial
            </h1>
            <p class="hero-sub">Asking Price (Idealista/Fotocasa) vs transacciones reales · Fuente: Consejo General del Notariado</p>
          </div>

          <!-- KPI rápidos -->
          <div class="hero-kpis">
            <div class="hkpi">
              <div class="hkpi-val">{{ svc.ciudadData().askingMedio ? (svc.ciudadData().askingMedio | number:'1.0-0') + ' €/m²' : '—' }}</div>
              <div class="hkpi-label">Precio asking</div>
            </div>
            <div class="hkpi-sep"></div>
            <div class="hkpi">
              <div class="hkpi-val">{{ svc.ciudadData().notarialMedio ? (svc.ciudadData().notarialMedio | number:'1.0-0') + ' €/m²' : '—' }}</div>
              <div class="hkpi-label">Precio notarial</div>
            </div>
            <div class="hkpi-sep"></div>
            <div class="hkpi">
              <div class="hkpi-val">{{ svc.ciudadData().txMes ? (svc.ciudadData().txMes | number:'1.0-0') : '—' }}</div>
              <div class="hkpi-label">Transacciones/mes</div>
            </div>
          </div>
        </div>

        <!-- ── Acciones rápidas ── -->
        <div class="actions-grid">
          <a routerLink="/mapa-resultados" class="action-card action-primary">
            <div class="ac-icon">🔍</div>
            <div class="ac-body">
              <div class="ac-title">Buscar piso</div>
              <div class="ac-sub">Mapa con precios y alertas</div>
            </div>
            <svg class="ac-arrow" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </a>

          <a routerLink="/tasacion" class="action-card">
            <div class="ac-icon">🏷️</div>
            <div class="ac-body">
              <div class="ac-title">Valorar un piso</div>
              <div class="ac-sub">AVM con 20 comparables</div>
            </div>
            <svg class="ac-arrow" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </a>

          <a routerLink="/roi" class="action-card">
            <div class="ac-icon">📈</div>
            <div class="ac-body">
              <div class="ac-title">Calcular ROI</div>
              <div class="ac-sub">Rentabilidad de inversión</div>
            </div>
            <svg class="ac-arrow" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </a>

          <a routerLink="/hipotecas" class="action-card">
            <div class="ac-icon">🏦</div>
            <div class="ac-body">
              <div class="ac-title">Simular hipoteca</div>
              <div class="ac-sub">Cuota, TAE y capacidad</div>
            </div>
            <svg class="ac-arrow" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </a>

          <a routerLink="/checklist" class="action-card">
            <div class="ac-icon">✅</div>
            <div class="ac-body">
              <div class="ac-title">Checklist comprador</div>
              <div class="ac-sub">Pasos para no olvidar nada</div>
            </div>
            <svg class="ac-arrow" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </a>

          <a routerLink="/comparar" class="action-card">
            <div class="ac-icon">⚖️</div>
            <div class="ac-body">
              <div class="ac-title">Comparar pisos</div>
              <div class="ac-sub">Lado a lado con datos reales</div>
            </div>
            <svg class="ac-arrow" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </a>
        </div>
      </div>

      <!-- ── Datos de mercado ── -->
      <div class="section-label">Mercado en {{ svc.ciudadData().nombre }}</div>
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
      padding: 28px 32px;
      display: flex; flex-direction: column; gap: 20px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #F8FAFC; min-height: 100vh;
      animation: fadeIn .35s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    /* ── Hero ── */
    .hero {
      background: #fff;
      border: 1px solid rgba(0,82,255,.07);
      border-radius: 20px;
      padding: 28px 32px;
      box-shadow: 0 8px 28px -8px rgba(0,82,255,.07);
      display: flex; flex-direction: column; gap: 24px;
    }
    .hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; }
    .hero-text { display: flex; flex-direction: column; gap: 10px; max-width: 560px; }

    .live-pill {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 10.5px; font-weight: 600; letter-spacing: .08em; color: #64748B;
      text-transform: uppercase;
    }
    .live-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #00B5A3;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,181,163,.35)} 50%{box-shadow:0 0 0 6px rgba(0,181,163,0)} }

    .hero-title {
      font-size: 24px; font-weight: 800; color: #0F172A;
      letter-spacing: -.04em; line-height: 1.25; margin: 0;
    }
    .city-hl { color: #0052FF; }
    .gap-hl { padding: 2px 10px; border-radius: 6px; font-weight: 800; }
    .gap-pos { background: #FFF7ED; color: #F59E0B; }

    .hero-sub { font-size: 11.5px; color: #94A3B8; margin: 0; }

    /* KPIs rápidos */
    .hero-kpis {
      display: flex; align-items: center; gap: 20px;
      background: #F8FAFC; border: 1px solid rgba(0,82,255,.06);
      border-radius: 14px; padding: 16px 22px; flex-shrink: 0;
    }
    .hkpi { text-align: center; }
    .hkpi-val { font-size: 18px; font-weight: 800; color: #0F172A; font-family: 'JetBrains Mono', monospace; letter-spacing: -.03em; }
    .hkpi-label { font-size: 10px; color: #94A3B8; font-weight: 500; margin-top: 3px; }
    .hkpi-sep { width: 1px; height: 32px; background: rgba(0,82,255,.08); }

    /* ── Acciones rápidas ── */
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .action-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border-radius: 14px;
      border: 1px solid rgba(0,82,255,.08);
      background: #F8FAFC;
      text-decoration: none; color: inherit;
      cursor: pointer; transition: all .2s cubic-bezier(.4,0,.2,1);
    }
    .action-card:hover {
      border-color: rgba(0,82,255,.2);
      background: #EEF4FF;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(0,82,255,.1);
    }
    .action-primary {
      background: linear-gradient(135deg, #0052FF, #7C3AED);
      border-color: transparent; color: #fff;
    }
    .action-primary:hover {
      background: linear-gradient(135deg, #0041CC, #6D28D9);
      border-color: transparent; color: #fff;
    }
    .action-primary .ac-sub { color: rgba(255,255,255,.7); }
    .action-primary .ac-arrow { color: rgba(255,255,255,.7); }
    .ac-icon { font-size: 22px; flex-shrink: 0; }
    .ac-body { flex: 1; }
    .ac-title { font-size: 13px; font-weight: 700; color: inherit; }
    .ac-sub { font-size: 11px; color: #64748B; margin-top: 2px; }
    .ac-arrow { width: 16px; height: 16px; flex-shrink: 0; color: #94A3B8; }

    /* Section label */
    .section-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .1em; color: #94A3B8; padding: 0 4px;
    }

    @media (max-width: 900px) {
      .dashboard { padding: 16px; }
      .hero { padding: 20px; }
      .hero-title { font-size: 20px; }
      .hero-kpis { display: none; }
      .actions-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 600px) {
      .actions-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent {
  svc = inject(InmobiliarioService);
}
