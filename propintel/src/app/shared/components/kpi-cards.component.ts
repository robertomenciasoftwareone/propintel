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
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 22px;
      position: relative;
      overflow: hidden;
      transition: border-color .2s;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
    }
    .kpi-card.asking::before   { background: var(--asking); }
    .kpi-card.notarial::before { background: var(--notarial); }
    .kpi-card.gap-card::before { background: var(--gap); }
    .kpi-card.tx-card::before  { background: #a78bfa; }
    .kpi-card:hover { border-color: var(--border-bright); }

    .kpi-label {
      font-size: 10.5px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 500;
      margin-bottom: 10px;
    }
    .kpi-value {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 38px;
      letter-spacing: 1px;
      line-height: 1;
      color: var(--text-primary);
    }
    .kpi-unit { font-size: 16px; color: var(--text-secondary); margin-left: 3px; font-family: 'DM Sans', sans-serif; }
    .kpi-delta {
      margin-top: 10px;
      font-size: 11.5px;
      font-weight: 300;
    }
    .delta-up      { color: var(--asking); }
    .delta-down    { color: var(--notarial); }
    .delta-gap     { color: var(--gap); }
    .delta-neutral { color: #a78bfa; }

    .kpi-sources {
      margin-top: 6px;
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 400;
    }
    .src-tag { opacity: 0.85; }
    .src-idealista { color: #e8c547; }
    .src-fotocasa  { color: #60a5fa; }
    .src-sep       { color: var(--text-muted); font-size: 10px; }

    @media (max-width: 1100px) {
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class KpiCardsComponent {
  svc = inject(InmobiliarioService);
  d = this.svc.ciudadData;
}
