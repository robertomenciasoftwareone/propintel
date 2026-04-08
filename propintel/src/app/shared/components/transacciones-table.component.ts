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
        <p class="hint">Los datos se actualizan cada noche con el scraper.</p>
      </div>

      <div class="table-footer">
        <span>Anuncios: portales · Notarial: penotariado.com</span>
        <button class="btn-link">Ver todas →</button>
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

    .tx-table { width: 100%; border-collapse: collapse; table-layout: auto; }
    :host { display: block; overflow-x: auto; }

    .tx-table th {
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
    .tx-table td {
      padding: 11px 12px;
      font-size: 12.5px;
      border-bottom: 0.5px solid rgba(0, 52, 255, 0.05);
      vertical-align: middle;
      transition: background 0.15s ease;
    }
    .tx-table tr:last-child td { border-bottom: none; }
    .tx-table tr:hover td { background: #F0F7FF; }
    .tx-table tr.clickable-row { cursor: pointer; }
    .tx-table tr.clickable-row:hover td { background: #F0F7FF; }

    .col-zona     { color: #0F172A; font-weight: 500; }
    .col-asking   { color: #0052FF; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .col-notarial { color: #00B5A3; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .col-m2       { color: #64748B; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
    .col-fecha    { color: #94A3B8; font-size: 11px; }

    .col-tipo { white-space: nowrap; }
    .tipo-badge {
      font-size: 11.5px;
      color: #0F172A;
      font-weight: 500;
    }
    .hab-info {
      font-size: 10px;
      color: #94A3B8;
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
      transition: opacity 0.2s;
    }
    .portal-badge:hover { opacity: 0.75; }
    .portal-badge.idealista {
      background: rgba(110, 196, 69, 0.10);
      color: #6ec445;
      border: 1px solid rgba(110, 196, 69, 0.22);
    }
    .portal-badge.fotocasa {
      background: rgba(233, 85, 55, 0.10);
      color: #e95537;
      border: 1px solid rgba(233, 85, 55, 0.22);
    }
    .link-icon { font-size: 9px; }

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
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94A3B8;
    }
    .btn-link {
      background: none;
      border: none;
      color: #0052FF;
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
      padding: 0;
      font-weight: 600;
    }
    .btn-link:hover { text-decoration: underline; }

    .empty-state {
      text-align: center;
      padding: 40px 16px;
      color: #64748B;
      font-size: 13px;
    }
    .empty-state .hint { font-size: 11px; color: #94A3B8; margin-top: 6px; }
  `]
})
export class TransaccionesTableComponent {
  svc = inject(InmobiliarioService);
}
