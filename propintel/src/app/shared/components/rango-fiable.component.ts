import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import { RangoFiable } from '../../core/models/inmobiliario.model';

@Component({
  selector: 'app-rango-fiable',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Rango de precio fiable por zona</div>
          <div class="card-sub">
            <span class="leg asking-leg">━ Asking</span>
            <span class="leg notarial-leg">▬ Rango notarial real</span>
          </div>
        </div>
      </div>

      <div class="rango-list">
        <div class="rango-item" *ngFor="let r of svc.ciudadData().rangos">
          <div class="rango-header">
            <span class="rango-zona">{{ r.zona }}</span>
            <span class="rango-vals">
              <span style="color:var(--notarial)">{{ r.precioMin.toLocaleString('es-ES') }}–{{ r.precioMax.toLocaleString('es-ES') }} €/m²</span>
              <span class="sep">·</span>
              <span style="color:var(--asking)">asking: {{ r.askingMedio.toLocaleString('es-ES') }}€</span>
            </span>
          </div>

          <div class="rango-bar-container">
            <div class="rango-bar">
              <!-- Banda notarial -->
              <div
                class="rango-band"
                [style.left.%]="pct(r.precioMin, r)"
                [style.width.%]="pct(r.precioMax, r) - pct(r.precioMin, r)">
                <span class="band-label-left">{{ r.precioMin.toLocaleString('es-ES') }}</span>
                <span class="band-label-right">{{ r.precioMax.toLocaleString('es-ES') }}</span>
              </div>
              <!-- Línea asking -->
              <div
                class="asking-line"
                [style.left.%]="pct(r.askingMedio, r)">
                <span class="asking-label">{{ r.askingMedio.toLocaleString('es-ES') }}€</span>
              </div>
            </div>
          </div>

          <div class="rango-insight">
            <span class="insight-gap" [style.color]="svc.getGapColor(gapRango(r))">
              +{{ gapRango(r).toFixed(1) }}% sobre rango notarial
            </span>
            <span class="insight-text">→ margen estimado de negociación</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 22px 24px;
    }
    .card-header { margin-bottom: 20px; }
    .card-title  { font-size: 13.5px; font-weight: 500; color: var(--text-primary); }
    .card-sub    { font-size: 11.5px; color: var(--text-secondary); margin-top: 5px; display: flex; gap: 12px; }
    .leg { display: flex; align-items: center; gap: 4px; font-size: 11px; }
    .asking-leg   { color: var(--asking); }
    .notarial-leg { color: var(--notarial); }

    .rango-list { display: flex; flex-direction: column; gap: 22px; }

    .rango-item { display: flex; flex-direction: column; gap: 6px; }

    .rango-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .rango-zona  { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .rango-vals  { font-size: 11px; display: flex; align-items: center; gap: 6px; font-family: 'DM Mono', monospace; }
    .sep { color: var(--text-muted); }

    .rango-bar-container { padding: 8px 0 14px; }

    .rango-bar {
      position: relative;
      height: 14px;
      background: var(--bg3);
      border-radius: 4px;
    }

    .rango-band {
      position: absolute;
      top: 0; bottom: 0;
      background: rgba(79,209,165,0.15);
      border-left: 2px solid var(--notarial);
      border-right: 2px solid var(--notarial);
      border-radius: 2px;
      transition: left .6s ease, width .6s ease;
    }

    .band-label-left, .band-label-right {
      position: absolute;
      bottom: -16px;
      font-size: 9px;
      font-family: 'DM Mono', monospace;
      color: var(--notarial);
      white-space: nowrap;
    }
    .band-label-left  { left: 0;   transform: translateX(-50%); }
    .band-label-right { right: 0;  transform: translateX(50%); }

    .asking-line {
      position: absolute;
      top: -4px; bottom: -4px;
      width: 2.5px;
      background: var(--asking);
      border-radius: 2px;
      transition: left .6s ease;
    }
    .asking-label {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      font-family: 'DM Mono', monospace;
      color: var(--asking);
      white-space: nowrap;
    }

    .rango-insight {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
    }
    .insight-gap  { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; }
    .insight-text { color: var(--text-muted); }
  `]
})
export class RangoFiableComponent {
  svc = inject(InmobiliarioService);

  /** Calcula el % de posición dentro del rango visual (con margen 10%) */
  pct(valor: number, r: RangoFiable): number {
    const min = r.precioMin * 0.9;
    const max = r.askingMedio * 1.05;
    return Math.max(0, Math.min(100, ((valor - min) / (max - min)) * 100));
  }

  gapRango(r: RangoFiable): number {
    return ((r.askingMedio - r.precioMedio) / r.precioMedio) * 100;
  }
}
