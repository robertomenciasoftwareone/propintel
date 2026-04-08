import { Component, inject, computed } from '@angular/core';
import { DecimalPipe, NgIf } from '@angular/common';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [DecimalPipe, NgIf],
  template: `
    <div class="kpi-row">
      <div class="kpi-card asking">
        <div class="kpi-label">Asking Price medio</div>
        <div class="kpi-value">
          {{ d().askingMedio | number:'1.0-0':'es-ES' }}
          <span class="kpi-unit">€/m²</span>
        </div>
        <div class="kpi-sources" *ngIf="d().askingIdealista || d().askingFotocasa">
          <span class="src-tag src-idealista" *ngIf="d().askingIdealista">
            Idealista: {{ d().askingIdealista | number:'1.0-0':'es-ES' }} €
          </span>
          <span class="src-sep" *ngIf="d().askingIdealista && d().askingFotocasa">·</span>
          <span class="src-tag src-fotocasa" *ngIf="d().askingFotocasa">
            Fotocasa: {{ d().askingFotocasa | number:'1.0-0':'es-ES' }} €
          </span>
        </div>
        <div class="kpi-delta delta-up">
          ↑ Precio ponderado de ambos portales
        </div>
      </div>

      <div class="kpi-card notarial">
        <div class="kpi-label">Precio Notarial real</div>
        <div class="kpi-value">
          {{ d().notarialMedio | number:'1.0-0':'es-ES' }}
          <span class="kpi-unit">€/m²</span>
        </div>
        <div class="kpi-delta delta-down">
          ↓ Lo que se pagó de verdad · Portal Notarial oficial
        </div>
      </div>

      <div class="kpi-card gap-card">
        <div class="kpi-label">Gap negociable</div>
        <div class="kpi-value">
          {{ d().gap | number:'1.1-1':'es-ES' }}
          <span class="kpi-unit">%</span>
        </div>
        <div class="kpi-delta delta-gap">
          → Margen entre asking y precio real de cierre
        </div>
      </div>

      <div class="kpi-card tx-card">
        <div class="kpi-label">Transacciones este mes</div>
        <div class="kpi-value">
          {{ d().txMes | number:'1.0-0':'es-ES' }}
        </div>
        <div class="kpi-delta delta-neutral">
          ↗ Escrituras notariales en {{ d().nombre }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .kpi-card {
      background: #FFFFFF;
      border: 1px solid rgba(0, 52, 255, 0.06);
      border-radius: 16px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 30px -10px rgba(0, 52, 255, 0.05);
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      border-radius: 16px 16px 0 0;
    }
    .kpi-card.asking::before   { background: #0052FF; }
    .kpi-card.notarial::before { background: #00B5A3; }
    .kpi-card.gap-card::before { background: #F59E0B; }
    .kpi-card.tx-card::before  { background: #94A3B8; }
    .kpi-card:hover {
      border-color: rgba(0, 52, 255, 0.12);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px -10px rgba(0, 52, 255, 0.10);
    }

    .kpi-label {
      font-size: 10.5px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-variant: small-caps;
      color: #94A3B8;
      font-weight: 600;
      margin-bottom: 14px;
    }
    .kpi-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1;
      color: #0F172A;
    }
    .kpi-unit {
      font-size: 13px;
      color: #64748B;
      margin-left: 4px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 500;
    }
    .kpi-delta {
      margin-top: 14px;
      font-size: 11.5px;
      font-weight: 400;
      color: #64748B;
    }
    .delta-up      { color: #0052FF; }
    .delta-down    { color: #00B5A3; }
    .delta-gap     { color: #F59E0B; }
    .delta-neutral { color: #94A3B8; }

    .kpi-sources {
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 500;
    }
    .src-tag { opacity: 0.85; }
    .src-idealista { color: #F59E0B; }
    .src-fotocasa  { color: #0052FF; }
    .src-sep       { color: #94A3B8; font-size: 10px; }

    @media (max-width: 1100px) {
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class KpiCardsComponent {
  svc = inject(InmobiliarioService);
  d = this.svc.ciudadData;
}
