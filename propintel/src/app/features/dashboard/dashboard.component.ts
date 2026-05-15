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

      <!-- ── Bot CTA banner ── -->
      <a routerLink="/asistente" class="bot-banner">
        <div class="bot-orb">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#E8C547" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="bot-orb-pulse"></div>
        </div>
        <div class="bot-copy">
          <div class="bot-title">UrbIA Copilot <span class="bot-badge-new">NUEVO</span></div>
          <div class="bot-sub">Pregunta en lenguaje natural: busca pisos con fotos, calcula hipotecas, analiza zonas — todo desde el chat.</div>
        </div>
        <div class="bot-examples">
          <div class="bot-ex">"3 habitaciones en Tetuán por menos de 400k"</div>
          <div class="bot-ex">"¿Cuánto pago de hipoteca por 280.000€ a 30 años?"</div>
          <div class="bot-ex">"¿Está bajando el precio en Madrid?"</div>
        </div>
        <div class="bot-cta">
          Abrir copilot
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </a>

      <!-- ── Hub de herramientas ── -->
      <div class="hub-section">
        <div class="hub-header">
          <div class="section-label">Todas las herramientas</div>
          <div class="hub-sub">Acceso directo a todo lo que necesitas</div>
        </div>

        <div class="hub-groups">

          <!-- Comprar -->
          <div class="hub-group">
            <div class="hub-group-label">🏠 Comprar piso</div>
            <div class="hub-tools">
              <a routerLink="/mapa-resultados"   class="tool-card tool-primary"><span class="tc-icon">🔍</span><span class="tc-name">Buscar piso</span><span class="tc-sub">Mapa + semáforo</span></a>
              <a routerLink="/alertas"            class="tool-card"><span class="tc-icon">🔔</span><span class="tc-name">Alertas</span><span class="tc-sub">Por zona y favoritos</span></a>
              <a routerLink="/checklist"          class="tool-card"><span class="tc-icon">✅</span><span class="tc-name">Checklist</span><span class="tc-sub">Guía de compra</span></a>
              <a routerLink="/comparar"           class="tool-card"><span class="tc-icon">⚖️</span><span class="tc-name">Comparar</span><span class="tc-sub">Pisos lado a lado</span></a>
              <a routerLink="/costes-compra"      class="tool-card"><span class="tc-icon">💸</span><span class="tc-name">Costes de compra</span><span class="tc-sub">ITP, notaría, AJD</span></a>
              <a routerLink="/documentos"         class="tool-card"><span class="tc-icon">📁</span><span class="tc-name">Documentos</span><span class="tc-sub">Plantillas y guías</span></a>
            </div>
          </div>

          <!-- Analizar -->
          <div class="hub-group">
            <div class="hub-group-label">📊 Analizar mercado</div>
            <div class="hub-tools">
              <a routerLink="/estadisticas"       class="tool-card"><span class="tc-icon">📈</span><span class="tc-name">Estadísticas</span><span class="tc-sub">INE, BdE, tendencias</span></a>
              <a routerLink="/historial-precios"  class="tool-card"><span class="tc-icon">🕐</span><span class="tc-name">Historial</span><span class="tc-sub">Precios por año</span></a>
              <a routerLink="/barrios"            class="tool-card"><span class="tc-icon">🏘️</span><span class="tc-name">Barrios</span><span class="tc-sub">Calidad de vida</span></a>
              <a routerLink="/mapa"               class="tool-card"><span class="tc-icon">🗺️</span><span class="tc-name">Mapa de calor</span><span class="tc-sub">Precios por CP</span></a>
              <a routerLink="/catastro"           class="tool-card"><span class="tc-icon">🏛️</span><span class="tc-name">Catastro</span><span class="tc-sub">Datos registrales</span></a>
            </div>
          </div>

          <!-- Calcular -->
          <div class="hub-group">
            <div class="hub-group-label">🧮 Calcular</div>
            <div class="hub-tools">
              <a routerLink="/hipotecas"          class="tool-card"><span class="tc-icon">🏦</span><span class="tc-name">Hipotecas</span><span class="tc-sub">Cuota, TAE, capacidad</span></a>
              <a routerLink="/roi"                class="tool-card"><span class="tc-icon">📈</span><span class="tc-name">ROI</span><span class="tc-sub">Rentabilidad</span></a>
              <a routerLink="/tasacion"           class="tool-card"><span class="tc-icon">🏷️</span><span class="tc-name">Tasación AVM</span><span class="tc-sub">Valor estimado</span></a>
              <a routerLink="/precalificacion"    class="tool-card"><span class="tc-icon">✔️</span><span class="tc-name">Precalificación</span><span class="tc-sub">¿Puedo comprarlo?</span></a>
              <a routerLink="/seguros"            class="tool-card"><span class="tc-icon">🛡️</span><span class="tc-name">Seguros</span><span class="tc-sub">Hogar e hipoteca</span></a>
            </div>
          </div>

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

    /* ── Bot Banner ── */
    .bot-banner {
      display: grid; grid-template-columns: auto 1fr auto auto;
      align-items: center; gap: 24px;
      padding: 22px 28px; border-radius: 18px;
      background: linear-gradient(135deg, #0d0f12 0%, #1a1c24 60%, #16171e 100%);
      border: 1px solid rgba(232,197,71,0.25);
      text-decoration: none; color: inherit; cursor: pointer;
      transition: all .25s; position: relative; overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    }
    .bot-banner::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse 60% 80% at 10% 50%, rgba(232,197,71,0.07), transparent);
      pointer-events: none;
    }
    .bot-banner:hover { border-color: rgba(232,197,71,0.45); box-shadow: 0 12px 40px rgba(232,197,71,0.12); transform: translateY(-1px); }

    .bot-orb {
      width: 52px; height: 52px; border-radius: 16px; position: relative;
      background: rgba(232,197,71,0.12); border: 1px solid rgba(232,197,71,0.3);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .bot-orb-pulse {
      position: absolute; bottom: 3px; right: 3px; width: 10px; height: 10px;
      border-radius: 50%; background: #4fd1a5; border: 2px solid #0d0f12;
      animation: bpulse 2s ease infinite;
    }
    @keyframes bpulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    .bot-copy { display: flex; flex-direction: column; gap: 5px; }
    .bot-title { font-size: 15px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }
    .bot-badge-new {
      font-size: 9px; letter-spacing: 1px; font-weight: 700;
      background: rgba(232,197,71,0.2); color: #E8C547;
      border: 1px solid rgba(232,197,71,0.3); padding: 2px 7px; border-radius: 6px;
    }
    .bot-sub { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.5; max-width: 340px; font-weight: 300; }

    .bot-examples { display: flex; flex-direction: column; gap: 5px; }
    .bot-ex {
      font-size: 11px; color: rgba(255,255,255,0.4); font-style: italic;
      padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
    }

    .bot-cta {
      display: flex; align-items: center; gap: 7px; white-space: nowrap;
      font-size: 13px; font-weight: 600; color: #E8C547;
      background: rgba(232,197,71,0.12); border: 1px solid rgba(232,197,71,0.3);
      padding: 10px 18px; border-radius: 12px; transition: all .2s; flex-shrink: 0;
    }
    .bot-banner:hover .bot-cta { background: rgba(232,197,71,0.2); }

    /* ── Hub ── */
    .hub-section { background: #fff; border: 1px solid rgba(0,82,255,.07); border-radius: 20px; padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 4px 16px -4px rgba(0,82,255,.06); }
    .hub-header { display: flex; align-items: baseline; gap: 12px; }
    .hub-sub { font-size: 11.5px; color: #94A3B8; font-weight: 300; }

    .hub-groups { display: flex; flex-direction: column; gap: 20px; }
    .hub-group { display: flex; flex-direction: column; gap: 10px; }
    .hub-group-label { font-size: 12px; font-weight: 600; color: #475569; }

    .hub-tools { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
    .tool-card {
      display: flex; flex-direction: column; gap: 4px;
      padding: 14px 14px 12px; border-radius: 12px;
      border: 1px solid rgba(0,82,255,.08); background: #F8FAFC;
      text-decoration: none; color: inherit; cursor: pointer;
      transition: all .2s;
    }
    .tool-card:hover {
      border-color: rgba(0,82,255,.22); background: #EEF4FF;
      transform: translateY(-2px); box-shadow: 0 5px 16px rgba(0,82,255,.09);
    }
    .tool-primary {
      background: linear-gradient(135deg, #0052FF, #7C3AED);
      border-color: transparent; color: #fff;
    }
    .tool-primary:hover { filter: brightness(1.08); border-color: transparent; }
    .tool-primary .tc-sub { color: rgba(255,255,255,.65); }
    .tc-icon { font-size: 20px; }
    .tc-name { font-size: 13px; font-weight: 600; color: inherit; line-height: 1.3; }
    .tc-sub { font-size: 10.5px; color: #64748B; font-weight: 300; line-height: 1.3; }

    @media (max-width: 900px) {
      .dashboard { padding: 16px; }
      .hero { padding: 20px; }
      .hero-title { font-size: 20px; }
      .hero-kpis { display: none; }
      .actions-grid { grid-template-columns: 1fr 1fr; }
      .bot-banner { grid-template-columns: auto 1fr; }
      .bot-examples, .bot-cta { display: none; }
      .hub-tools { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
    }
    @media (max-width: 600px) {
      .actions-grid { grid-template-columns: 1fr; }
      .bot-banner { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent {
  svc = inject(InmobiliarioService);
}
