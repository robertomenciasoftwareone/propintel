import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface BancoResultado {
  nombre: string;
  logo: string;
  tipo: string;
  tae: number;
  cuotaMensual: number;
  importeMax: number;
  aprobado: boolean;
  enlace: string;
}

const EURIBOR = 2.52;

@Component({
  selector: 'app-precalificacion',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe, DecimalPipe, RouterLink],
  template: `
    <div class="page-wrap">
      <div class="page-header">
        <a routerLink="/dashboard" class="back-link">
          <svg viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Inicio
        </a>
        <h1 class="page-title">Pre-calificación hipotecaria</h1>
        <p class="page-sub">Descubre cuánto te pueden prestar los principales bancos en segundos</p>
      </div>

      <div class="layout">
        <!-- Formulario -->
        <div class="form-card">
          <h2 class="section-title">Tu perfil financiero</h2>

          <div class="field-group">
            <label>Ingresos netos mensuales (€)</label>
            <input type="number" [(ngModel)]="ingresosMensuales" min="0" step="100" class="inp" />
          </div>
          <div class="field-group">
            <label>Otros ingresos mensuales (alquiler, etc.) (€)</label>
            <input type="number" [(ngModel)]="otrosIngresos" min="0" step="100" class="inp" />
          </div>
          <div class="field-group">
            <label>Deudas mensuales actuales (€) <span class="hint">coches, créditos, etc.</span></label>
            <input type="number" [(ngModel)]="deudasMensuales" min="0" step="50" class="inp" />
          </div>
          <div class="field-group">
            <label>Ahorros disponibles (€)</label>
            <input type="number" [(ngModel)]="ahorros" min="0" step="1000" class="inp" />
          </div>
          <div class="field-row">
            <div class="field-group">
              <label>Edad</label>
              <input type="number" [(ngModel)]="edad" min="18" max="75" class="inp" />
            </div>
            <div class="field-group">
              <label>Situación laboral</label>
              <select [(ngModel)]="situacion" class="inp">
                <option value="fijo">Contrato indefinido</option>
                <option value="funcionario">Funcionario</option>
                <option value="autonomo">Autónomo</option>
                <option value="temporal">Temporal</option>
              </select>
            </div>
          </div>
          <div class="field-group">
            <label>Precio del inmueble que buscas (€)</label>
            <input type="number" [(ngModel)]="precioInmueble" min="0" step="5000" class="inp" />
          </div>
          <div class="field-group">
            <label>Plazo deseado (años)</label>
            <div class="slider-wrap">
              <input type="range" [(ngModel)]="plazo" min="5" max="35" step="5" class="slider" />
              <span class="slider-val">{{ plazo }} años</span>
            </div>
          </div>

          <button class="btn-calc" (click)="calcular()">Calcular pre-calificación</button>
        </div>

        <!-- Resultados -->
        <div class="results-col" *ngIf="calculado()">

          <!-- Resumen -->
          <div class="summary-card" [class.verde]="veredicto() === 'bueno'" [class.amarillo]="veredicto() === 'medio'" [class.rojo]="veredicto() === 'bajo'">
            <div class="summary-icon">{{ veredicto() === 'bueno' ? '✅' : veredicto() === 'medio' ? '⚠️' : '❌' }}</div>
            <div class="summary-body">
              <div class="summary-main">Puedes optar a hasta <strong>{{ importeMaximo() | currency:'EUR':'symbol':'1.0-0' }}</strong></div>
              <div class="summary-sub">{{ resumenTexto() }}</div>
            </div>
          </div>

          <!-- Métricas -->
          <div class="metrics-row">
            <div class="metric-box">
              <div class="metric-label">Ratio deuda/ingresos</div>
              <div class="metric-val" [class.red]="ratioDeuda() > 35">{{ ratioDeuda() | number:'1.0-0' }}%</div>
              <div class="metric-hint">Máx. recomendado: 35%</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Ahorros vs entrada</div>
              <div class="metric-val" [class.red]="ahorrosOk() === false">{{ ahorros | currency:'EUR':'symbol':'1.0-0' }}</div>
              <div class="metric-hint">Necesitas ~{{ entradaNecesaria() | currency:'EUR':'symbol':'1.0-0' }}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Cuota máx. recomendada</div>
              <div class="metric-val">{{ cuotaMaxRecomendada() | currency:'EUR':'symbol':'1.0-0' }}/mes</div>
              <div class="metric-hint">35% de tus ingresos</div>
            </div>
          </div>

          <!-- Bancos -->
          <h2 class="section-title" style="margin-top:28px">Oferta personalizada por banco</h2>
          <div class="banco-list">
            <div class="banco-card" *ngFor="let b of bancosResultado()" [class.aprobado]="b.aprobado" [class.rechazado]="!b.aprobado">
              <div class="banco-head">
                <div class="banco-nombre">{{ b.nombre }}</div>
                <div class="banco-tipo">{{ b.tipo }}</div>
                <div class="banco-badge" [class.ok]="b.aprobado">{{ b.aprobado ? 'Aprobado' : 'Dudoso' }}</div>
              </div>
              <div class="banco-body">
                <div class="banco-stat">
                  <span class="stat-label">TAE</span>
                  <span class="stat-val">{{ b.tae | number:'1.2-2' }}%</span>
                </div>
                <div class="banco-stat">
                  <span class="stat-label">Cuota/mes</span>
                  <span class="stat-val">{{ b.cuotaMensual | currency:'EUR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="banco-stat">
                  <span class="stat-label">Importe máx.</span>
                  <span class="stat-val">{{ b.importeMax | currency:'EUR':'symbol':'1.0-0' }}</span>
                </div>
              </div>
              <a [href]="b.enlace" target="_blank" rel="noopener" class="banco-link">Solicitar →</a>
            </div>
          </div>

          <!-- Disclaimer -->
          <div class="disclaimer">
            <strong>Nota:</strong> Esta es una estimación orientativa basada en los criterios de riesgo publicados por cada entidad. La aprobación definitiva depende del estudio individual de cada banco. Consulta siempre con un asesor financiero.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px; font-family: 'Plus Jakarta Sans', sans-serif; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #64748B; font-size: 13px; text-decoration: none; margin-bottom: 12px; }
    .back-link svg { width: 14px; height: 14px; }
    .page-title { font-size: 26px; font-weight: 800; color: #0F172A; margin: 0 0 6px; }
    .page-sub { font-size: 14px; color: #64748B; margin: 0 0 28px; }
    .layout { display: grid; grid-template-columns: 340px 1fr; gap: 24px; align-items: start; }
    @media(max-width:900px){ .layout { grid-template-columns: 1fr; } }

    .form-card { background: #fff; border-radius: 16px; padding: 24px; border: 1px solid rgba(0,52,255,.07); }
    .section-title { font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 18px; }
    .field-group { margin-bottom: 14px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    label { display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 5px; }
    .hint { font-weight: 400; color: #94A3B8; }
    .inp { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 13px; color: #0F172A; outline: none; box-sizing: border-box; }
    .inp:focus { border-color: #0052FF; box-shadow: 0 0 0 3px rgba(0,82,255,.08); }
    .slider-wrap { display: flex; align-items: center; gap: 12px; }
    .slider { flex: 1; accent-color: #0052FF; }
    .slider-val { font-size: 13px; font-weight: 700; color: #0052FF; min-width: 60px; }
    .btn-calc { width: 100%; margin-top: 20px; padding: 13px; background: #0052FF; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: background .2s; }
    .btn-calc:hover { background: #0040CC; }

    .results-col { display: flex; flex-direction: column; gap: 16px; }
    .summary-card { display: flex; gap: 16px; align-items: flex-start; padding: 20px; border-radius: 14px; }
    .summary-card.verde { background: #F0FDF4; border: 1px solid #86EFAC; }
    .summary-card.amarillo { background: #FFFBEB; border: 1px solid #FDE68A; }
    .summary-card.rojo { background: #FFF1F2; border: 1px solid #FECDD3; }
    .summary-icon { font-size: 28px; }
    .summary-main { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
    .summary-sub { font-size: 13px; color: #475569; }

    .metrics-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media(max-width:700px){ .metrics-row { grid-template-columns: 1fr 1fr; } }
    .metric-box { background: #F8FAFC; border-radius: 12px; padding: 14px; }
    .metric-label { font-size: 11px; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
    .metric-val { font-size: 20px; font-weight: 800; color: #0F172A; }
    .metric-val.red { color: #EF4444; }
    .metric-hint { font-size: 11px; color: #94A3B8; margin-top: 3px; }

    .banco-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    @media(max-width:700px){ .banco-list { grid-template-columns: 1fr; } }
    .banco-card { background: #fff; border-radius: 12px; border: 1px solid #E2E8F0; padding: 16px; }
    .banco-card.aprobado { border-color: #86EFAC; }
    .banco-card.rechazado { opacity: .7; }
    .banco-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .banco-nombre { font-size: 14px; font-weight: 700; color: #0F172A; flex: 1; }
    .banco-tipo { font-size: 11px; color: #64748B; background: #F1F5F9; padding: 2px 8px; border-radius: 20px; }
    .banco-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: #FFF1F2; color: #EF4444; }
    .banco-badge.ok { background: #F0FDF4; color: #16A34A; }
    .banco-body { display: flex; gap: 12px; margin-bottom: 12px; }
    .banco-stat { flex: 1; }
    .stat-label { font-size: 10px; color: #94A3B8; font-weight: 600; display: block; }
    .stat-val { font-size: 14px; font-weight: 700; color: #0F172A; }
    .banco-link { display: block; text-align: center; padding: 8px; background: #EEF4FF; color: #0052FF; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; }
    .banco-link:hover { background: #0052FF; color: #fff; }

    .disclaimer { font-size: 11px; color: #94A3B8; background: #F8FAFC; border-radius: 10px; padding: 12px 16px; line-height: 1.6; }
  `]
})
export class PrecalificacionComponent {
  ingresosMensuales = 3500;
  otrosIngresos = 0;
  deudasMensuales = 0;
  ahorros = 60000;
  edad = 35;
  situacion = 'fijo';
  precioInmueble = 300000;
  plazo = 30;

  calculado = signal(false);

  calcular() {
    this.calculado.set(true);
  }

  ingresoTotal = computed(() => this.ingresosMensuales + this.otrosIngresos);
  ratioDeuda = computed(() => {
    const cuota = this._cuotaParaImporte(this._importeBasico(), 2.99, this.plazo);
    return Math.round(((cuota + this.deudasMensuales) / Math.max(this.ingresoTotal(), 1)) * 100);
  });
  cuotaMaxRecomendada = computed(() => Math.round(this.ingresoTotal() * 0.35 - this.deudasMensuales));
  entradaNecesaria = computed(() => Math.round(this.precioInmueble * 0.20 + this.precioInmueble * 0.10)); // 20% + 10% gastos
  ahorrosOk = computed(() => this.ahorros >= this.entradaNecesaria());
  importeMaximo = computed(() => {
    const cuotaMax = this.cuotaMaxRecomendada();
    const n = this.plazo * 12;
    const r = 2.99 / 100 / 12;
    if (r === 0) return cuotaMax * n;
    const importe = cuotaMax * (1 - Math.pow(1 + r, -n)) / r;
    const edadLimit = Math.min(this.plazo, 75 - this.edad);
    const factorEdad = edadLimit < this.plazo ? edadLimit / this.plazo : 1;
    const factorLaboral = this.situacion === 'temporal' ? 0.7 : this.situacion === 'autonomo' ? 0.8 : 1;
    return Math.round(Math.min(importe, this.precioInmueble * 0.8) * factorEdad * factorLaboral);
  });

  veredicto = computed(() => {
    const r = this.ratioDeuda();
    if (!this.calculado()) return '';
    if (r <= 30 && this.ahorrosOk()) return 'bueno';
    if (r <= 40) return 'medio';
    return 'bajo';
  });

  resumenTexto = computed(() => {
    if (this.veredicto() === 'bueno') return 'Tu perfil financiero es sólido. Múltiples bancos te aprobarían sin condiciones especiales.';
    if (this.veredicto() === 'medio') return 'Perfil aceptable, pero cerca del límite. Algunos bancos pedirán avalistas o vinculaciones extras.';
    return 'Ratio deuda/ingresos elevado o ahorros insuficientes. Considera reducir deudas o aumentar la entrada.';
  });

  bancosResultado = computed<BancoResultado[]>(() => {
    const bancos = [
      { nombre: 'Openbank', tipo: 'Fijo', tae: 2.99, enlace: 'https://www.openbank.es/hipotecas' },
      { nombre: 'ING', tipo: 'Fijo', tae: 3.05, enlace: 'https://www.ing.es/hipotecas' },
      { nombre: 'Sabadell', tipo: 'Mixto 10A', tae: 2.95, enlace: 'https://www.bancsabadell.com/hipotecas' },
      { nombre: 'CaixaBank', tipo: 'Fijo', tae: 3.10, enlace: 'https://www.caixabank.es/hipotecas' },
      { nombre: 'Bankinter', tipo: 'Variable', tae: EURIBOR + 0.55, enlace: 'https://www.bankinter.com/hipotecas' },
      { nombre: 'BBVA', tipo: 'Variable', tae: EURIBOR + 0.60, enlace: 'https://www.bbva.es/hipotecas' },
    ];
    return bancos.map(b => {
      const importe = this._importeParaBanco(b.tae);
      const cuota = this._cuotaParaImporte(importe, b.tae, this.plazo);
      const ratio = ((cuota + this.deudasMensuales) / Math.max(this.ingresoTotal(), 1)) * 100;
      const aprobado = ratio <= 40 && this.ahorrosOk() && this.edad + this.plazo <= 75;
      return { ...b, logo: '', importeMax: importe, cuotaMensual: Math.round(cuota), aprobado };
    });
  });

  private _importeBasico(): number {
    return Math.min(this.precioInmueble * 0.8, 800000);
  }

  private _importeParaBanco(tae: number): number {
    const cuotaMax = this.cuotaMaxRecomendada();
    const n = this.plazo * 12;
    const r = tae / 100 / 12;
    if (r === 0) return cuotaMax * n;
    return Math.round(Math.min(
      cuotaMax * (1 - Math.pow(1 + r, -n)) / r,
      this.precioInmueble * 0.8
    ));
  }

  private _cuotaParaImporte(importe: number, tae: number, years: number): number {
    const n = years * 12;
    const r = tae / 100 / 12;
    if (r === 0) return importe / n;
    return importe * r / (1 - Math.pow(1 + r, -n));
  }
}
