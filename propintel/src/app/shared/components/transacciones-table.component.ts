import { Component, inject } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';

@Component({
  selector: 'app-transacciones-table',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, RouterLink],
  template: `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Anuncios vs Precio Notarial</div>
          <div class="card-sub">Precio de anuncio (asking) comparado con el precio real notarial de la zona</div>
        </div>
        <div class="source-badge">
          <div class="live-dot"></div>
          Portal Notariado
        </div>
      </div>

      <table class="tx-table">
        <thead>
          <tr>
            <th>Distrito</th>
            <th>Tipo</th>
            <th>Asking</th>
            <th>Notarial</th>
            <th>Gap</th>
            <th>m²</th>
            <th>Portal</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let tx of svc.ciudadData().transacciones"
              [routerLink]="['/ficha', tx.anuncioId]"
              class="clickable-row"
              title="Ver ficha del inmueble">
            <td class="col-zona">{{ tx.distrito }}</td>
            <td class="col-tipo">
              <span class="tipo-badge">{{ tx.tipoInmueble }}</span>
              <span class="hab-info" *ngIf="tx.habitaciones">{{ tx.habitaciones }} hab</span>
            </td>
            <td class="col-asking">{{ tx.askingPrecio.toLocaleString('es-ES') }} €</td>
            <td class="col-notarial">{{ tx.notarialPrecio.toLocaleString('es-ES') }} €</td>
            <td>
              <span class="gap-badge" [class]="svc.getGapClass(tx.gap)">
                +{{ tx.gap.toFixed(1) }}%
              </span>
            </td>
            <td class="col-m2">{{ tx.m2 }}m²</td>
            <td class="col-portal">
              <a *ngIf="tx.url" [href]="tx.url" target="_blank" rel="noopener noreferrer"
                 class="portal-badge" [class.idealista]="tx.fuente === 'idealista'" [class.fotocasa]="tx.fuente === 'fotocasa'">
                {{ tx.fuente === 'idealista' ? 'Idealista' : 'Fotocasa' }}
                <span class="link-icon">↗</span>
              </a>
              <span *ngIf="!tx.url" class="portal-badge" [class.idealista]="tx.fuente === 'idealista'" [class.fotocasa]="tx.fuente === 'fotocasa'">
                {{ tx.fuente === 'idealista' ? 'Idealista' : 'Fotocasa' }}
              </span>
            </td>
            <td class="col-fecha">{{ tx.fecha | date:'dd/MM':'es-ES' }}</td>
          </tr>
        </tbody>
      </table>

      <div class="empty-state" *ngIf="svc.ciudadData().transacciones.length === 0">
        <p>No hay transacciones recientes para esta ciudad.</p>
        <p class="hint">Prueba con otra ciudad que tenga anuncios scrapeados (ej. Asturias).</p>
      </div>

      <div class="table-footer">
        <span>Anuncios: portales · Notarial: penotariado.com</span>
        <button class="btn-link">Ver todas →</button>
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
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .card-title { font-size: 13.5px; font-weight: 500; color: var(--text-primary); }
    .card-sub   { font-size: 11.5px; color: var(--text-secondary); margin-top: 3px; font-weight: 300; }

    .source-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--notarial);
      background: rgba(79,209,165,0.07);
      border: 1px solid rgba(79,209,165,0.2);
      padding: 5px 10px;
      border-radius: 20px;
    }
    .live-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--notarial);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    .tx-table { width: 100%; border-collapse: collapse; table-layout: auto; }
    :host { display: block; overflow-x: auto; }

    .tx-table th {
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-weight: 500;
    }
    .tx-table td {
      padding: 10px 10px;
      font-size: 12.5px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      vertical-align: middle;
    }
    .tx-table tr:last-child td { border-bottom: none; }
    .tx-table tr:hover td { background: rgba(255,255,255,0.02); }
    .tx-table tr.clickable-row { cursor: pointer; }
    .tx-table tr.clickable-row:hover td { background: rgba(232,197,71,0.04); }

    .col-zona     { color: var(--text-primary); font-weight: 400; }
    .col-asking   { color: var(--asking); font-family: 'DM Mono', monospace; font-size: 12px; }
    .col-notarial { color: var(--notarial); font-family: 'DM Mono', monospace; font-size: 12px; }
    .col-m2       { color: var(--text-secondary); font-family: 'DM Mono', monospace; font-size: 11px; }
    .col-fecha    { color: var(--text-muted); font-size: 11px; }

    .col-tipo { white-space: nowrap; }
    .tipo-badge {
      font-size: 11.5px;
      color: var(--text-primary);
      font-weight: 500;
    }
    .hab-info {
      font-size: 10px;
      color: var(--text-muted);
      margin-left: 4px;
    }

    .col-portal { white-space: nowrap; }
    .portal-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10.5px;
      font-weight: 500;
      text-decoration: none;
      transition: opacity .2s;
    }
    .portal-badge:hover { opacity: 0.8; }
    .portal-badge.idealista {
      background: rgba(110, 196, 69, 0.12);
      color: #6ec445;
      border: 1px solid rgba(110, 196, 69, 0.25);
    }
    .portal-badge.fotocasa {
      background: rgba(233, 85, 55, 0.12);
      color: #e95537;
      border: 1px solid rgba(233, 85, 55, 0.25);
    }
    .link-icon { font-size: 9px; }

    .gap-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-family: 'DM Mono', monospace;
      font-weight: 500;
    }
    .gap-high { background: rgba(248,113,113,0.15); color: #f87171; }
    .gap-med  { background: rgba(232,197,71,0.12); color: #e8c547; }
    .gap-low  { background: rgba(79,209,165,0.12); color: #4fd1a5; }

    .table-footer {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--text-muted);
    }
    .btn-link {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
      padding: 0;
    }
    .btn-link:hover { text-decoration: underline; }

    .empty-state {
      text-align: center; padding: 32px 16px; color: var(--text-secondary); font-size: 13px;
    }
    .empty-state .hint { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
  `]
})
export class TransaccionesTableComponent {
  svc = inject(InmobiliarioService);
}
