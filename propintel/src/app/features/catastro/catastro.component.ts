import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface CatastroFicha {
  rc: string;
  direccion: string | null;
  codigoPostal: string | null;
  municipio: string | null;
  provincia: string | null;
  uso: string | null;
  tipoInmueble: string | null;
  superficieTotal: number | null;
  superficieConstruida: number | null;
  annoConstruccion: number | null;
  valorCatastral: string | null;
  numPlantasSobre: number | null;
  numPlantasBajo: number | null;
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
  selector: 'app-catastro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">

      <div class="page-header">
        <div class="header-left">
          <h1>Datos del Catastro</h1>
          <p class="subtitle">
            Superficie real, año de construcción, valor catastral y valor de referencia AEAT
            por Referencia Catastral. Fuente: API oficial del Catastro español.
          </p>
        </div>
        <a routerLink="/dashboard" class="btn-ghost">← Dashboard</a>
      </div>

      <div class="content-grid">

        <!-- Formulario -->
        <div class="card form-card">
          <h3>Consultar inmueble</h3>

          <div class="field-group">
            <label>Referencia Catastral (RC) *</label>
            <input
              [(ngModel)]="rc"
              placeholder="Ej: 9872023VH5797S0001WX"
              style="font-family: 'DM Mono', monospace; letter-spacing: .04em"
              (keydown.enter)="consultar()"
              maxlength="20"
            />
            <span class="hint">14–20 caracteres alfanuméricos</span>
          </div>

          <button class="btn-consultar" (click)="consultar()" [disabled]="cargando()">
            @if (cargando()) { Consultando… } @else { Consultar en Catastro }
          </button>

          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }

          <div class="help-box">
            <span class="help-icon">💡</span>
            <div>
              <strong>¿Dónde encuentro la RC?</strong>
              <p>En el recibo del IBI, en la escritura de la vivienda, o buscando la dirección en
                <a href="https://www1.sedecatastro.gob.es/OVCFrames.aspx?TIPO=CONSULTA" target="_blank" rel="noopener">
                  sedecatastro.gob.es
                </a>.
              </p>
            </div>
          </div>
        </div>

        <!-- Resultados -->
        <div class="resultados">

          @if (!ficha() && !cargando()) {
            <div class="empty-state">
              <div class="empty-icon">📐</div>
              <p>Introduce una Referencia Catastral y pulsa "Consultar en Catastro"</p>
              <ul class="tips">
                <li>La RC tiene entre 14 y 20 caracteres (letras y números)</li>
                <li>Los datos provienen directamente de la API oficial del Catastro</li>
                <li>Se recuperan: superficie, año construcción, uso, valor catastral y valor de referencia AEAT</li>
              </ul>
            </div>
          }

          @if (cargando()) {
            <div class="card loading-card">
              <div class="spinner"></div>
              <span>Consultando API del Catastro…</span>
            </div>
          }

          <!-- Ficha Catastro -->
          @if (ficha()) {
            <div class="card ficha-card">
              <div class="ficha-header">
                <div>
                  <h3>Ficha catastral</h3>
                  <code class="rc-code">{{ ficha()!.rc }}</code>
                </div>
                <a [href]="ficha()!.urlFicha" target="_blank" rel="noopener" class="btn-catastro">
                  Ver en Catastro →
                </a>
              </div>

              <div class="datos-grid">
                @if (ficha()!.direccion) {
                  <div class="dato-item full">
                    <span class="dato-label">Dirección</span>
                    <span class="dato-value">{{ ficha()!.direccion }}</span>
                  </div>
                }
                @if (ficha()!.municipio) {
                  <div class="dato-item">
                    <span class="dato-label">Municipio</span>
                    <span class="dato-value">{{ ficha()!.municipio }}</span>
                  </div>
                }
                @if (ficha()!.provincia) {
                  <div class="dato-item">
                    <span class="dato-label">Provincia</span>
                    <span class="dato-value">{{ ficha()!.provincia }}</span>
                  </div>
                }
                @if (ficha()!.codigoPostal) {
                  <div class="dato-item">
                    <span class="dato-label">Código postal</span>
                    <span class="dato-value">{{ ficha()!.codigoPostal }}</span>
                  </div>
                }
                @if (ficha()!.uso) {
                  <div class="dato-item">
                    <span class="dato-label">Uso</span>
                    <span class="dato-value">{{ ficha()!.uso }}</span>
                  </div>
                }
                @if (ficha()!.tipoInmueble) {
                  <div class="dato-item">
                    <span class="dato-label">Tipo de inmueble</span>
                    <span class="dato-value">{{ ficha()!.tipoInmueble }}</span>
                  </div>
                }
                @if (ficha()!.superficieTotal) {
                  <div class="dato-item">
                    <span class="dato-label">Superficie total</span>
                    <span class="dato-value highlight">{{ ficha()!.superficieTotal }} m²</span>
                  </div>
                }
                @if (ficha()!.superficieConstruida && ficha()!.superficieConstruida !== ficha()!.superficieTotal) {
                  <div class="dato-item">
                    <span class="dato-label">Superficie construida</span>
                    <span class="dato-value">{{ ficha()!.superficieConstruida }} m²</span>
                  </div>
                }
                @if (ficha()!.annoConstruccion) {
                  <div class="dato-item">
                    <span class="dato-label">Año de construcción</span>
                    <span class="dato-value highlight">{{ ficha()!.annoConstruccion }}</span>
                  </div>
                }
                @if (ficha()!.planta) {
                  <div class="dato-item">
                    <span class="dato-label">Planta</span>
                    <span class="dato-value">{{ ficha()!.planta }}</span>
                  </div>
                }
                @if (ficha()!.puerta) {
                  <div class="dato-item">
                    <span class="dato-label">Puerta</span>
                    <span class="dato-value">{{ ficha()!.puerta }}</span>
                  </div>
                }
                @if (ficha()!.numPlantasSobre) {
                  <div class="dato-item">
                    <span class="dato-label">Plantas sobre rasante</span>
                    <span class="dato-value">{{ ficha()!.numPlantasSobre }}</span>
                  </div>
                }
                @if (ficha()!.valorCatastral) {
                  <div class="dato-item">
                    <span class="dato-label">Valor catastral</span>
                    <span class="dato-value accent">{{ ficha()!.valorCatastral }} €</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Valor de referencia AEAT -->
          @if (valorRef()) {
            <div class="card vref-card">
              <div class="vref-header">
                <h3>Valor de Referencia AEAT {{ valorRef()!.anno }}</h3>
                <span class="vref-badge">ITP · AJD</span>
              </div>
              @if (valorRef()!.valorReferencia) {
                <div class="vref-valor">{{ fmt(valorRef()!.valorReferencia!) }} €</div>
                <p class="vref-desc">
                  Base de cotización mínima para el Impuesto de Transmisiones Patrimoniales (ITP)
                  y Actos Jurídicos Documentados (AJD). Vigente desde enero de 2022.
                </p>
              } @else {
                <p class="vref-nada">{{ valorRef()!.mensaje ?? 'Valor de referencia no disponible para este inmueble.' }}</p>
                <a href="https://www1.sedecatastro.gob.es/Cartografia/mapa.aspx" target="_blank" rel="noopener" class="vref-link">
                  Consultar en el geoportal del Catastro →
                </a>
              }
            </div>
          }

          <!-- CTA: tasación AVM -->
          @if (ficha()) {
            <div class="card cta-card">
              <div class="cta-content">
                <span class="cta-icon">🏠</span>
                <div>
                  <strong>¿Quieres saber el valor de mercado?</strong>
                  <p>Con la Referencia Catastral puedes obtener una tasación AVM automática basada en comparables reales.</p>
                </div>
              </div>
              <a routerLink="/tasacion" class="btn-avm">
                Ir a Valoración automática →
              </a>
            </div>
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    .page {
      padding: 24px 32px;
      max-width: 1200px;
      margin: 0 auto;
      font-family: 'Inter', sans-serif;
    }

    /* Header */
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px;
    }
    .header-left { display: flex; flex-direction: column; gap: 4px; }
    h1 { font-size: 22px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -.03em; }
    .subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; max-width: 560px; line-height: 1.5; }
    .btn-ghost {
      font-size: 13px; font-weight: 600; color: var(--text-secondary);
      text-decoration: none; padding: 8px 16px; border-radius: 8px;
      border: 1px solid var(--border); transition: background .15s; white-space: nowrap;
    }
    .btn-ghost:hover { background: var(--bg3); }

    /* Layout */
    .content-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }

    .card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }
    .card h3 {
      font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 16px;
    }

    /* Form */
    .form-card { position: sticky; top: 20px; }
    .field-group { margin-bottom: 14px; }
    .field-group label {
      display: block; font-size: 11px; font-weight: 600;
      color: var(--text-secondary); text-transform: uppercase;
      letter-spacing: .5px; margin-bottom: 5px;
    }
    .field-group input {
      width: 100%; box-sizing: border-box;
      background: var(--bg3); border: 1px solid var(--border);
      border-radius: 8px; padding: 9px 12px;
      color: var(--text-primary); font-size: 13px;
      outline: none; transition: border-color .15s;
      font-family: inherit;
    }
    .field-group input:focus { border-color: #6ec1e4; }
    .hint { display: block; font-size: 10.5px; color: var(--text-muted); margin-top: 4px; }

    .btn-consultar {
      width: 100%; padding: 11px;
      background: rgba(110,193,228,.12);
      border: 1px solid rgba(110,193,228,.3);
      border-radius: 9px; color: #6ec1e4;
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: all .15s;
    }
    .btn-consultar:hover:not(:disabled) { background: rgba(110,193,228,.2); border-color: #6ec1e4; }
    .btn-consultar:disabled { opacity: .5; cursor: not-allowed; }

    .error-msg {
      margin-top: 10px; padding: 10px 12px; border-radius: 8px;
      background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2);
      color: #EF4444; font-size: 12px;
    }

    .help-box {
      display: flex; gap: 10px; margin-top: 16px;
      background: var(--bg3); border-radius: 10px; padding: 12px;
    }
    .help-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .help-box strong { font-size: 12px; font-weight: 600; color: var(--text-primary); }
    .help-box p { font-size: 11.5px; color: var(--text-secondary); margin: 4px 0 0; line-height: 1.5; }
    .help-box a { color: #6ec1e4; text-decoration: none; }
    .help-box a:hover { text-decoration: underline; }

    /* Results */
    .resultados { display: flex; flex-direction: column; gap: 16px; }

    .empty-state {
      background: var(--bg2); border: 1px solid var(--border); border-radius: 14px;
      padding: 32px 20px; text-align: center;
    }
    .empty-icon { font-size: 36px; margin-bottom: 10px; }
    .empty-state p { font-size: 13px; color: var(--text-secondary); margin: 0 0 14px; }
    .tips { text-align: left; list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .tips li { font-size: 12px; color: var(--text-muted); padding-left: 16px; position: relative; }
    .tips li::before { content: '·'; position: absolute; left: 4px; color: #6ec1e4; }

    .loading-card {
      display: flex; align-items: center; gap: 12px;
      font-size: 13px; color: var(--text-secondary);
    }
    .spinner {
      width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
      border: 2px solid var(--border); border-top-color: #6ec1e4;
      animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Ficha */
    .ficha-card {}
    .ficha-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 16px;
    }
    .ficha-header h3 { margin-bottom: 4px; }
    .rc-code {
      font-family: 'DM Mono', monospace; font-size: 11px; color: #6ec1e4;
      background: rgba(110,193,228,.1); padding: 2px 8px; border-radius: 5px;
      letter-spacing: .06em;
    }
    .btn-catastro {
      font-size: 12px; font-weight: 600; color: #6ec1e4; text-decoration: none;
      padding: 7px 14px; border-radius: 8px; border: 1px solid rgba(110,193,228,.3);
      white-space: nowrap; transition: all .15s;
    }
    .btn-catastro:hover { background: rgba(110,193,228,.1); }

    .datos-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1px;
      background: var(--border); border-radius: 10px; overflow: hidden;
      border: 1px solid var(--border);
    }
    .dato-item {
      background: var(--bg2); padding: 10px 14px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .dato-item.full { grid-column: 1 / -1; }
    .dato-label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
    .dato-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .dato-value.highlight { color: #6ec1e4; font-weight: 700; }
    .dato-value.accent { color: #4fd1a5; font-weight: 700; }

    /* Valor referencia */
    .vref-card {}
    .vref-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .vref-header h3 { margin-bottom: 0; }
    .vref-badge {
      font-size: 10px; font-weight: 700; color: #e8c547;
      background: rgba(232,197,71,.12); padding: 2px 8px; border-radius: 5px;
      letter-spacing: .06em;
    }
    .vref-valor { font-size: 26px; font-weight: 800; color: #4fd1a5; letter-spacing: -.02em; margin-bottom: 8px; }
    .vref-desc { font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.6; }
    .vref-nada { font-size: 12px; color: var(--text-secondary); margin: 0 0 10px; }
    .vref-link { font-size: 12px; color: #6ec1e4; text-decoration: none; font-weight: 600; }
    .vref-link:hover { text-decoration: underline; }

    /* CTA */
    .cta-card {}
    .cta-content { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .cta-icon { font-size: 22px; flex-shrink: 0; }
    .cta-content strong { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .cta-content p { font-size: 12px; color: var(--text-secondary); margin: 4px 0 0; line-height: 1.5; }
    .btn-avm {
      display: inline-block; font-size: 13px; font-weight: 600;
      color: var(--accent); text-decoration: none;
      padding: 9px 18px; border-radius: 9px;
      background: rgba(232,197,71,.1); border: 1px solid rgba(232,197,71,.25);
      transition: all .15s;
    }
    .btn-avm:hover { background: rgba(232,197,71,.2); }
  `]
})
export class CatastroComponent {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  rc       = signal('');
  cargando = signal(false);
  error    = signal<string | null>(null);
  ficha    = signal<CatastroFicha | null>(null);
  valorRef = signal<ValorReferencia | null>(null);

  consultar(): void {
    const rcVal = this.rc().trim().toUpperCase();
    if (!rcVal || rcVal.length < 14) {
      this.error.set('Introduce una Referencia Catastral válida (mínimo 14 caracteres).');
      return;
    }

    this.error.set(null);
    this.ficha.set(null);
    this.valorRef.set(null);
    this.cargando.set(true);

    // Ficha
    this.http.get<CatastroFicha>(`${this.api}/catastro/ficha`, { params: { rc: rcVal } })
      .subscribe({
        next: data => { this.ficha.set(data); },
        error: err  => {
          const msg = err.error?.error ?? 'No se pudo obtener la ficha del Catastro.';
          this.error.set(msg);
          this.cargando.set(false);
        },
        complete: () => {
          // Valor de referencia (en paralelo tras ficha ok)
          this.http.get<ValorReferencia>(`${this.api}/catastro/valor-referencia`, { params: { rc: rcVal } })
            .subscribe({
              next: vr => this.valorRef.set(vr),
              error: _  => {},
              complete: () => this.cargando.set(false),
            });
        }
      });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n);
  }
}
