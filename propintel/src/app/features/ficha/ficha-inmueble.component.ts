import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe, NgClass, UpperCasePipe, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import { AnuncioDetalle, CatastroResult, CatastroFicha, ValorReferencia, EstimacionAvm } from '../../core/models/inmobiliario.model';
import { environment } from '../../../environments/environment';

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
          <div class="fuente-badge" [ngClass]="d.fuente">{{ d.fuente | uppercase }}</div>
        </div>

        <!-- ── PORTAL ──────────────────────────────────────────────────── -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="section-icon">🏠</span> Datos del Portal</div>
            @if (d.url) {
              <a [href]="d.url" target="_blank" rel="noopener noreferrer" class="btn-portal">
                Ver en {{ d.fuente }} ↗
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

        <!-- ── NOTARIAL ────────────────────────────────────────────────── -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="section-icon">📋</span> Datos Notariales</div>
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
                <div class="dato-value">
                  {{ d.notarialMinM2 | number:'1.0-0':'es-ES' }} – {{ d.notarialMaxM2 | number:'1.0-0':'es-ES' }} €/m²
                </div>
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
            <div class="gap-bar-wrap">
              <div class="gap-bar-labels">
                <span class="notarial-label">Notarial: {{ d.notarialMedioM2 | number:'1.0-0':'es-ES' }} €/m²</span>
                <span class="asking-label">Asking: {{ d.precioM2 | number:'1.0-0':'es-ES' }} €/m²</span>
              </div>
              <div class="gap-bar">
                <div class="gap-bar-notarial" [style.width.%]="getNotarialBarWidth(d)"></div>
              </div>
              <div class="gap-bar-pct" [ngClass]="getGapClass(d.gapPct)">
                {{ (d.gapPct ?? 0) > 0 ? '+' : '' }}{{ d.gapPct | number:'1.1-1':'es-ES' }}% sobrevalorado
              </div>
            </div>
          } @else {
            <div class="no-data">No hay datos notariales disponibles para esta zona.</div>
          }
        </div>

        <!-- ── CATASTRO ────────────────────────────────────────────────── -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="section-icon">🏛️</span> Catastro</div>
            @if (catastroFicha()?.urlFicha) {
              <a [href]="catastroFicha()!.urlFicha" target="_blank" rel="noopener noreferrer" class="btn-catastro">
                Ver ficha completa ↗
              </a>
            }
          </div>

          @if (catastroLoading()) {
            <div class="loading-inline"><div class="spinner-sm"></div> Consultando Catastro…</div>
          } @else {

            <!-- Ficha rica si tenemos RC -->
            @if (catastroFicha(); as f) {
              <div class="catastro-rica">
                <div class="grid-datos">
                  @if (f.direccion) {
                    <div class="dato span-2">
                      <div class="dato-label">Dirección catastral</div>
                      <div class="dato-value" style="font-size:14px">{{ f.direccion }}</div>
                    </div>
                  }
                  @if (f.uso) {
                    <div class="dato">
                      <div class="dato-label">Uso</div>
                      <div class="dato-value" style="font-size:14px">{{ f.uso }}</div>
                    </div>
                  }
                  @if (f.tipoInmueble) {
                    <div class="dato">
                      <div class="dato-label">Tipo</div>
                      <div class="dato-value" style="font-size:14px">{{ f.tipoInmueble }}</div>
                    </div>
                  }
                  @if (f.superficieTotal) {
                    <div class="dato">
                      <div class="dato-label">Superficie catastral</div>
                      <div class="dato-value">{{ f.superficieTotal | number:'1.0-0':'es-ES' }} m²</div>
                    </div>
                  }
                  @if (f.annoConstruccion) {
                    <div class="dato">
                      <div class="dato-label">Año construcción</div>
                      <div class="dato-value">{{ f.annoConstruccion }}</div>
                    </div>
                  }
                  @if (f.valorCatastral) {
                    <div class="dato">
                      <div class="dato-label">Valor catastral</div>
                      <div class="dato-value purple">{{ f.valorCatastral }} €</div>
                    </div>
                  }
                  @if (f.numPlantasSobre) {
                    <div class="dato">
                      <div class="dato-label">Plantas s/rasante</div>
                      <div class="dato-value">{{ f.numPlantasSobre }}</div>
                    </div>
                  }
                  @if (f.codigoPostal) {
                    <div class="dato">
                      <div class="dato-label">C. Postal</div>
                      <div class="dato-value">{{ f.codigoPostal }}</div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Fallback: catastro por dirección (sistema anterior) -->
            @else if (catastro(); as c) {
              @if (!c.encontrado || c.inmuebles.length === 0) {
                <div class="no-data">
                  No se encontraron datos catastrales para esta dirección.
                  @if (c.error) { <br><span style="font-size:11px;opacity:.7">{{ c.error }}</span> }
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
                        <div class="dato-label">C. Postal</div>
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

            @if (!catastroFicha() && !catastro()) {
              <div class="no-data">No hay datos catastrales disponibles.</div>
            }
          }
        </div>

        <!-- ── VALOR DE REFERENCIA AEAT ────────────────────────────────── -->
        @if (valorRef()) {
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="section-icon">📜</span> Valor de Referencia AEAT {{ valorRef()!.anno }}</div>
            </div>
            @if (valorRef()!.valorReferencia) {
              <div class="vref-grid">
                <div class="dato">
                  <div class="dato-label">Valor de referencia</div>
                  <div class="dato-value purple">{{ valorRef()!.valorReferencia | number:'1.0-0':'es-ES' }} €</div>
                </div>
                @if (d.precioTotal) {
                  <div class="dato">
                    <div class="dato-label">Precio asking</div>
                    <div class="dato-value accent">{{ d.precioTotal | number:'1.0-0':'es-ES' }} €</div>
                  </div>
                  <div class="dato">
                    <div class="dato-label">Diferencia vs. ref.</div>
                    <div class="dato-value" [ngClass]="difVrefClass(d.precioTotal, valorRef()!.valorReferencia!)">
                      {{ difVref(d.precioTotal, valorRef()!.valorReferencia!) | number:'1.0-0':'es-ES' }} €
                      ({{ difVrefPct(d.precioTotal, valorRef()!.valorReferencia!) | number:'1.1-1':'es-ES' }}%)
                    </div>
                  </div>
                }
              </div>
              <p class="vref-desc">
                Base de cotización para ITP y AJD (AEAT). Por encima = posible sobreprecio fiscal.
              </p>
            } @else {
              <div class="no-data">{{ valorRef()!.mensaje }}</div>
            }
          </div>
        }

        <!-- ── TASACIÓN AVM ─────────────────────────────────────────────── -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="section-icon">🤖</span> Tasación Automática (AVM)</div>
            @if (!avmLoading() && !avm()) {
              <button class="btn-calcular" (click)="calcularAvm(d)">Calcular estimación</button>
            }
          </div>

          @if (avmLoading()) {
            <div class="loading-inline"><div class="spinner-sm"></div> Calculando estimación de valor…</div>
          } @else if (avm(); as est) {
            <div class="avm-result">
              <div class="avm-precio-row">
                <div>
                  <div class="avm-label">Valor estimado de mercado</div>
                  <div class="avm-precio">{{ est.precioEstimado | number:'1.0-0':'es-ES' }} €</div>
                </div>
                <div class="avm-rango">
                  <div class="avm-label">Rango fiable</div>
                  <div class="avm-rango-val">
                    {{ est.rangoMin | number:'1.0-0':'es-ES' }} € — {{ est.rangoMax | number:'1.0-0':'es-ES' }} €
                  </div>
                </div>
                @if (d.precioTotal) {
                  <div>
                    <div class="avm-label">Diferencia vs. precio pedido</div>
                    <div class="avm-dif" [class.positivo]="d.precioTotal > est.precioEstimado" [class.negativo]="d.precioTotal <= est.precioEstimado">
                      {{ difAvm(d.precioTotal, est.precioEstimado) | number:'1.0-0':'es-ES' }} €
                      ({{ difAvmPct(d.precioTotal, est.precioEstimado) | number:'1.1-1':'es-ES' }}%)
                    </div>
                  </div>
                }
              </div>
              <p class="avm-metodo">{{ est.metodologia }}</p>

              @if (est.comparables.length > 0) {
                <div class="comparables">
                  <div class="comparables-title">Comparables usados ({{ est.comparablesUsados }} total)</div>
                  <div class="comparables-list">
                    @for (c of est.comparables; track c.id) {
                      <div class="comp-row">
                        <span class="comp-precio">{{ c.precioM2 | number:'1.0-0':'es-ES' }} €/m²</span>
                        <span class="comp-meta">
                          @if (c.superficieM2) { {{ c.superficieM2 | number:'1.0-0':'es-ES' }} m² · }
                          @if (c.habitaciones) { {{ c.habitaciones }} hab · }
                          {{ c.fuente }}
                          @if (c.distanciaM > 0) { · {{ c.distanciaM | number:'1.0-0':'es-ES' }}m }
                        </span>
                        <a [href]="c.url" target="_blank" class="comp-link">Ver →</a>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          } @else if (!avmLoading()) {
            <div class="avm-empty">
              <p>Estimación AVM basada en comparables reales de mercado y datos notariales de la zona.</p>
              <button class="btn-calcular-lg" (click)="calcularAvm(d)">Calcular ahora</button>
            </div>
          }
        </div>

      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; max-width: 960px; }

    .back-link {
      color: var(--text-secondary); text-decoration: none; font-size: 13px;
      display: inline-block; margin-bottom: 16px;
    }
    .back-link:hover { color: var(--accent); }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px;
    }
    .page-title { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
    .page-sub { color: var(--text-secondary); font-size: 13px; margin-top: 4px; max-width: 600px; }

    .fuente-badge {
      padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase;
    }
    .fuente-badge.fotocasa { background: rgba(232,197,71,.15); color: #e8c547; }
    .fuente-badge.idealista { background: rgba(79,209,165,.15); color: #4fd1a5; }

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

    .btn-portal {
      padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600;
      text-decoration: none; background: var(--accent); color: #000; transition: background .15s;
    }
    .btn-portal:hover { background: #d4b23e; }
    .btn-catastro {
      display: inline-block; padding: 5px 12px; border-radius: 6px; font-size: 12px;
      font-weight: 600; text-decoration: none;
      background: rgba(79,209,165,.12); color: #4fd1a5; transition: background .15s;
    }
    .btn-catastro:hover { background: rgba(79,209,165,.22); }

    .periodo-badge {
      padding: 3px 10px; border-radius: 4px; font-size: 11px;
      background: rgba(79,209,165,.12); color: var(--notarial);
    }

    .grid-datos {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
    }
    .dato.span-2 { grid-column: span 2; }
    .dato-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .dato-value { font-size: 16px; font-weight: 600; }
    .dato-value.accent { color: var(--accent); }
    .dato-value.notarial { color: var(--notarial); }
    .dato-value.purple { color: #a78bfa; }
    .dato-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
    .dato-value.gap-high { color: #f87171; }
    .dato-value.gap-med { color: #e8c547; }
    .dato-value.gap-low { color: #4fd1a5; }

    .gap-bar-wrap { margin-top: 20px; padding: 16px; background: var(--bg3); border-radius: 8px; }
    .gap-bar-labels { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
    .notarial-label { color: var(--notarial); }
    .asking-label { color: var(--accent); }
    .gap-bar { height: 8px; border-radius: 4px; background: var(--accent); position: relative; overflow: hidden; }
    .gap-bar-notarial { position: absolute; left: 0; top: 0; height: 100%; background: var(--notarial); border-radius: 4px 0 0 4px; }
    .gap-bar-pct { text-align: right; font-size: 13px; font-weight: 600; margin-top: 6px; }

    .catastro-rica { }
    .catastro-item { padding: 16px 0; }
    .catastro-item:not(:last-child) { border-bottom: 1px solid var(--border); }

    /* Valor referencia */
    .vref-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 10px; }
    .vref-desc { font-size: 11.5px; color: var(--text-muted); margin: 0; font-style: italic; }

    /* AVM */
    .avm-result { }
    .avm-precio-row {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;
      background: var(--bg3); border-radius: 10px; padding: 16px; margin-bottom: 12px;
    }
    .avm-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .avm-precio { font-size: 24px; font-weight: 700; color: var(--accent); }
    .avm-rango-val { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .avm-dif { font-size: 15px; font-weight: 700; }
    .avm-dif.positivo { color: #f87171; }
    .avm-dif.negativo { color: #4fd1a5; }
    .avm-metodo { font-size: 11.5px; color: var(--text-muted); margin: 0 0 12px; font-style: italic; }

    .comparables { }
    .comparables-title { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
    .comparables-list { display: flex; flex-direction: column; gap: 0; }
    .comp-row {
      display: flex; align-items: center; gap: 12px;
      padding: 7px 0; border-bottom: 1px solid var(--border);
    }
    .comp-row:last-child { border-bottom: none; }
    .comp-precio { font-size: 13px; font-weight: 700; color: var(--text-primary); min-width: 90px; }
    .comp-meta { font-size: 11px; color: var(--text-muted); flex: 1; }
    .comp-link { font-size: 11px; color: var(--accent); text-decoration: none; white-space: nowrap; }

    .avm-empty { text-align: center; padding: 16px; }
    .avm-empty p { color: var(--text-secondary); font-size: 13px; margin: 0 0 12px; }

    .btn-calcular {
      padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600;
      background: rgba(232,197,71,.12); color: var(--accent);
      border: 1px solid rgba(232,197,71,.3); cursor: pointer; transition: background .15s;
    }
    .btn-calcular:hover { background: rgba(232,197,71,.22); }
    .btn-calcular-lg {
      padding: 9px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;
      background: rgba(232,197,71,.12); color: var(--accent);
      border: 1px solid rgba(232,197,71,.3); cursor: pointer; transition: background .15s;
    }
    .btn-calcular-lg:hover { background: rgba(232,197,71,.22); }

    .no-data { color: var(--text-secondary); font-size: 13px; padding: 12px 0; }
    .loading-state, .error-state { text-align: center; padding: 60px 0; color: var(--text-secondary); }
    .loading-inline { display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 13px; padding: 12px 0; }

    .spinner, .spinner-sm {
      border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    .spinner { width: 32px; height: 32px; margin: 0 auto 12px; border-width: 3px; }
    .spinner-sm { width: 16px; height: 16px; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .btn-back {
      display: inline-block; margin-top: 12px; padding: 8px 20px;
      background: var(--accent); color: #000; border-radius: 6px;
      text-decoration: none; font-weight: 600; font-size: 13px;
    }

    @media (max-width: 700px) {
      .page { padding: 16px; }
      .grid-datos { grid-template-columns: repeat(2,1fr); }
      .dato.span-2 { grid-column: span 2; }
      .avm-precio-row { grid-template-columns: 1fr; }
      .vref-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class FichaInmuebleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc   = inject(InmobiliarioService);
  private http  = inject(HttpClient);
  private readonly headers = { headers: { 'X-Api-Key': environment.apiKey } };

  detalle        = signal<AnuncioDetalle | null>(null);
  catastro       = signal<CatastroResult | null>(null);
  catastroFicha  = signal<CatastroFicha | null>(null);
  valorRef       = signal<ValorReferencia | null>(null);
  avm            = signal<EstimacionAvm | null>(null);

  loading        = signal(true);
  error          = signal<string | null>(null);
  catastroLoading = signal(true);
  avmLoading     = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.error.set('ID de anuncio no válido.');
      this.loading.set(false);
      this.catastroLoading.set(false);
      return;
    }

    // 1. Cargar detalle del anuncio
    this.svc.getAnuncioDetalle(id).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.loading.set(false);
        // Con los datos del anuncio, lanzar automáticamente el AVM
        this.calcularAvm(d);
      },
      error: () => {
        this.error.set('No se pudo cargar el detalle del anuncio.');
        this.loading.set(false);
        this.catastroLoading.set(false);
      }
    });

    // 2. Catastro por dirección (método existente)
    this.svc.getCatastro(id).subscribe({
      next: (c) => {
        this.catastro.set(c);
        this.catastroLoading.set(false);

        // Si tenemos RC del catastro, cargar ficha rica y valor referencia
        const rc = c.inmuebles?.[0]?.referenciaCatastral;
        if (rc) {
          this.cargarFichaYValorRef(rc);
        }
      },
      error: () => {
        this.catastroLoading.set(false);
      }
    });
  }

  private cargarFichaYValorRef(rc: string): void {
    const base = environment.apiUrl;

    forkJoin({
      ficha: this.http.get<CatastroFicha>(
        `${base}/catastro/ficha?rc=${encodeURIComponent(rc)}`,
        this.headers
      ).pipe(catchError(() => of(null))),
      vref: this.http.get<ValorReferencia>(
        `${base}/catastro/valor-referencia?rc=${encodeURIComponent(rc)}`,
        this.headers
      ).pipe(catchError(() => of(null))),
    }).subscribe(({ ficha, vref }) => {
      if (ficha) this.catastroFicha.set(ficha);
      if (vref)  this.valorRef.set(vref);
    });
  }

  calcularAvm(d: AnuncioDetalle): void {
    if (this.avmLoading()) return;
    this.avmLoading.set(true);

    const body = {
      rc:           null,
      lat:          null,
      lon:          null,
      superficie:   d.superficieM2,
      habitaciones: d.habitaciones,
      ciudad:       d.ciudad,
    };

    this.http.post<EstimacionAvm>(
      `${environment.apiUrl}/tasacion/estimar`,
      body,
      this.headers
    ).pipe(catchError(() => of(null))).subscribe(est => {
      this.avm.set(est);
      this.avmLoading.set(false);
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  getGapClass(gap: number | null): string {
    if (!gap) return '';
    return this.svc.getGapClass(gap);
  }

  getNotarialBarWidth(d: AnuncioDetalle): number {
    if (!d.notarialMedioM2 || !d.precioM2 || d.precioM2 === 0) return 50;
    return Math.min(95, (d.notarialMedioM2 / d.precioM2) * 100);
  }

  difVref(precio: number, vref: number): number {
    return precio - vref;
  }
  difVrefPct(precio: number, vref: number): number {
    return vref > 0 ? ((precio - vref) / vref) * 100 : 0;
  }
  difVrefClass(precio: number, vref: number): string {
    return precio > vref ? 'gap-high' : 'gap-low';
  }

  difAvm(precio: number, estimado: number): number {
    return precio - estimado;
  }
  difAvmPct(precio: number, estimado: number): number {
    return estimado > 0 ? ((precio - estimado) / estimado) * 100 : 0;
  }
}
