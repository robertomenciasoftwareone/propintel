import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgFor, NgIf, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { UrbiaBackendService, AnuncioDetalle } from '../../core/services/urbia-backend.service';
import { AuthService } from '../../core/services/auth.service';
import { MetricasService } from '../../core/services/metricas.service';
import { CompararService } from '../../core/services/comparar.service';

@Component({
  selector: 'app-comparar',
  standalone: true,
  imports: [NgFor, NgIf, CurrencyPipe, DecimalPipe, RouterLink],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Comparador de pisos</h1>
          <p class="page-sub">Añade hasta 4 inmuebles por ID para comparar lado a lado</p>
        </div>
        <a routerLink="/mapa-resultados" class="btn-ghost">← Volver al mapa</a>
      </div>

      <!-- Add bar -->
      <div class="add-bar">
        <input
          #idRef
          type="number"
          class="id-input"
          placeholder="ID del inmueble (ej: 1042)"
          min="1"
          (keyup.enter)="addPiso(idRef.value); idRef.value = ''"
        />
        <button
          class="btn-add"
          [disabled]="loading() || pisos().length >= 4"
          (click)="addPiso(idRef.value); idRef.value = ''">
          <span *ngIf="!loading()">+ Añadir</span>
          <span *ngIf="loading()">Cargando…</span>
        </button>
        <div class="slot-count">{{ pisos().length }}/4 pisos</div>
      </div>

      <!-- Error -->
      <div class="error-bar" *ngIf="error()">
        <span>⚠ {{ error() }}</span>
        <button (click)="error.set(null)">×</button>
      </div>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="pisos().length === 0">
        <div class="empty-icon">⚖️</div>
        <h2>Sin pisos para comparar</h2>
        <p>Introduce el ID de un inmueble desde el mapa de resultados y pulsa Añadir</p>
        <a routerLink="/mapa-resultados" class="btn-primary">Ir al mapa →</a>
      </div>

      <!-- Comparison table -->
      <div class="compare-wrap" *ngIf="pisos().length > 0">
        <div class="compare-grid"
          [style.grid-template-columns]="'160px ' + 'minmax(0,1fr) '.repeat(pisos().length).trim()">

          <!-- Header row -->
          <div class="c-label-head"></div>
          <div class="c-head" *ngFor="let p of pisos()">
            <div class="head-top">
              <div class="piso-badge" [style.background]="semaforoBg(p)" [style.color]="semaforoFg(p)">
                {{ semaforoLabel(p) }}
              </div>
              <button class="remove-btn" (click)="removePiso(p.id)" title="Quitar">×</button>
            </div>
            <div class="piso-id">#{{ p.id }}</div>
            <div class="piso-title">{{ p.titulo || p.tipoInmueble || 'Inmueble' }}</div>
            <div class="piso-loc">{{ p.ciudad }}<span *ngIf="p.distrito">, {{ p.distrito }}</span></div>
            <div class="piso-actions">
              <a [routerLink]="['/ficha', p.id]" class="link-btn">Ver ficha →</a>
              <a [href]="p.url" target="_blank" rel="noopener" class="link-ext">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>

          <!-- Precio total -->
          <div class="c-label">Precio total</div>
          <div class="c-val"
            *ngFor="let p of pisos()"
            [class.c-best]="pisos().length > 1 && p.precioTotal === bestValues()?.precioTotal">
            {{ p.precioTotal | currency:'EUR':'symbol':'1.0-0' }}
          </div>

          <!-- Precio/m² -->
          <div class="c-label">Precio/m²</div>
          <div class="c-val"
            *ngFor="let p of pisos()"
            [class.c-best]="pisos().length > 1 && p.precioM2 != null && p.precioM2 === bestValues()?.precioM2">
            <span *ngIf="p.precioM2">{{ p.precioM2 | number:'1.0-0' }} €/m²</span>
            <span *ngIf="!p.precioM2" class="c-nd">N/D</span>
          </div>

          <!-- Superficie -->
          <div class="c-label">Superficie</div>
          <div class="c-val"
            *ngFor="let p of pisos()"
            [class.c-best]="pisos().length > 1 && p.superficieM2 != null && p.superficieM2 === bestValues()?.superficieM2">
            <span *ngIf="p.superficieM2">{{ p.superficieM2 | number:'1.0-0' }} m²</span>
            <span *ngIf="!p.superficieM2" class="c-nd">N/D</span>
          </div>

          <!-- Habitaciones -->
          <div class="c-label">Habitaciones</div>
          <div class="c-val"
            *ngFor="let p of pisos()"
            [class.c-best]="pisos().length > 1 && p.habitaciones != null && p.habitaciones === bestValues()?.habitaciones">
            <span *ngIf="p.habitaciones">{{ p.habitaciones }}</span>
            <span *ngIf="!p.habitaciones" class="c-nd">N/D</span>
          </div>

          <!-- Gap vs mercado -->
          <div class="c-label">Gap vs mercado</div>
          <div class="c-val"
            *ngFor="let p of pisos()"
            [class.c-best]="pisos().length > 1 && p.notarialMedioM2 != null && calcGap(p) === bestValues()?.gapPct"
            [style.color]="semaforoFg(p)">
            <span *ngIf="p.precioM2 && p.notarialMedioM2">
              {{ calcGap(p) > 0 ? '+' : '' }}{{ calcGap(p) | number:'1.0-1' }}%
            </span>
            <span *ngIf="!p.precioM2 || !p.notarialMedioM2" class="c-nd">N/D</span>
          </div>

          <!-- Notarial zona -->
          <div class="c-label">Precio notarial zona</div>
          <div class="c-val" *ngFor="let p of pisos()">
            <span *ngIf="p.notarialMedioM2">{{ p.notarialMedioM2 | number:'1.0-0' }} €/m²</span>
            <span *ngIf="!p.notarialMedioM2" class="c-nd">N/D</span>
          </div>

          <!-- Tipo -->
          <div class="c-label">Tipo</div>
          <div class="c-val" *ngFor="let p of pisos()">
            <span *ngIf="p.tipoInmueble">{{ p.tipoInmueble }}</span>
            <span *ngIf="!p.tipoInmueble" class="c-nd">N/D</span>
          </div>

          <!-- Fuente -->
          <div class="c-label">Fuente</div>
          <div class="c-val" *ngFor="let p of pisos()">
            <span class="fuente-pill">{{ p.fuente }}</span>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      padding: 28px;
      background: #F7F9FB;
      font-family: 'DM Sans', sans-serif;
    }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 26px; font-weight: 800; color: #1A1A1A;
      letter-spacing: -0.04em; margin: 0 0 4px;
    }
    .page-sub { font-size: 13px; color: #6B7280; margin: 0; }
    .btn-ghost {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px;
      border: 1px solid #E5E7EB; background: #fff;
      font-size: 12px; font-weight: 600; color: #374151;
      text-decoration: none; transition: background .15s;
    }
    .btn-ghost:hover { background: #F9FAFB; }

    /* Add bar */
    .add-bar {
      display: flex; align-items: center; gap: 10px;
      background: #fff; border: 1px solid #E5E7EB;
      border-radius: 12px; padding: 12px 16px;
      margin-bottom: 16px;
    }
    .id-input {
      flex: 1; border: 1px solid #E5E7EB; border-radius: 8px;
      padding: 9px 12px; font-size: 14px; color: #1A1A1A;
      font-family: 'DM Sans', sans-serif;
      outline: none; transition: border-color .2s;
    }
    .id-input:focus { border-color: #2563EB; }
    .btn-add {
      background: #2563EB; color: #fff;
      border: none; border-radius: 8px;
      padding: 9px 18px; font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: 'DM Sans', sans-serif;
      transition: background .2s;
    }
    .btn-add:hover:not([disabled]) { background: #1D4ED8; }
    .btn-add[disabled] { opacity: 0.5; cursor: not-allowed; }
    .slot-count { font-size: 12px; color: #9CA3AF; white-space: nowrap; }

    /* Error */
    .error-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;
      padding: 10px 14px; margin-bottom: 16px;
      font-size: 13px; color: #DC2626;
    }
    .error-bar button {
      background: none; border: none; color: #DC2626;
      font-size: 16px; cursor: pointer; padding: 0 4px;
    }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 80px 20px;
      background: #fff; border: 1px solid #E5E7EB;
      border-radius: 16px;
    }
    .empty-icon { font-size: 48px; margin-bottom: 16px; }
    .empty-state h2 { font-size: 20px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px; }
    .empty-state p { font-size: 14px; color: #6B7280; margin: 0 0 20px; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      background: #2563EB; color: #fff; text-decoration: none;
      border-radius: 10px; padding: 11px 20px;
      font-size: 13px; font-weight: 700;
    }

    /* Comparison grid */
    .compare-wrap {
      background: #fff; border: 1px solid #E5E7EB;
      border-radius: 16px; overflow: hidden;
    }
    .compare-grid {
      display: grid;
      min-width: 0;
    }

    /* Label column */
    .c-label-head, .c-label {
      background: #F9FAFB;
      border-right: 1px solid #F3F4F6;
      padding: 14px 16px;
      font-size: 11px; font-weight: 700; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.07em;
      display: flex; align-items: center;
    }
    .c-label-head {
      border-bottom: 1px solid #F3F4F6;
    }

    /* Header cell */
    .c-head {
      padding: 16px;
      border-left: 1px solid #F3F4F6;
      border-bottom: 1px solid #F3F4F6;
      display: flex; flex-direction: column; gap: 6px;
    }
    .head-top {
      display: flex; justify-content: space-between; align-items: flex-start;
    }
    .piso-badge {
      font-size: 10px; font-weight: 700;
      padding: 3px 8px; border-radius: 999px;
    }
    .remove-btn {
      background: none; border: none; cursor: pointer;
      font-size: 16px; color: #9CA3AF; padding: 0;
      line-height: 1;
    }
    .remove-btn:hover { color: #DC2626; }
    .piso-id { font-size: 10px; color: #9CA3AF; }
    .piso-title {
      font-size: 13px; font-weight: 700; color: #1A1A1A;
      line-height: 1.3;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .piso-loc { font-size: 11px; color: #6B7280; }
    .piso-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
    .link-btn {
      font-size: 11px; font-weight: 600; color: #2563EB;
      text-decoration: none;
    }
    .link-btn:hover { text-decoration: underline; }
    .link-ext {
      color: #9CA3AF; display: flex;
    }
    .link-ext:hover { color: #2563EB; }

    /* Value cells */
    .c-val {
      padding: 14px 16px;
      border-left: 1px solid #F3F4F6;
      border-bottom: 1px solid #F3F4F6;
      font-size: 14px; font-weight: 600; color: #1A1A1A;
      display: flex; align-items: center;
      transition: background .15s;
    }
    .c-val:last-child { border-bottom: none; }
    .c-label:last-child { border-bottom: none; }

    /* Best value highlight */
    .c-best {
      background: #F0FDF4;
    }
    .c-best::before {
      display: none; /* could add a ✓ icon */
    }

    .c-nd { color: #D1D5DB; font-size: 12px; }

    .fuente-pill {
      font-size: 10px; font-weight: 700;
      background: #EFF6FF; color: #1D4ED8;
      padding: 2px 8px; border-radius: 999px;
      border: 1px solid #BFDBFE;
      text-transform: uppercase;
    }
  `]
})
export class CompararComponent implements OnInit {
  private backend = inject(UrbiaBackendService);
  readonly auth = inject(AuthService);
  private metricas = inject(MetricasService);
  private route = inject(ActivatedRoute);
  private compararSvc = inject(CompararService);

  readonly pisos = signal<AnuncioDetalle[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly bestValues = computed(() => {
    const ps = this.pisos();
    if (ps.length < 2) return null;
    const get = <T>(fn: (p: AnuncioDetalle) => T | null | undefined) =>
      ps.map(fn).filter((v): v is T => v != null);

    const minN = (arr: number[]) => arr.length ? Math.min(...arr) : null;
    const maxN = (arr: number[]) => arr.length ? Math.max(...arr) : null;

    return {
      precioTotal: minN(ps.map(p => p.precioTotal)),
      precioM2: minN(get(p => p.precioM2) as number[]),
      superficieM2: maxN(get(p => p.superficieM2) as number[]),
      habitaciones: maxN(get(p => p.habitaciones) as number[]),
      gapPct: minN(get(p => p.precioM2 && p.notarialMedioM2
        ? (p.precioM2 - p.notarialMedioM2!) / p.notarialMedioM2! * 100
        : null) as number[]),
    };
  });

  ngOnInit(): void {
    this.metricas.track('page_view', 'comparar');

    // Si llega con ?add=ID, añadir ese ID al servicio primero (puede venir de la ficha)
    const addId = this.route.snapshot.queryParamMap.get('add');
    if (addId) {
      this.compararSvc.add(Number(addId));
    }

    // Cargar todos los IDs acumulados en el servicio (cesta persistente)
    const ids = this.compararSvc.ids();
    if (ids.length > 0) {
      ids.forEach(id => this.addPiso(String(id)));
    }
  }

  addPiso(idStr: string): void {
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) { this.error.set('Introduce un ID válido'); return; }
    if (this.pisos().length >= 4) { this.error.set('Máximo 4 pisos en la comparación'); return; }
    if (this.pisos().some(p => p.id === id)) { this.error.set(`El piso #${id} ya está en la comparación`); return; }

    this.loading.set(true);
    this.error.set(null);
    this.backend.getAnuncio(id).subscribe({
      next: (p) => {
        this.pisos.update(arr => [...arr, p]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.status === 404 ? `Piso #${id} no encontrado` : 'Error al cargar el piso');
        this.loading.set(false);
      }
    });
  }

  removePiso(id: number): void {
    this.pisos.update(arr => arr.filter(p => p.id !== id));
    this.compararSvc.remove(id);
  }

  calcGap(p: AnuncioDetalle): number {
    if (!p.precioM2 || !p.notarialMedioM2) return 0;
    return (p.precioM2 - p.notarialMedioM2) / p.notarialMedioM2 * 100;
  }

  semaforoColor(p: AnuncioDetalle): 'verde' | 'amarillo' | 'rojo' {
    const g = this.calcGap(p);
    if (!p.precioM2 || !p.notarialMedioM2) return 'amarillo';
    return g >= 5 ? 'rojo' : g <= -5 ? 'verde' : 'amarillo';
  }

  semaforoBg(p: AnuncioDetalle): string {
    const c = this.semaforoColor(p);
    return c === 'verde' ? '#F0FDF4' : c === 'amarillo' ? '#FFFBEB' : '#FEF2F2';
  }

  semaforoFg(p: AnuncioDetalle): string {
    const c = this.semaforoColor(p);
    return c === 'verde' ? '#15803D' : c === 'amarillo' ? '#D97706' : '#DC2626';
  }

  semaforoLabel(p: AnuncioDetalle): string {
    const c = this.semaforoColor(p);
    return c === 'verde' ? 'Oportunidad' : c === 'amarillo' ? 'Precio justo' : 'Caro';
  }
}
