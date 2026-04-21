import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface EstimacionAvm {
  precioEstimado: number;
  rangoMin: number;
  rangoMax: number;
  comparablesUsados: number;
  metodologia: string;
  valorCatastral: number | null;
  precioNotarial: number | null;
  comparables: Comparable[];
}

interface Comparable {
  id: number;
  precioM2: number;
  superficieM2: number | null;
  habitaciones: number | null;
  distrito: string | null;
  fuente: string;
  url: string;
  distanciaM: number;
}

interface CatastroFicha {
  rc: string;
  direccion: string | null;
  codigoPostal: string | null;
  municipio: string | null;
  uso: string | null;
  tipoInmueble: string | null;
  superficieTotal: number | null;
  superficieConstruida: number | null;
  annoConstruccion: number | null;
  valorCatastral: string | null;
  numPlantasSobre: number | null;
  planta: string | null;
  puerta: string | null;
  urlFicha: string;
}

interface ValorReferencia {
  rc: string;
  valorReferencia: number | null;
  anno: number;
  mensaje: string | null;
}

@Component({
  selector: 'app-tasacion',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="tasacion-page">
      <div class="page-header">
        <h1>Valoración automática</h1>
        <p class="subtitle">
          Estimación de valor basada en datos reales del mercado, Catastro e INE.
          No sustituye una tasación oficial homologada.
        </p>
      </div>

      <div class="content-grid">
        <!-- Panel izquierdo: Formulario -->
        <div class="card form-card">
          <h3>Datos del inmueble</h3>

          <div class="field-group">
            <label>Ciudad *</label>
            <input [(ngModel)]="form.ciudad" placeholder="Madrid, Barcelona, Sevilla…" />
          </div>

          <div class="field-group">
            <label>Referencia Catastral (RC)</label>
            <input [(ngModel)]="form.rc" placeholder="Ej: 9872023VH5797S0001WX"
              style="font-family: monospace" (blur)="onRcBlur()" />
            <span class="hint">Si introduces la RC obtendremos datos del Catastro automáticamente</span>
          </div>

          <div class="row-fields">
            <div class="field-group">
              <label>Superficie (m²)</label>
              <input type="number" [(ngModel)]="form.superficie" placeholder="80" min="10" max="2000" />
            </div>
            <div class="field-group">
              <label>Habitaciones</label>
              <input type="number" [(ngModel)]="form.habitaciones" placeholder="3" min="0" max="20" />
            </div>
          </div>

          <div class="row-fields">
            <div class="field-group">
              <label>Latitud (opcional)</label>
              <input type="number" [(ngModel)]="form.lat" placeholder="40.4168" step="0.0001" />
            </div>
            <div class="field-group">
              <label>Longitud (opcional)</label>
              <input type="number" [(ngModel)]="form.lon" placeholder="-3.7038" step="0.0001" />
            </div>
          </div>

          <button class="btn-estimar" (click)="calcular()" [disabled]="calculando()">
            @if (calculando()) { Calculando… } @else { Calcular estimación }
          </button>

          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }
        </div>

        <!-- Panel derecho: Resultados -->
        <div class="resultados">

          <!-- AVM Result -->
          @if (resultado()) {
            <div class="card result-card">
              <div class="result-header">
                <span class="result-label">Valor estimado</span>
                <span class="result-precio">{{ fmt(resultado()!.precioEstimado) }} €</span>
              </div>
              <div class="rango-bar">
                <span class="rango-min">{{ fmt(resultado()!.rangoMin) }} €</span>
                <div class="bar-track">
                  <div class="bar-fill"></div>
                </div>
                <span class="rango-max">{{ fmt(resultado()!.rangoMax) }} €</span>
              </div>
              <p class="metodologia">{{ resultado()!.metodologia }}</p>

              @if (resultado()!.precioNotarial) {
                <div class="stat-row">
                  <span class="stat-label">Precio según datos notariales</span>
                  <span class="stat-value">{{ fmt(resultado()!.precioNotarial!) }} €</span>
                </div>
              }

              <div class="comparables-count">
                Basado en {{ resultado()!.comparablesUsados }} comparables de mercado
              </div>

              <!-- Top 5 comparables -->
              @if (resultado()!.comparables.length > 0) {
                <div class="comparables-list">
                  <h4>Comparables más cercanos</h4>
                  @for (c of resultado()!.comparables; track c.id) {
                    <div class="comparable-item">
                      <div class="comp-precio">{{ Math.round(c.precioM2) }} €/m²</div>
                      <div class="comp-meta">
                        @if (c.superficieM2) { {{ c.superficieM2 }} m² · }
                        @if (c.habitaciones) { {{ c.habitaciones }} hab · }
                        {{ c.fuente }}
                        @if (c.distanciaM > 0) { · {{ c.distanciaM }}m }
                      </div>
                      <a [href]="c.url" target="_blank" class="comp-link">Ver anuncio →</a>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Ficha Catastro -->
          @if (fichaCatastro()) {
            <div class="card catastro-card">
              <h3>Datos del Catastro</h3>
              <div class="catastro-grid">
                @if (fichaCatastro()!.direccion) {
                  <div class="cat-item">
                    <span class="cat-label">Dirección</span>
                    <span class="cat-value">{{ fichaCatastro()!.direccion }}</span>
                  </div>
                }
                @if (fichaCatastro()!.uso) {
                  <div class="cat-item">
                    <span class="cat-label">Uso</span>
                    <span class="cat-value">{{ fichaCatastro()!.uso }}</span>
                  </div>
                }
                @if (fichaCatastro()!.superficieTotal) {
                  <div class="cat-item">
                    <span class="cat-label">Superficie total</span>
                    <span class="cat-value">{{ fichaCatastro()!.superficieTotal }} m²</span>
                  </div>
                }
                @if (fichaCatastro()!.annoConstruccion) {
                  <div class="cat-item">
                    <span class="cat-label">Año construcción</span>
                    <span class="cat-value">{{ fichaCatastro()!.annoConstruccion }}</span>
                  </div>
                }
                @if (fichaCatastro()!.valorCatastral) {
                  <div class="cat-item">
                    <span class="cat-label">Valor catastral</span>
                    <span class="cat-value accent">{{ fichaCatastro()!.valorCatastral }} €</span>
                  </div>
                }
                @if (fichaCatastro()!.numPlantasSobre) {
                  <div class="cat-item">
                    <span class="cat-label">Plantas sobre rasante</span>
                    <span class="cat-value">{{ fichaCatastro()!.numPlantasSobre }}</span>
                  </div>
                }
              </div>
              <a [href]="fichaCatastro()!.urlFicha" target="_blank" class="catastro-link">
                Ver ficha completa en Catastro →
              </a>
            </div>
          }

          <!-- Valor de referencia AEAT -->
          @if (valorRef()) {
            <div class="card vref-card">
              <h3>Valor de Referencia AEAT {{ valorRef()!.anno }}</h3>
              @if (valorRef()!.valorReferencia) {
                <div class="vref-valor">{{ fmtDec(valorRef()!.valorReferencia!) }} €</div>
                <p class="vref-desc">
                  Base de cotización para Impuesto de Transmisiones Patrimoniales
                  y Actos Jurídicos Documentados (vigente desde enero 2022).
                </p>
              } @else {
                <p class="vref-desc">{{ valorRef()!.mensaje }}</p>
              }
            </div>
          }

          <!-- CTA tasación profesional -->
          @if (resultado() || fichaCatastro()) {
            <div class="card cta-card">
              <h3>¿Necesitas una tasación oficial homologada?</h3>
              <p>
                El valor AVM es orientativo. Para obtener un certificado de tasación
                reconocido por entidades financieras, contacta con una tasadora homologada.
              </p>
              <div class="cta-links">
                <a href="https://www.tinsa.es/tasacion-online/" target="_blank" class="cta-btn">Tinsa</a>
                <a href="https://www.gloval.eu" target="_blank" class="cta-btn">Gloval</a>
                <a href="https://www.uve-valoraciones.com" target="_blank" class="cta-btn">UVE Valoraciones</a>
              </div>
            </div>
          }

          <!-- Estado vacío -->
          @if (!resultado() && !fichaCatastro() && !calculando()) {
            <div class="empty-state">
              <div class="empty-icon">🏠</div>
              <p>Introduce los datos del inmueble y pulsa "Calcular estimación"</p>
              <ul class="tips">
                <li>La ciudad es obligatoria</li>
                <li>Con la Referencia Catastral obtenemos datos adicionales del Catastro</li>
                <li>Las coordenadas mejoran la precisión filtrando comparables cercanos</li>
              </ul>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tasacion-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .page-header {
      margin-bottom: 24px;
    }
    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 6px;
    }
    .subtitle {
      color: var(--text-secondary);
      font-size: 13px;
      margin: 0;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .content-grid { grid-template-columns: 1fr; }
    }

    .card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }
    .card h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 16px;
    }

    .form-card { position: sticky; top: 20px; }

    .field-group {
      margin-bottom: 14px;
    }
    .field-group label {
      display: block;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: .5px;
      margin-bottom: 5px;
    }
    .field-group input {
      width: 100%;
      box-sizing: border-box;
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 12px;
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
      transition: border-color .15s;
    }
    .field-group input:focus { border-color: var(--accent); }
    .hint {
      display: block;
      font-size: 10.5px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .row-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .btn-estimar {
      width: 100%;
      padding: 11px;
      background: rgba(232,197,71,.12);
      border: 1px solid rgba(232,197,71,.3);
      border-radius: 9px;
      color: var(--accent);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s, opacity .15s;
      margin-top: 6px;
    }
    .btn-estimar:hover:not(:disabled) { background: rgba(232,197,71,.2); }
    .btn-estimar:disabled { opacity: .5; cursor: not-allowed; }

    .error-msg {
      margin-top: 10px;
      padding: 8px 12px;
      background: rgba(248,113,113,.1);
      border: 1px solid rgba(248,113,113,.2);
      border-radius: 8px;
      color: #f87171;
      font-size: 12px;
    }

    .resultados {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Result card */
    .result-card { }
    .result-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 12px;
    }
    .result-label {
      font-size: 12px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .result-precio {
      font-size: 28px;
      font-weight: 700;
      color: var(--accent);
    }
    .rango-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .rango-min, .rango-max {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .bar-track {
      flex: 1;
      height: 4px;
      background: var(--bg3);
      border-radius: 2px;
      overflow: hidden;
    }
    .bar-fill {
      width: 60%;
      margin-left: 20%;
      height: 100%;
      background: var(--accent);
      border-radius: 2px;
    }
    .metodologia {
      font-size: 11.5px;
      color: var(--text-muted);
      margin: 0 0 10px;
      font-style: italic;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-top: 1px solid var(--border);
    }
    .stat-label { font-size: 12px; color: var(--text-secondary); }
    .stat-value { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .comparables-count {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 8px;
      border-top: 1px solid var(--border);
      padding-top: 8px;
    }
    .comparables-list h4 {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: .5px;
      margin: 10px 0 8px;
    }
    .comparable-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
    }
    .comparable-item:last-child { border-bottom: none; }
    .comp-precio { font-size: 13px; font-weight: 600; color: var(--text-primary); min-width: 80px; }
    .comp-meta { font-size: 11px; color: var(--text-muted); flex: 1; }
    .comp-link { font-size: 11px; color: var(--accent); white-space: nowrap; }

    /* Catastro card */
    .catastro-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .cat-item { display: flex; flex-direction: column; gap: 2px; }
    .cat-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .4px; }
    .cat-value { font-size: 13px; color: var(--text-primary); font-weight: 500; }
    .cat-value.accent { color: var(--accent); }
    .catastro-link {
      font-size: 11.5px;
      color: #a78bfa;
      text-decoration: none;
    }
    .catastro-link:hover { text-decoration: underline; }

    /* Valor referencia */
    .vref-valor {
      font-size: 24px;
      font-weight: 700;
      color: #a78bfa;
      margin-bottom: 8px;
    }
    .vref-desc { font-size: 12px; color: var(--text-muted); margin: 0; }

    /* CTA */
    .cta-card p { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 12px; }
    .cta-links { display: flex; gap: 10px; flex-wrap: wrap; }
    .cta-btn {
      padding: 7px 16px;
      border: 1px solid var(--border-bright);
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 12px;
      text-decoration: none;
      transition: background .15s, color .15s;
    }
    .cta-btn:hover { background: var(--bg3); color: var(--text-primary); }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }
    .empty-icon { font-size: 40px; margin-bottom: 12px; }
    .empty-state p { font-size: 13px; margin-bottom: 12px; }
    .tips {
      text-align: left;
      display: inline-block;
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.8;
    }
  `]
})
export class TasacionComponent {
  private http = inject(HttpClient);
  private readonly headers = { 'X-Api-Key': environment.apiKey };

  readonly calculando    = signal(false);
  readonly error         = signal('');
  readonly resultado     = signal<EstimacionAvm | null>(null);
  readonly fichaCatastro = signal<CatastroFicha | null>(null);
  readonly valorRef      = signal<ValorReferencia | null>(null);

  protected Math = Math;

  form = {
    ciudad:      '',
    rc:          '',
    superficie:  null as number | null,
    habitaciones: null as number | null,
    lat:         null as number | null,
    lon:         null as number | null,
  };

  onRcBlur(): void {
    const rc = this.form.rc.trim();
    if (rc.length >= 14) {
      this.cargarCatastro(rc);
      this.cargarValorRef(rc);
    }
  }

  calcular(): void {
    if (!this.form.ciudad.trim()) {
      this.error.set('La ciudad es obligatoria');
      return;
    }
    this.error.set('');
    this.calculando.set(true);
    this.resultado.set(null);

    const body = {
      rc:           this.form.rc || null,
      lat:          this.form.lat,
      lon:          this.form.lon,
      superficie:   this.form.superficie,
      habitaciones: this.form.habitaciones,
      ciudad:       this.form.ciudad,
    };

    this.http.post<EstimacionAvm>(
      `${environment.apiUrl}/tasacion/estimar`,
      body,
      { headers: this.headers }
    ).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.calculando.set(false);
        // Cargar catastro si hay RC y no se cargó aún
        if (this.form.rc && !this.fichaCatastro()) {
          this.cargarCatastro(this.form.rc);
          this.cargarValorRef(this.form.rc);
        }
      },
      error: (e) => {
        this.error.set(e.error?.error ?? 'Error al calcular la estimación');
        this.calculando.set(false);
      },
    });
  }

  private cargarCatastro(rc: string): void {
    this.http.get<CatastroFicha>(
      `${environment.apiUrl}/catastro/ficha?rc=${encodeURIComponent(rc)}`,
      { headers: this.headers }
    ).subscribe({
      next: (f) => this.fichaCatastro.set(f),
      error: () => { /* silencioso — la RC puede no tener datos */ },
    });
  }

  private cargarValorRef(rc: string): void {
    this.http.get<ValorReferencia>(
      `${environment.apiUrl}/catastro/valor-referencia?rc=${encodeURIComponent(rc)}`,
      { headers: this.headers }
    ).subscribe({
      next: (v) => this.valorRef.set(v),
      error: () => {},
    });
  }

  fmt(n: number): string {
    return Math.round(n).toLocaleString('es-ES');
  }

  fmtDec(n: number): string {
    return n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  }
}
