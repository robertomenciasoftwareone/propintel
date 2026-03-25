import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';

@Component({
  selector: 'app-gap-distritos',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Gap por distrito</div>
          <div class="card-sub">% de sobrevaloración del asking sobre precio notarial real</div>
        </div>
      </div>

      <div class="gap-list">
        <div class="gap-row" *ngFor="let d of svc.ciudadData().distritos">
          <span class="dist-name">{{ d.nombre }}</span>
          <div class="bar-bg">
            <div
              class="bar-fill"
              [style.width.%]="(d.gap / maxGap) * 100"
              [style.background]="svc.getGapColor(d.gap)">
            </div>
          </div>
          <div class="dist-prices">
            <span class="price-asking">{{ d.asking.toLocaleString('es-ES') }}€</span>
            <span class="separator">vs</span>
            <span class="price-notarial">{{ d.notarial.toLocaleString('es-ES') }}€</span>
          </div>
          <span class="gap-pct" [style.color]="svc.getGapColor(d.gap)">
            +{{ d.gap.toFixed(1) }}%
          </span>
        </div>
      </div>

      <div class="legend-note">
        <span class="note-item" style="color:#f87171">■ &gt;20% alto</span>
        <span class="note-item" style="color:#e8c547">■ 13-20% medio</span>
        <span class="note-item" style="color:#4fd1a5">■ &lt;13% bajo</span>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .card-header { margin-bottom: 18px; }
    .card-title  { font-size: 13.5px; font-weight: 500; color: var(--text-primary); }
    .card-sub    { font-size: 11.5px; color: var(--text-secondary); margin-top: 3px; font-weight: 300; }

    .gap-list { display: flex; flex-direction: column; gap: 12px; }

    .gap-row {
      display: grid;
      grid-template-columns: 120px 1fr 160px 65px;
      align-items: center;
      gap: 10px;
    }
    @media(max-width:600px) {
      .gap-row { grid-template-columns: 90px 1fr 120px 50px; gap: 6px; }
    }
    .dist-name { font-size: 12.5px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-bg { height: 6px; background: var(--bg3); border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 3px; transition: width .8s cubic-bezier(.4,0,.2,1); }

    .dist-prices { display: flex; align-items: center; gap: 5px; font-size: 11px; }
    .price-asking   { color: var(--asking);   font-family: 'DM Mono', monospace; }
    .price-notarial { color: var(--notarial); font-family: 'DM Mono', monospace; }
    .separator      { color: var(--text-muted); font-size: 10px; }

    .gap-pct { font-family: 'DM Mono', monospace; font-size: 12px; text-align: right; font-weight: 500; }

    .legend-note {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 16px;
    }
    .note-item { font-size: 11px; }
  `]
})
export class GapDistritosComponent {
  svc = inject(InmobiliarioService);
  get maxGap() {
    return Math.max(...this.svc.ciudadData().distritos.map(d => d.gap));
  }
}
