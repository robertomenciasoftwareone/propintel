import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import { AnuncioDetalle, CatastroResult, CatastroInmueble } from '../../core/models/inmobiliario.model';

@Component({
  selector: 'app-ficha-inmueble',
  standalone: true,
  imports: [DecimalPipe, DatePipe, NgClass, UpperCasePipe, RouterLink],
  template: `
    <div class="page">

      <a routerLink="/" class="back-link">← Volver al dashboard</a>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando ficha del inmueble…</p>
        </div>
      }

      @if (error()) {
        <div class="error-state">
          <p>{{ error() }}</p>
          <a routerLink="/" class="btn-back">Volver</a>
        </div>
      }

      @if (detalle(); as d) {
        <div class="page-header">
          <div>
            <h1 class="page-title">FICHA DEL INMUEBLE</h1>
            <p class="page-sub">{{ d.titulo || d.idExterno }}</p>
          </div>
          <div class="fuente-badge" [ngClass]="d.fuente">
            {{ d.fuente | uppercase }}
          </div>
        </div>

        <!-- ── PORTAL ─────────────────────────────────────── -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="section-icon">🏠</span> Datos del Portal
            </div>
            @if (d.url) {
              <a [href]="d.url" target="_blank" rel="noopener noreferrer" class="btn-portal">
                Ver en {{ d.fuente }}  ↗
              </a>
            }
          </div>

          <div class="grid-datos">
            <div class="dato">
              <div class="dato-label">Precio</div>
              <div class="dato-value accent">{{ d.precioTotal | number:'1.0-0':'es-ES' }} €</div>
            </div>
            <div class="dato">
              <div class="dato-label">€/m²</div>
              <div class="dato-value">{{ d.precioM2 | number:'1.0-0':'es-ES' }} €/m²</div>
            </div>
            <div class="dato">
              <div class="dato-label">Superficie</div>
              <div class="dato-value">{{ d.superficieM2 | number:'1.0-0':'es-ES' }} m²</div>
            </div>
            <div class="dato">
              <div class="dato-label">Habitaciones</div>
              <div class="dato-value">{{ d.habitaciones ?? '—' }}</div>
            </div>
            <div class="dato">
              <div class="dato-label">Tipo</div>
              <div class="dato-value">{{ d.tipoInmueble ?? '—' }}</div>
            </div>
            <div class="dato">
              <div class="dato-label">Ciudad</div>
              <div class="dato-value">{{ d.ciudad }}</div>
            </div>
            <div class="dato">
              <div class="dato-label">Distrito / Zona</div>
              <div class="dato-value">{{ d.distrito ?? '—' }}</div>
            </div>
            <div class="dato">
              <div class="dato-label">Fecha scraping</div>
              <div class="dato-value">{{ d.fechaScraping | date:'d MMM yyyy':'':'es-ES' }}</div>
            </div>
          </div>
        </div>

        <!-- ── NOTARIAL ───────────────────────────────────── -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="section-icon">📋</span> Datos Notariales
            </div>
            @if (d.notarialPeriodo) {
              <span class="periodo-badge">{{ d.notarialPeriodo }}</span>
            }
          </div>

          @if (d.notarialMedioM2) {
            <div class="grid-datos">
              <div class="dato">
                <div class="dato-label">Precio medio notarial</div>
                <div class="dato-value notarial">{{ d.notarialMedioM2 | number:'1.0-0':'es-ES' }} €/m²</div>
              </div>
              <div class="dato">
                <div class="dato-label">Rango notarial</div>
                <div class="dato-value">{{ d.notarialMinM2 | number:'1.0-0':'es-ES' }} – {{ d.notarialMaxM2 | number:'1.0-0':'es-ES' }} €/m²</div>
              </div>
              <div class="dato">
                <div class="dato-label">Gap asking vs notarial</div>
                <div class="dato-value" [ngClass]="getGapClass(d.gapPct)">
                  {{ d.gapPct | number:'1.1-1':'es-ES' }}%
                </div>
              </div>
              <div class="dato">
                <div class="dato-label">Transacciones en zona</div>
                <div class="dato-value">{{ d.numTransacciones ?? '—' }}</div>
              </div>
            </div>

            <!-- Barra visual gap -->
            <div class="gap-bar-wrap">
              <div class="gap-bar-labels">
                <span class="notarial-label">Notarial: {{ d.notarialMedioM2 | number:'1.0-0':'es-ES' }} €/m²</span>
                <span class="asking-label">Asking: {{ d.precioM2 | number:'1.0-0':'es-ES' }} €/m²</span>
              </div>
              <div class="gap-bar">
                <div class="gap-bar-notarial" [style.width.%]="getNotarialBarWidth(d)"></div>
                <div class="gap-bar-asking"></div>
              </div>
              <div class="gap-bar-pct" [ngClass]="getGapClass(d.gapPct)">
                +{{ d.gapPct | number:'1.1-1':'es-ES' }}% sobrevalorado
              </div>
            </div>
          } @else {
            <div class="no-data">No hay datos notariales disponibles para esta zona.</div>
          }
        </div>

        <!-- ── CATASTRO ───────────────────────────────────── -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="section-icon">🏛️</span> Catastro
            </div>
          </div>

          @if (catastroLoading()) {
            <div class="loading-inline">
              <div class="spinner-sm"></div>
              Consultando Catastro…
            </div>
          } @else if (catastroError()) {
            <div class="no-data">{{ catastroError() }}</div>
          } @else if (catastro(); as c) {
            @if (!c.encontrado || c.inmuebles.length === 0) {
              <div class="no-data">
                No se encontraron datos catastrales para esta dirección.
                @if (c.error) { <br>{{ c.error }} }
              </div>
            } @else {
              @for (inm of c.inmuebles; track inm.referenciaCatastral) {
                <div class="catastro-item">
                  <div class="grid-datos">
                    <div class="dato">
                      <div class="dato-label">Ref. Catastral</div>
                      <div class="dato-value mono">{{ inm.referenciaCatastral }}</div>
                    </div>
                    <div class="dato">
                      <div class="dato-label">Uso</div>
                      <div class="dato-value">{{ inm.uso }}</div>
                    </div>
                    <div class="dato">
                      <div class="dato-label">Superficie</div>
                      <div class="dato-value">{{ inm.superficieM2 | number:'1.0-0':'es-ES' }} m²</div>
                    </div>
                    <div class="dato">
                      <div class="dato-label">Año construcción</div>
                      <div class="dato-value">{{ inm.anoConstruccion ?? '—' }}</div>
                    </div>
                    <div class="dato span-2">
                      <div class="dato-label">Dirección</div>
                      <div class="dato-value">{{ inm.direccion ?? '—' }}</div>
                    </div>
                    <div class="dato">
                      <div class="dato-label">Código postal</div>
                      <div class="dato-value">{{ inm.codigoPostal ?? '—' }}</div>
                    </div>
                    <div class="dato">
                      <div class="dato-label">Planta / Puerta</div>
                      <div class="dato-value">{{ inm.planta ?? '—' }} / {{ inm.puerta ?? '—' }}</div>
                    </div>
                  </div>
                  @if (inm.urlCatastro) {
                    <a [href]="inm.urlCatastro" target="_blank" rel="noopener noreferrer" class="btn-catastro">
                      Ver en Catastro ↗
                    </a>
                  }
                </div>
                }
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; max-width: 960px; }

    .back-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      display: inline-block;
      margin-bottom: 16px;
      &:hover { color: var(--accent); }
    }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px;
    }
    .page-title { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
    .page-sub { color: var(--text-secondary); font-size: 13px; margin-top: 4px; max-width: 600px; }

    .fuente-badge {
      padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase;
      &.fotocasa { background: rgba(232, 197, 71, 0.15); color: #e8c547; }
      &.idealista { background: rgba(79, 209, 165, 0.15); color: #4fd1a5; }
    }

    .card {
      background: var(--bg2); border: 1px solid var(--border); border-radius: 12px;
      padding: 20px 24px; margin-bottom: 16px;
    }
    .card-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .card-title { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .section-icon { font-size: 18px; }

    .btn-portal, .btn-catastro {
      padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600;
      text-decoration: none; transition: background .15s;
    }
    .btn-portal {
      background: var(--accent); color: #000;
      &:hover { background: #d4b23e; }
    }
    .btn-catastro {
      display: inline-block; margin-top: 12px;
      background: rgba(79, 209, 165, 0.15); color: #4fd1a5;
      &:hover { background: rgba(79, 209, 165, 0.25); }
    }

    .periodo-badge {
      padding: 3px 10px; border-radius: 4px; font-size: 11px;
      background: rgba(79, 209, 165, 0.12); color: var(--notarial);
    }

    .grid-datos {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
    }
    .dato { }
    .dato.span-2 { grid-column: span 2; }
    .dato-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .dato-value { font-size: 16px; font-weight: 600; }
    .dato-value.accent { color: var(--accent); }
    .dato-value.notarial { color: var(--notarial); }
    .dato-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 14px; }
    .dato-value.gap-high { color: #f87171; }
    .dato-value.gap-med { color: #e8c547; }
    .dato-value.gap-low { color: #4fd1a5; }

    .gap-bar-wrap { margin-top: 20px; padding: 16px; background: var(--bg3); border-radius: 8px; }
    .gap-bar-labels { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
    .notarial-label { color: var(--notarial); }
    .asking-label { color: var(--accent); }
    .gap-bar { height: 8px; border-radius: 4px; background: var(--accent); position: relative; overflow: hidden; }
    .gap-bar-notarial {
      position: absolute; left: 0; top: 0; height: 100%;
      background: var(--notarial); border-radius: 4px 0 0 4px;
    }
    .gap-bar-pct { text-align: right; font-size: 13px; font-weight: 600; margin-top: 6px; }

    .no-data { color: var(--text-secondary); font-size: 13px; padding: 12px 0; }

    .catastro-item {
      padding: 16px 0;
      &:not(:last-child) { border-bottom: 1px solid var(--border); }
    }

    .loading-state, .error-state {
      text-align: center; padding: 60px 0; color: var(--text-secondary);
    }
    .loading-inline { display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 13px; padding: 12px 0; }

    .spinner, .spinner-sm {
      border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    .spinner { width: 32px; height: 32px; margin: 0 auto 12px; }
    .spinner-sm { width: 16px; height: 16px; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .btn-back {
      display: inline-block; margin-top: 12px; padding: 8px 20px;
      background: var(--accent); color: #000; border-radius: 6px;
      text-decoration: none; font-weight: 600; font-size: 13px;
    }

    @media (max-width: 700px) {
      .page { padding: 16px; }
      .grid-datos { grid-template-columns: repeat(2, 1fr); }
      .dato.span-2 { grid-column: span 2; }
    }
  `]
})
export class FichaInmuebleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(InmobiliarioService);

  detalle = signal<AnuncioDetalle | null>(null);
  catastro = signal<CatastroResult | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  catastroLoading = signal(true);
  catastroError = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.error.set('ID de anuncio no válido.');
      this.loading.set(false);
      this.catastroLoading.set(false);
      return;
    }

    this.svc.getAnuncioDetalle(id).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el detalle del anuncio.');
        this.loading.set(false);
        this.catastroLoading.set(false);
      }
    });

    this.svc.getCatastro(id).subscribe({
      next: (c) => {
        this.catastro.set(c);
        this.catastroLoading.set(false);
      },
      error: () => {
        this.catastroError.set('Error al consultar el Catastro.');
        this.catastroLoading.set(false);
      }
    });
  }

  getGapClass(gap: number | null): string {
    if (!gap) return '';
    return this.svc.getGapClass(gap);
  }

  getNotarialBarWidth(d: AnuncioDetalle): number {
    if (!d.notarialMedioM2 || !d.precioM2 || d.precioM2 === 0) return 50;
    return Math.min(95, (d.notarialMedioM2 / d.precioM2) * 100);
  }
}
