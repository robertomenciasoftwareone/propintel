import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import { AnuncioResumen } from '../../core/models/inmobiliario.model';

@Component({
  selector: 'app-explorador-casas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="explorador-page">
      <header class="page-header">
        <div>
          <h1>Explorador de Casas</h1>
          <p>Selecciona una ciudad y abre la ficha completa de cualquier inmueble.</p>
        </div>
      </header>

      <section class="filters card">
        <label for="ciudad">Ciudad</label>
        <select id="ciudad" [(ngModel)]="ciudad" (change)="buscar(true)">
          <option value="madrid">Madrid</option>
        </select>

        <button class="btn-primary" (click)="buscar(true)" [disabled]="loading()">Buscar viviendas</button>
      </section>

      <section class="stats" *ngIf="!loading()">
        <div class="chip">Página {{ page() }}</div>
        <div class="chip">Resultados: {{ anuncios().length }}</div>
      </section>

      <section *ngIf="loading()" class="state card">Cargando viviendas...</section>
      <section *ngIf="error()" class="state error card">{{ error() }}</section>

      <section class="grid" *ngIf="!loading() && anuncios().length > 0">
        <article class="anuncio-card" *ngFor="let a of anuncios()">
          <div class="anuncio-top">
            <span class="badge" [class.fotocasa]="a.fuente.toLowerCase() === 'fotocasa'">{{ a.fuente | uppercase }}</span>
            <span class="fecha">{{ a.fechaScraping | date:'d MMM yyyy':'':'es-ES' }}</span>
          </div>

          <h3>{{ a.titulo || 'Vivienda sin título' }}</h3>

          <div class="meta-grid">
            <div>
              <span class="label">Precio</span>
              <span class="value">{{ a.precioTotal | number:'1.0-0':'es-ES' }} €</span>
            </div>
            <div>
              <span class="label">€/m²</span>
              <span class="value">{{ a.precioM2 ? (a.precioM2 | number:'1.0-0':'es-ES') + ' €/m²' : 'N/D' }}</span>
            </div>
            <div>
              <span class="label">M²</span>
              <span class="value">{{ a.superficieM2 ? (a.superficieM2 | number:'1.0-0':'es-ES') : 'N/D' }}</span>
            </div>
            <div>
              <span class="label">Hab.</span>
              <span class="value">{{ a.habitaciones ?? 'N/D' }}</span>
            </div>
          </div>

          <div class="footer-row">
            <span class="distrito">{{ a.distrito || 'Sin distrito' }}</span>
            <a class="btn-link" [routerLink]="['/ficha', a.id]">Ver ficha</a>
          </div>
        </article>
      </section>

      <section class="state card" *ngIf="!loading() && !error() && anuncios().length === 0">
        No hay resultados para esta ciudad en la página actual.
      </section>

      <section class="pager">
        <button class="btn-secondary" (click)="prevPage()" [disabled]="loading() || page() <= 1">Anterior</button>
        <button class="btn-secondary" (click)="nextPage()" [disabled]="loading() || anuncios().length < pageSize">Siguiente</button>
      </section>
    </div>
  `,
  styles: [`
    .explorador-page { padding: 28px; display: grid; gap: 16px; }
    .page-header h1 { margin: 0; font-size: 34px; color: var(--text-primary); }
    .page-header p { margin: 6px 0 0; color: var(--text-secondary); }

    .card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: var(--shadow-soft);
    }

    .filters { display: flex; flex-wrap: wrap; gap: 10px; padding: 16px; align-items: end; }
    .filters label { color: var(--text-secondary); font-size: 12px; width: 100%; }
    .filters select {
      min-width: 220px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--text-primary);
      padding: 0 12px;
    }

    .stats { display: flex; gap: 8px; }
    .chip {
      border: 1px solid var(--border);
      background: #fff;
      color: var(--text-secondary);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
    }

    .state { padding: 16px; color: var(--text-secondary); }
    .state.error { border-color: #f3b2b2; color: #b42323; background: #fff5f5; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }

    .anuncio-card {
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      border: 1px solid #d9e5f6;
      border-radius: 14px;
      padding: 14px;
      display: grid;
      gap: 12px;
    }

    .anuncio-top { display: flex; justify-content: space-between; align-items: center; }
    .badge {
      display: inline-flex;
      border-radius: 999px;
      border: 1px solid #cadcf5;
      color: #1f5fa8;
      background: #edf5ff;
      font-size: 11px;
      padding: 4px 10px;
      font-weight: 700;
    }
    .badge.fotocasa {
      color: #0f6d5b;
      background: #e7fff8;
      border-color: #b8efe0;
    }
    .fecha { font-size: 12px; color: var(--text-muted); }

    .anuncio-card h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: 16px;
      line-height: 1.35;
      min-height: 44px;
    }

    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .label { display: block; font-size: 11px; color: var(--text-muted); }
    .value { display: block; font-size: 14px; color: var(--text-primary); font-weight: 600; }

    .footer-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e4edf9; padding-top: 10px; }
    .distrito { color: var(--text-secondary); font-size: 12px; }

    .btn-primary, .btn-secondary, .btn-link {
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 8px 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-primary {
      background: #1f7ae0;
      color: white;
      min-width: 160px;
    }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }

    .btn-secondary {
      background: #fff;
      color: var(--text-secondary);
      border-color: var(--border);
      min-width: 120px;
    }
    .btn-secondary:disabled { opacity: .55; cursor: not-allowed; }

    .btn-link { background: #e9f3ff; color: #1f7ae0; }

    .pager { display: flex; gap: 10px; }

    @media (max-width: 860px) {
      .explorador-page { padding: 16px; }
      .filters { grid-template-columns: 1fr; }
      .filters select { width: 100%; }
    }
  `]
})
export class ExploradorCasasComponent {
  private svc = inject(InmobiliarioService);

  readonly anuncios = signal<AnuncioResumen[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);

  ciudad = 'madrid';
  readonly pageSize = 20;

  constructor() {
    this.buscar(true);
  }

  buscar(resetPage = false): void {
    if (resetPage) {
      this.page.set(1);
    }

    this.loading.set(true);
    this.error.set(null);

    this.svc.getAnunciosPorCiudad(this.ciudad, this.page(), this.pageSize).subscribe({
      next: data => {
        this.anuncios.set(data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los anuncios de la ciudad seleccionada.');
        this.anuncios.set([]);
        this.loading.set(false);
      }
    });
  }

  nextPage(): void {
    this.page.update(v => v + 1);
    this.buscar(false);
  }

  prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update(v => v - 1);
    this.buscar(false);
  }
}
