import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { NgFor, NgIf, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MetricasService } from '../../core/services/metricas.service';

const EURIBOR = 2.52;

interface BankOption {
  nombre: string;
  tipo: string;
  tae: number;
  comision: number;
  vinculacion: string;
  popular?: boolean;
  esBroker?: boolean;
  link: string;
}

const BANKS: BankOption[] = [
  { nombre: 'Hipoo', tipo: 'Broker', tae: 2.85, comision: 0, vinculacion: 'Gestión completa — ellos negocian', esBroker: true, link: 'https://www.hipoo.com' },
  { nombre: 'Openbank', tipo: 'Fijo', tae: 2.99, comision: 0, vinculacion: 'Solo nómina', link: 'https://www.openbank.es/hipotecas' },
  { nombre: 'Sabadell', tipo: 'Mixto 10A', tae: 2.95, comision: 0.5, vinculacion: 'Nómina', link: 'https://www.bancsabadell.com/hipotecas' },
  { nombre: 'ING', tipo: 'Fijo', tae: 3.05, comision: 0, vinculacion: 'Nómina', link: 'https://www.ing.es/hipotecas' },
  { nombre: 'CaixaBank', tipo: 'Fijo', tae: 3.10, comision: 0, vinculacion: 'Nómina + seguro', popular: true, link: 'https://www.caixabank.es/hipotecas' },
  { nombre: 'Bankinter', tipo: 'Variable', tae: EURIBOR + 0.55, comision: 0, vinculacion: 'Nómina + seguro', link: 'https://www.bankinter.com/hipotecas' },
  { nombre: 'BBVA', tipo: 'Variable', tae: EURIBOR + 0.60, comision: 0, vinculacion: 'Nómina + seguro', link: 'https://www.bbva.es/hipotecas' },
  { nombre: 'Santander', tipo: 'Fijo', tae: 3.25, comision: 0, vinculacion: 'Nómina', link: 'https://www.bancosantander.es/hipotecas' },
];

interface BankResult extends BankOption {
  cuota: number;
  totalPagado: number;
  interesesTotales: number;
  pctIntereses: number;
  dti: number;
  mejor: boolean;
}

@Component({
  selector: 'app-hipotecas',
  standalone: true,
  imports: [NgFor, NgIf, CurrencyPipe, DecimalPipe, FormsModule, RouterLink],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Comparador de hipotecas</h1>
          <p class="page-sub">Calcula tu cuota mensual y compara las mejores ofertas · Euribor {{ euribor }}%</p>
        </div>
        <a routerLink="/mapa-resultados" class="btn-ghost">← Volver al mapa</a>
      </div>

      <div class="page-grid">

        <!-- LEFT: Calculator inputs -->
        <aside class="calc-panel">
          <div class="calc-title">Tu hipoteca</div>

          <div class="field">
            <label>Precio del inmueble</label>
            <div class="input-prefix">
              <span class="prefix">€</span>
              <input
                type="number"
                [value]="precioInmueble()"
                (input)="precioInmueble.set(+$any($event.target).value)"
                min="50000" step="5000"
                class="calc-input"
              />
            </div>
          </div>

          <div class="field">
            <label>Financiación — <strong>{{ financiacion() }}%</strong></label>
            <input
              type="range"
              [value]="financiacion()"
              (input)="financiacion.set(+$any($event.target).value)"
              min="50" max="100" step="5"
              class="range-input"
            />
            <div class="range-labels">
              <span>50%</span><span>80% (recomendado)</span><span>100%</span>
            </div>
          </div>

          <div class="field">
            <label>Plazo</label>
            <select
              class="calc-select"
              [value]="plazoAnos()"
              (change)="plazoAnos.set(+$any($event.target).value)">
              <option value="10">10 años</option>
              <option value="15">15 años</option>
              <option value="20" selected>20 años</option>
              <option value="25">25 años</option>
              <option value="30">30 años</option>
            </select>
          </div>

          <div class="field">
            <label>Ingresos mensuales netos</label>
            <div class="input-prefix">
              <span class="prefix">€</span>
              <input
                type="number"
                [value]="ingresosMensuales()"
                (input)="ingresosMensuales.set(+$any($event.target).value)"
                min="0" step="100"
                class="calc-input"
              />
            </div>
          </div>

          <div class="field">
            <label>Tipo de hipoteca</label>
            <div class="tipo-tabs">
              <button
                *ngFor="let t of tipoOpciones"
                class="tipo-tab"
                [class.active]="tipoFiltro() === t"
                (click)="tipoFiltro.set(t)">
                {{ t }}
              </button>
            </div>
          </div>

          <!-- Summary box -->
          <div class="summary-box">
            <div class="sum-row">
              <span class="sum-label">Capital a financiar</span>
              <span class="sum-val">{{ capital() | currency:'EUR':'symbol':'1.0-0' }}</span>
            </div>
            <div class="sum-row">
              <span class="sum-label">Entrada mínima</span>
              <span class="sum-val">{{ precioInmueble() - capital() | currency:'EUR':'symbol':'1.0-0' }}</span>
            </div>
            <div class="sum-divider"></div>
            <div class="sum-row" *ngIf="ofertasOrdenadas().length > 0">
              <span class="sum-label">Cuota mínima estimada</span>
              <span class="sum-val sum-highlight">{{ ofertasOrdenadas()[0].cuota | currency:'EUR':'symbol':'1.0-0' }}/mes</span>
            </div>
          </div>
        </aside>

        <!-- RIGHT: Results -->
        <div class="results-col">

          <div class="results-header">
            <span class="results-count">{{ ofertasOrdenadas().length }} ofertas</span>
            <span class="results-hint">Ordenadas por cuota mensual</span>
          </div>

          <div class="bank-cards">
            <div
              class="bank-card"
              *ngFor="let b of ofertasOrdenadas(); let i = index"
              [class.card-best]="b.mejor"
              [class.card-popular]="b.popular && !b.mejor">

              <!-- Badges -->
              <div class="card-badges">
                <span class="badge badge-best" *ngIf="b.mejor">🏆 MEJOR OFERTA</span>
                <span class="badge badge-popular" *ngIf="b.popular && !b.mejor">⭐ MÁS POPULAR</span>
                <span class="badge badge-broker" *ngIf="b.esBroker">BROKER</span>
              </div>

              <div class="card-main">
                <div class="card-left">
                  <div class="bank-name">{{ b.nombre }}</div>
                  <div class="bank-tipo">{{ b.tipo }} · {{ b.tae | number:'1.2-2' }}% TAE</div>
                  <div class="bank-vinc">{{ b.vinculacion }}</div>
                  <div class="bank-comision" *ngIf="b.comision > 0">
                    Comisión apertura: {{ b.comision }}%
                  </div>
                  <div class="bank-comision" *ngIf="b.comision === 0" style="color:#16A34A">
                    Sin comisión de apertura
                  </div>
                </div>

                <div class="card-right">
                  <div class="cuota-val">{{ b.cuota | currency:'EUR':'symbol':'1.0-0' }}</div>
                  <div class="cuota-label">/mes</div>

                  <!-- DTI badge -->
                  <div class="dti-badge"
                    *ngIf="ingresosMensuales() > 0"
                    [class.dti-green]="b.dti < 30"
                    [class.dti-yellow]="b.dti >= 30 && b.dti < 40"
                    [class.dti-red]="b.dti >= 40">
                    DTI {{ b.dti }}%
                  </div>
                </div>
              </div>

              <!-- Interest bar -->
              <div class="bar-section">
                <div class="bar-track">
                  <div class="bar-interest" [style.width.%]="b.pctIntereses"></div>
                  <div class="bar-capital" [style.width.%]="100 - b.pctIntereses"></div>
                </div>
                <div class="bar-legend">
                  <span class="leg-int">Intereses {{ b.pctIntereses }}%
                    ({{ b.interesesTotales | currency:'EUR':'symbol':'1.0-0' }})</span>
                  <span class="leg-cap">Capital {{ 100 - b.pctIntereses }}%</span>
                </div>
              </div>

              <!-- Total paid -->
              <div class="card-total">
                Total a pagar {{ b.totalPagado | currency:'EUR':'symbol':'1.0-0' }} en {{ plazoAnos() }} años
              </div>

              <!-- CTA -->
              <div class="card-cta">
                <a [href]="b.link" target="_blank" rel="noopener" class="btn-solicitar">
                  Solicitar →
                </a>
              </div>
            </div>
          </div>

          <!-- UrbIA CTA -->
          <div class="urbia-cta">
            <div class="cta-inner">
              <div class="cta-left">
                <div class="cta-title">¿Quieres que UrbIA negocie por ti?</div>
                <div class="cta-sub">Te conseguimos las mejores condiciones sin moverte de casa</div>
              </div>
              <a routerLink="/servicios" class="btn-cta-urbia">Saber más →</a>
            </div>
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
      text-decoration: none;
    }
    .btn-ghost:hover { background: #F9FAFB; }

    /* Page grid */
    .page-grid {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .page-grid { grid-template-columns: 1fr; }
    }

    /* Calculator panel */
    .calc-panel {
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 20px;
      display: flex; flex-direction: column; gap: 18px;
      position: sticky; top: 20px;
    }
    .calc-title {
      font-size: 12px; font-weight: 700; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.08em;
    }

    /* Fields */
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 12px; font-weight: 600; color: #374151; }
    .input-prefix {
      display: flex; align-items: center;
      border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;
    }
    .prefix {
      background: #F9FAFB; padding: 9px 10px;
      font-size: 13px; color: #9CA3AF;
      border-right: 1px solid #E5E7EB;
    }
    .calc-input {
      flex: 1; border: none; padding: 9px 12px;
      font-size: 14px; font-weight: 600; color: #1A1A1A;
      font-family: 'DM Sans', sans-serif; outline: none;
    }
    .calc-select {
      border: 1px solid #E5E7EB; border-radius: 8px;
      padding: 9px 12px; font-size: 14px;
      font-family: 'DM Sans', sans-serif; color: #1A1A1A;
      background: #fff; outline: none;
    }
    .range-input {
      width: 100%; accent-color: #2563EB;
    }
    .range-labels {
      display: flex; justify-content: space-between;
      font-size: 10px; color: #9CA3AF;
    }

    /* Tipo tabs */
    .tipo-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
    .tipo-tab {
      padding: 5px 12px; border-radius: 999px;
      border: 1px solid #E5E7EB; background: #fff;
      font-size: 12px; color: #374151; cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: all .15s;
    }
    .tipo-tab.active {
      background: #2563EB; color: #fff; border-color: #2563EB;
    }

    /* Summary box */
    .summary-box {
      background: #F9FAFB; border: 1px solid #F3F4F6;
      border-radius: 10px; padding: 14px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .sum-row { display: flex; justify-content: space-between; align-items: center; }
    .sum-label { font-size: 12px; color: #6B7280; }
    .sum-val { font-size: 14px; font-weight: 700; color: #1A1A1A; }
    .sum-highlight { color: #2563EB; font-size: 16px; }
    .sum-divider { height: 1px; background: #E5E7EB; margin: 2px 0; }

    /* Results column */
    .results-col { display: flex; flex-direction: column; gap: 12px; }
    .results-header {
      display: flex; justify-content: space-between; align-items: center;
    }
    .results-count { font-size: 13px; font-weight: 700; color: #1A1A1A; }
    .results-hint { font-size: 11px; color: #9CA3AF; }

    .bank-cards { display: flex; flex-direction: column; gap: 10px; }

    /* Bank card */
    .bank-card {
      background: #fff; border: 1px solid #E5E7EB;
      border-radius: 14px; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
      transition: border-color .15s, box-shadow .15s;
    }
    .bank-card:hover { border-color: #D1D5DB; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
    .card-best {
      border-color: #2563EB;
      box-shadow: 0 0 0 2px #BFDBFE;
    }
    .card-popular { border-color: #7C3AED; }

    .card-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .badge {
      font-size: 9px; font-weight: 800; letter-spacing: .06em;
      padding: 3px 8px; border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-best { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
    .badge-popular { background: #F5F3FF; color: #6D28D9; border: 1px solid #DDD6FE; }
    .badge-broker { background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; }

    .card-main {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px;
    }
    .card-left { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .bank-name { font-size: 16px; font-weight: 800; color: #1A1A1A; }
    .bank-tipo { font-size: 12px; color: #6B7280; }
    .bank-vinc { font-size: 11px; color: #9CA3AF; }
    .bank-comision { font-size: 11px; color: #6B7280; }

    .card-right { text-align: right; flex-shrink: 0; }
    .cuota-val { font-size: 28px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.04em; }
    .cuota-label { font-size: 11px; color: #9CA3AF; margin-top: -4px; }

    /* DTI badge */
    .dti-badge {
      display: inline-block; margin-top: 6px;
      font-size: 11px; font-weight: 700;
      padding: 3px 8px; border-radius: 999px;
    }
    .dti-green { background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; }
    .dti-yellow { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
    .dti-red { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }

    /* Interest bar */
    .bar-section { display: flex; flex-direction: column; gap: 4px; }
    .bar-track {
      height: 6px; border-radius: 999px; overflow: hidden;
      background: #F3F4F6;
      display: flex;
    }
    .bar-interest { background: #F59E0B; height: 100%; }
    .bar-capital { background: #2563EB; height: 100%; }
    .bar-legend {
      display: flex; justify-content: space-between;
      font-size: 10px;
    }
    .leg-int { color: #D97706; }
    .leg-cap { color: #2563EB; }

    .card-total {
      font-size: 11px; color: #9CA3AF;
    }

    .card-cta { display: flex; justify-content: flex-end; }
    .btn-solicitar {
      display: inline-flex; align-items: center; gap: 6px;
      background: #F9FAFB; border: 1px solid #E5E7EB;
      border-radius: 8px; padding: 8px 16px;
      font-size: 12px; font-weight: 700; color: #374151;
      text-decoration: none;
      transition: background .15s, border-color .15s;
    }
    .btn-solicitar:hover { background: #F3F4F6; border-color: #D1D5DB; }
    .card-best .btn-solicitar {
      background: #2563EB; color: #fff; border-color: #2563EB;
    }
    .card-best .btn-solicitar:hover { background: #1D4ED8; }

    /* UrbIA CTA */
    .urbia-cta {
      background: linear-gradient(135deg, #EFF6FF, #F5F3FF);
      border: 1px solid #BFDBFE; border-radius: 14px;
      padding: 20px;
    }
    .cta-inner {
      display: flex; justify-content: space-between;
      align-items: center; gap: 16px;
    }
    .cta-title { font-size: 15px; font-weight: 700; color: #1A1A1A; margin-bottom: 4px; }
    .cta-sub { font-size: 12px; color: #6B7280; }
    .btn-cta-urbia {
      display: inline-flex; align-items: center;
      background: #2563EB; color: #fff; text-decoration: none;
      border-radius: 10px; padding: 10px 18px;
      font-size: 13px; font-weight: 700; white-space: nowrap;
    }
  `]
})
export class HipotecasComponent implements OnInit {
  private metricasSvc = inject(MetricasService);

  readonly euribor = EURIBOR;
  readonly tipoOpciones = ['Todos', 'Fijo', 'Variable', 'Mixto'];

  readonly precioInmueble = signal(300_000);
  readonly financiacion = signal(80);
  readonly plazoAnos = signal(20);
  readonly ingresosMensuales = signal(3_000);
  readonly tipoFiltro = signal<string>('Todos');

  readonly capital = computed(() =>
    Math.round(this.precioInmueble() * this.financiacion() / 100)
  );

  readonly ofertasOrdenadas = computed((): BankResult[] => {
    const cap = this.capital();
    const anos = this.plazoAnos();
    const ingresos = this.ingresosMensuales();
    const filtro = this.tipoFiltro();

    const results = BANKS
      .filter(b => filtro === 'Todos' || b.tipo.toLowerCase().includes(filtro.toLowerCase()))
      .map(b => {
        const cuota = this.calcCuota(b.tae, cap, anos);
        const totalPagado = cuota * anos * 12;
        const interesesTotales = totalPagado - cap;
        const pctIntereses = Math.round(interesesTotales / totalPagado * 100);
        const dti = ingresos > 0 ? Math.round(cuota / ingresos * 100) : 0;
        return { ...b, cuota, totalPagado, interesesTotales, pctIntereses, dti, mejor: false } as BankResult;
      })
      .sort((a, b) => a.cuota - b.cuota);

    if (results.length > 0) results[0].mejor = true;
    return results;
  });

  ngOnInit(): void {
    this.metricasSvc.track('page_view', 'hipotecas');
  }

  private calcCuota(tae: number, capital: number, anos: number): number {
    const r = tae / 12 / 100;
    const n = anos * 12;
    if (r === 0 || capital <= 0) return 0;
    return Math.round(capital * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
  }
}
