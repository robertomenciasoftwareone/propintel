import { Component, computed, inject } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';

@Component({
  selector: 'app-notarial-table',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe, RouterLink],
  template: `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Precio de Venta Estimado por Piso</div>
          <div class="card-sub">Precio real estimado (notarial × m²) vs precio de anuncio</div>
        </div>
        <div class="source-badge">
          <div class="live-dot"></div>
          INE · Notariado
        </div>
      </div>

      <!-- Resumen por zona -->
      <div class="zone-summary" *ngIf="svc.ciudadData().notariales.length > 0">
        <div class="zone-chip" *ngFor="let n of svc.ciudadData().notariales">
          <span class="zone-name">{{ n.municipio }}</span>
          <span class="zone-price">{{ n.precioMedioM2 | number:'1.0-0':'es-ES' }} €/m²</span>
          <span class="zone-tx">{{ n.numTransacciones }} tx</span>
        </div>
      </div>

      <!-- Tabla de pisos -->
      <table class="nt-table">
        <thead>
          <tr>
            <th>Zona</th>
            <th>Tipo</th>
            <th class="text-right">m²</th>
            <th class="text-right">Anuncio</th>
            <th class="text-right">Venta estimada</th>
            <th class="text-right">Diferencia</th>
            <th class="text-right">Gap</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of pisos()"
              [routerLink]="['/ficha', p.anuncioId]"
              class="clickable-row"
              title="Ver ficha del inmueble">
            <td class="col-zona">{{ p.distrito }}</td>
            <td class="col-tipo">
              <span class="tipo-badge">{{ p.tipoInmueble }}</span>
              <span class="hab-info" *ngIf="p.habitaciones">{{ p.habitaciones }}h</span>
            </td>
            <td class="col-m2 text-right">{{ p.m2 }}</td>
            <td class="col-asking text-right">{{ p.precioAnuncio | number:'1.0-0':'es-ES' }} €</td>
            <td class="col-venta text-right">{{ p.precioVenta | number:'1.0-0':'es-ES' }} €</td>
            <td class="col-diff text-right">
              <span [class]="p.diferencia > 0 ? 'diff-over' : 'diff-under'">
                {{ p.diferencia > 0 ? '+' : '' }}{{ p.diferencia | number:'1.0-0':'es-ES' }} €
              </span>
            </td>
            <td class="text-right">
              <span class="gap-badge" [class]="svc.getGapClass(p.gap)">
                {{ p.gap > 0 ? '+' : '' }}{{ p.gap | number:'1.1-1':'es-ES' }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="empty-state" *ngIf="pisos().length === 0">
        <p>No hay datos de pisos con precio notarial para esta ciudad.</p>
      </div>

      <div class="table-footer">
        <span>Venta estimada = precio notarial medio de la zona × m² · Fuente: INE (IPV)</span>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: #FFFFFF;
      border: 1px solid rgba(0, 52, 255, 0.06);
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 10px 30px -10px rgba(0, 52, 255, 0.05);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.03em;
    }
    .card-sub {
      font-size: 11.5px;
      color: #64748B;
      margin-top: 4px;
      font-weight: 400;
    }

    .source-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #00B5A3;
      background: rgba(0, 181, 163, 0.06);
      border: 1px solid rgba(0, 181, 163, 0.18);
      padding: 5px 12px;
      border-radius: 20px;
    }
    .live-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #00B5A3;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    .zone-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .zone-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 8px;
      background: rgba(0, 181, 163, 0.05);
      border: 1px solid rgba(0, 181, 163, 0.12);
      font-size: 11px;
    }
    .zone-name  { color: #0F172A; font-weight: 500; }
    .zone-price { color: #00B5A3; font-family: 'JetBrains Mono', monospace; font-weight: 500; }
    .zone-tx    { color: #94A3B8; }

    .nt-table { width: 100%; border-collapse: collapse; }
    :host { display: block; overflow-x: auto; }

    .nt-table th {
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-variant: small-caps;
      color: #94A3B8;
      padding: 8px 12px;
      text-align: left;
      border-bottom: 0.5px solid rgba(0, 52, 255, 0.08);
      font-weight: 600;
      background: #F8FAFC;
    }
    .nt-table th.text-right { text-align: right; }
    .nt-table td {
      padding: 11px 12px;
      font-size: 12.5px;
      border-bottom: 0.5px solid rgba(0, 52, 255, 0.05);
      vertical-align: middle;
      transition: background 0.15s ease;
    }
    .nt-table tr:last-child td { border-bottom: none; }
    .nt-table tr:hover td { background: #F0F7FF; }
    .nt-table tr.clickable-row { cursor: pointer; }
    .nt-table tr.clickable-row:hover td { background: #F0F7FF; }
    .text-right { text-align: right; }

    .col-zona    { color: #0F172A; font-weight: 500; }
    .col-tipo    { white-space: nowrap; }
    .tipo-badge  { font-size: 11.5px; color: #0F172A; font-weight: 500; }
    .hab-info    { font-size: 10px; color: #94A3B8; margin-left: 3px; }
    .col-m2      { color: #64748B; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; }
    .col-asking  { color: #0052FF; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .col-venta   { color: #00B5A3; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; }
    .col-diff    { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; }
    .diff-over   { color: #f87171; }
    .diff-under  { color: #4fd1a5; }

    .gap-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
    }
    .gap-high { background: rgba(248,113,113,0.12); color: #f87171; }
    .gap-med  { background: rgba(245,158,11,0.10);  color: #F59E0B; }
    .gap-low  { background: rgba(79,209,165,0.10);  color: #4fd1a5; }

    .table-footer {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 0.5px solid rgba(0, 52, 255, 0.06);
      font-size: 11px;
      color: #94A3B8;
    }

    .empty-state {
      text-align: center;
      padding: 40px 16px;
      color: #64748B;
      font-size: 13px;
    }
  `]
})
export class NotarialTableComponent {
  readonly svc = inject(InmobiliarioService);

  readonly pisos = computed(() => {
    const txs = this.svc.ciudadData().transacciones;
    return txs
      .filter(tx => tx.m2 > 0 && tx.notarialPrecio > 0)
      .map(tx => ({
        anuncioId:     tx.anuncioId,
        distrito:      tx.distrito,
        tipoInmueble:  tx.tipoInmueble,
        habitaciones:  tx.habitaciones,
        m2:            tx.m2,
        precioAnuncio: Math.round(tx.askingPrecio * tx.m2),
        precioVenta:   Math.round(tx.notarialPrecio * tx.m2),
        diferencia:    Math.round((tx.askingPrecio - tx.notarialPrecio) * tx.m2),
        gap:           tx.gap,
      }))
      .sort((a, b) => b.diferencia - a.diferencia);
  });
}
