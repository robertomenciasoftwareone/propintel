import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, CurrencyPipe, NgClass } from '@angular/common';

@Component({
  selector: 'app-roi',
  standalone: true,
  imports: [FormsModule, DecimalPipe, CurrencyPipe, NgClass],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Calculadora ROI Inversión</h1>
          <p>Analiza la rentabilidad de cualquier inmueble como inversor: NOI, cap rate, cash-on-cash y TIR estimada.</p>
        </div>
        <span class="ia-badge">IA</span>
      </header>

      <div class="layout">
        <!-- INPUTS -->
        <div class="inputs-col">

          <div class="card">
            <div class="card-title">Precio y financiación</div>
            <div class="form-grid">
              <div class="field">
                <label>Precio de compra (€)</label>
                <input type="number" [(ngModel)]="precioCom" (ngModelChange)="recalc()" placeholder="250000" />
              </div>
              <div class="field">
                <label>Entrada (%)</label>
                <input type="number" [(ngModel)]="entradaPct" (ngModelChange)="recalc()" min="0" max="100" placeholder="20" />
              </div>
              <div class="field">
                <label>Tipo interés hipoteca (%)</label>
                <input type="number" [(ngModel)]="tipoInteres" (ngModelChange)="recalc()" step="0.1" placeholder="3.5" />
              </div>
              <div class="field">
                <label>Plazo hipoteca (años)</label>
                <input type="number" [(ngModel)]="plazoAnios" (ngModelChange)="recalc()" placeholder="25" />
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Costes de compra</div>
            <div class="form-grid">
              <div class="field">
                <label>ITP / IVA (%)</label>
                <input type="number" [(ngModel)]="itpPct" (ngModelChange)="recalc()" step="0.5" placeholder="8" />
              </div>
              <div class="field">
                <label>Notaría + registro (€)</label>
                <input type="number" [(ngModel)]="gastosNotaria" (ngModelChange)="recalc()" placeholder="3000" />
              </div>
              <div class="field">
                <label>Reforma / adecuación (€)</label>
                <input type="number" [(ngModel)]="reforma" (ngModelChange)="recalc()" placeholder="0" />
              </div>
              <div class="field">
                <label>Amueblado (€)</label>
                <input type="number" [(ngModel)]="amueblado" (ngModelChange)="recalc()" placeholder="0" />
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Ingresos y gastos anuales</div>
            <div class="form-grid">
              <div class="field">
                <label>Renta mensual estimada (€)</label>
                <input type="number" [(ngModel)]="rentaMensual" (ngModelChange)="recalc()" placeholder="1200" />
              </div>
              <div class="field">
                <label>Meses vacíos al año</label>
                <input type="number" [(ngModel)]="mesesVacios" (ngModelChange)="recalc()" min="0" max="12" placeholder="1" />
              </div>
              <div class="field">
                <label>IBI anual (€)</label>
                <input type="number" [(ngModel)]="ibi" (ngModelChange)="recalc()" placeholder="600" />
              </div>
              <div class="field">
                <label>Comunidad anual (€)</label>
                <input type="number" [(ngModel)]="comunidad" (ngModelChange)="recalc()" placeholder="900" />
              </div>
              <div class="field">
                <label>Seguro hogar anual (€)</label>
                <input type="number" [(ngModel)]="seguro" (ngModelChange)="recalc()" placeholder="300" />
              </div>
              <div class="field">
                <label>Mantenimiento anual (€)</label>
                <input type="number" [(ngModel)]="mantenimiento" (ngModelChange)="recalc()" placeholder="500" />
              </div>
              <div class="field">
                <label>Gestión alquiler (%)</label>
                <input type="number" [(ngModel)]="gestionPct" (ngModelChange)="recalc()" step="0.5" placeholder="10" />
              </div>
              <div class="field">
                <label>IRPF sobre rentas (%)</label>
                <input type="number" [(ngModel)]="irpfPct" (ngModelChange)="recalc()" step="1" placeholder="19" />
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Horizonte de inversión</div>
            <div class="form-grid">
              <div class="field">
                <label>Años de tenencia</label>
                <input type="number" [(ngModel)]="aniosTenencia" (ngModelChange)="recalc()" placeholder="10" />
              </div>
              <div class="field">
                <label>Revalorización anual estimada (%)</label>
                <input type="number" [(ngModel)]="revalarizacionPct" (ngModelChange)="recalc()" step="0.5" placeholder="2" />
              </div>
              <div class="field">
                <label>Coste de venta (%)</label>
                <input type="number" [(ngModel)]="costeVentaPct" (ngModelChange)="recalc()" step="0.5" placeholder="3" />
              </div>
            </div>
          </div>

        </div>

        <!-- RESULTADOS -->
        <div class="results-col">

          <!-- Semáforo principal -->
          <div class="verdict-card" [ngClass]="veredictoClass()">
            <div class="verdict-label">{{ veredictoLabel() }}</div>
            <div class="verdict-roi">{{ r().cashOnCash | number:'1.1-1':'es-ES' }}%</div>
            <div class="verdict-sub">Cash-on-Cash Return anual</div>
          </div>

          <!-- KPIs -->
          <div class="kpis-grid">
            <div class="kpi">
              <div class="kpi-label">Inversión total</div>
              <div class="kpi-value">{{ r().inversionTotal | number:'1.0-0':'es-ES' }} €</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Ingresos brutos/año</div>
              <div class="kpi-value green">{{ r().ingresosBrutos | number:'1.0-0':'es-ES' }} €</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">NOI (renta neta operativa)</div>
              <div class="kpi-value" [class.green]="r().noi > 0" [class.red]="r().noi <= 0">{{ r().noi | number:'1.0-0':'es-ES' }} €</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Cap Rate</div>
              <div class="kpi-value" [class.green]="r().capRate >= 5" [class.red]="r().capRate < 3">{{ r().capRate | number:'1.2-2':'es-ES' }}%</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Cuota hipoteca/mes</div>
              <div class="kpi-value">{{ r().cuotaMensual | number:'1.0-0':'es-ES' }} €</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Flujo caja/mes</div>
              <div class="kpi-value" [class.green]="r().flujoCajaMes > 0" [class.red]="r().flujoCajaMes <= 0">{{ r().flujoCajaMes | number:'1.0-0':'es-ES' }} €</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Precio venta estimado</div>
              <div class="kpi-value">{{ r().precioVentaEstimado | number:'1.0-0':'es-ES' }} €</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Ganancia total ({{ aniosTenencia }} años)</div>
              <div class="kpi-value" [class.green]="r().gananciaTotal > 0" [class.red]="r().gananciaTotal <= 0">{{ r().gananciaTotal | number:'1.0-0':'es-ES' }} €</div>
            </div>
            <div class="kpi kpi-big">
              <div class="kpi-label">TIR estimada</div>
              <div class="kpi-value big" [class.green]="r().tir >= 6" [class.amber]="r().tir >= 3 && r().tir < 6" [class.red]="r().tir < 3">{{ r().tir | number:'1.1-1':'es-ES' }}%</div>
            </div>
            <div class="kpi kpi-big">
              <div class="kpi-label">PER (años recuperación)</div>
              <div class="kpi-value big" [class.green]="r().per <= 15" [class.amber]="r().per <= 20" [class.red]="r().per > 20">
                {{ r().per === Infinity ? '∞' : (r().per | number:'1.1-1':'es-ES') }}
              </div>
            </div>
          </div>

          <!-- Desglose flujo de caja anual -->
          <div class="card">
            <div class="card-title">Desglose anual</div>
            <div class="breakdown-list">
              <div class="breakdown-row">
                <span class="br-label">Ingresos brutos alquiler</span>
                <span class="br-val green">+{{ r().ingresosBrutos | number:'1.0-0':'es-ES' }} €</span>
              </div>
              <div class="breakdown-row">
                <span class="br-label">IBI</span>
                <span class="br-val red">-{{ ibi | number:'1.0-0':'es-ES' }} €</span>
              </div>
              <div class="breakdown-row">
                <span class="br-label">Comunidad</span>
                <span class="br-val red">-{{ comunidad | number:'1.0-0':'es-ES' }} €</span>
              </div>
              <div class="breakdown-row">
                <span class="br-label">Seguro hogar</span>
                <span class="br-val red">-{{ seguro | number:'1.0-0':'es-ES' }} €</span>
              </div>
              <div class="breakdown-row">
                <span class="br-label">Mantenimiento</span>
                <span class="br-val red">-{{ mantenimiento | number:'1.0-0':'es-ES' }} €</span>
              </div>
              <div class="breakdown-row">
                <span class="br-label">Gestión alquiler</span>
                <span class="br-val red">-{{ r().gestionAnual | number:'1.0-0':'es-ES' }} €</span>
              </div>
              <div class="breakdown-row bold">
                <span class="br-label">NOI</span>
                <span class="br-val" [class.green]="r().noi > 0" [class.red]="r().noi <= 0">{{ r().noi > 0 ? '+' : '' }}{{ r().noi | number:'1.0-0':'es-ES' }} €</span>
              </div>
              <div class="breakdown-row">
                <span class="br-label">Cuota hipoteca</span>
                <span class="br-val red">-{{ r().cuotaAnual | number:'1.0-0':'es-ES' }} €</span>
              </div>
              <div class="breakdown-row">
                <span class="br-label">IRPF sobre rentas</span>
                <span class="br-val red">-{{ r().irpfAnual | number:'1.0-0':'es-ES' }} €</span>
              </div>
              <div class="breakdown-row bold total-row">
                <span class="br-label">Flujo de caja neto</span>
                <span class="br-val" [class.green]="r().flujoCajaAnual > 0" [class.red]="r().flujoCajaAnual <= 0">
                  {{ r().flujoCajaAnual > 0 ? '+' : '' }}{{ r().flujoCajaAnual | number:'1.0-0':'es-ES' }} €
                </span>
              </div>
            </div>
          </div>

          <!-- Glosario -->
          <div class="card glosario">
            <div class="card-title">Glosario</div>
            <div class="glosario-grid">
              <div class="glosario-item"><span class="glosario-term">Cap Rate</span> NOI / Precio compra. Rentabilidad independiente de la financiación. &gt;5% = bueno.</div>
              <div class="glosario-item"><span class="glosario-term">Cash-on-Cash</span> Flujo caja / Dinero invertido. Incluye hipoteca. &gt;6% = excelente.</div>
              <div class="glosario-item"><span class="glosario-term">NOI</span> Net Operating Income. Ingresos brutos menos gastos operativos (sin hipoteca ni impuestos).</div>
              <div class="glosario-item"><span class="glosario-term">TIR</span> Tasa Interna de Retorno. Incluye flujos de caja + ganancia de capital al vender.</div>
              <div class="glosario-item"><span class="glosario-term">PER</span> Price-to-Earnings Ratio. Años necesarios para recuperar la inversión solo con rentas.</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 28px 32px; max-width: 1300px; margin: 0 auto; font-family: 'Inter', sans-serif; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
    .page-header h1 { margin: 0; font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.03em; }
    .page-header p { margin: 4px 0 0; font-size: 13px; color: #6B7280; max-width: 560px; }
    .ia-badge {
      padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;
      letter-spacing: .08em; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff; flex-shrink: 0;
    }

    .layout { display: grid; grid-template-columns: 420px 1fr; gap: 20px; align-items: start; }

    .card {
      background: #fff; border: 1px solid #E5E7EB; border-radius: 14px;
      padding: 20px; margin-bottom: 14px;
    }
    .card-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 14px; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: .04em; }
    .field input {
      height: 38px; border: 1px solid #E5E7EB; border-radius: 8px;
      padding: 0 10px; font-size: 14px; color: #111827; outline: none;
      transition: border-color .15s;
    }
    .field input:focus { border-color: #6366F1; }

    /* Verdict */
    .verdict-card {
      border-radius: 16px; padding: 24px; margin-bottom: 14px; text-align: center;
      border: 1.5px solid;
    }
    .verdict-card.green { background: #F0FDF4; border-color: #BBF7D0; }
    .verdict-card.amber { background: #FFFBEB; border-color: #FDE68A; }
    .verdict-card.red   { background: #FEF2F2; border-color: #FECACA; }
    .verdict-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6B7280; margin-bottom: 6px; }
    .verdict-roi { font-size: 52px; font-weight: 900; letter-spacing: -0.06em; line-height: 1; }
    .green .verdict-roi { color: #15803D; }
    .amber .verdict-roi { color: #D97706; }
    .red   .verdict-roi { color: #B91C1C; }
    .verdict-sub { font-size: 13px; color: #6B7280; margin-top: 6px; }

    /* KPIs */
    .kpis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
    .kpi {
      background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px;
      padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;
    }
    .kpi-big { grid-column: span 1; }
    .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #9CA3AF; }
    .kpi-value { font-size: 18px; font-weight: 800; color: #111827; letter-spacing: -0.03em; }
    .kpi-value.big { font-size: 28px; }
    .kpi-value.green { color: #16A34A; }
    .kpi-value.amber { color: #D97706; }
    .kpi-value.red   { color: #DC2626; }

    /* Breakdown */
    .breakdown-list { display: flex; flex-direction: column; gap: 0; }
    .breakdown-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid #F3F4F6; font-size: 13px;
    }
    .breakdown-row:last-child { border-bottom: none; }
    .breakdown-row.bold { font-weight: 700; }
    .breakdown-row.total-row { margin-top: 4px; padding-top: 12px; border-top: 2px solid #E5E7EB; border-bottom: none; font-size: 14px; }
    .br-label { color: #374151; }
    .br-val { font-weight: 600; }
    .br-val.green { color: #16A34A; }
    .br-val.red   { color: #DC2626; }

    /* Glosario */
    .glosario-grid { display: flex; flex-direction: column; gap: 8px; }
    .glosario-item { font-size: 12px; color: #6B7280; line-height: 1.5; }
    .glosario-term { font-weight: 700; color: #374151; margin-right: 4px; }

    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .page { padding: 16px; }
    }
  `]
})
export class RoiComponent {
  // Inputs
  precioCom = 250000;
  entradaPct = 20;
  tipoInteres = 3.5;
  plazoAnios = 25;
  itpPct = 8;
  gastosNotaria = 3000;
  reforma = 0;
  amueblado = 0;
  rentaMensual = 1200;
  mesesVacios = 1;
  ibi = 600;
  comunidad = 900;
  seguro = 300;
  mantenimiento = 500;
  gestionPct = 10;
  irpfPct = 19;
  aniosTenencia = 10;
  revalarizacionPct = 2;
  costeVentaPct = 3;

  readonly Infinity = Infinity;

  r = signal(this.calcular());

  recalc() { this.r.set(this.calcular()); }

  private calcular() {
    const itp = this.precioCom * this.itpPct / 100;
    const prestamo = this.precioCom * (1 - this.entradaPct / 100);
    const entrada = this.precioCom * this.entradaPct / 100;
    const inversionTotal = entrada + itp + this.gastosNotaria + this.reforma + this.amueblado;

    // Cuota hipoteca (fórmula francesa)
    const r = this.tipoInteres / 100 / 12;
    const n = this.plazoAnios * 12;
    const cuotaMensual = prestamo > 0 && r > 0
      ? prestamo * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
      : prestamo / n;
    const cuotaAnual = cuotaMensual * 12;

    // Ingresos
    const mesesOcupados = 12 - this.mesesVacios;
    const ingresosBrutos = this.rentaMensual * mesesOcupados;

    // Gastos operativos
    const gestionAnual = ingresosBrutos * this.gestionPct / 100;
    const gastosOp = this.ibi + this.comunidad + this.seguro + this.mantenimiento + gestionAnual;

    const noi = ingresosBrutos - gastosOp;
    const capRate = this.precioCom > 0 ? (noi / this.precioCom) * 100 : 0;

    // IRPF (simplificado: sobre noi - intereses hipoteca año 1)
    const interesesAnio1 = prestamo * this.tipoInteres / 100;
    const baseIrpf = Math.max(0, noi - interesesAnio1);
    const irpfAnual = baseIrpf * this.irpfPct / 100;

    const flujoCajaAnual = noi - cuotaAnual - irpfAnual;
    const flujoCajaMes = flujoCajaAnual / 12;
    const cashOnCash = inversionTotal > 0 ? (flujoCajaAnual / inversionTotal) * 100 : 0;

    // Venta
    const precioVentaEstimado = this.precioCom * Math.pow(1 + this.revalarizacionPct / 100, this.aniosTenencia);
    const costeVenta = precioVentaEstimado * this.costeVentaPct / 100;
    // Deuda pendiente aproximada (amortización lineal simplificada)
    const deudaPendiente = Math.max(0, prestamo - (prestamo / (this.plazoAnios * 12)) * this.aniosTenencia * 12);
    const gananciaVenta = precioVentaEstimado - costeVenta - deudaPendiente - inversionTotal;
    const totalFlujos = flujoCajaAnual * this.aniosTenencia;
    const gananciaTotal = totalFlujos + gananciaVenta;

    // TIR aproximada (Newton-Raphson simplificado con flujos anuales)
    const flujos = [-inversionTotal, ...Array(this.aniosTenencia - 1).fill(flujoCajaAnual), flujoCajaAnual + precioVentaEstimado - costeVenta - deudaPendiente];
    const tir = this.calcularTIR(flujos);

    const per = flujoCajaAnual > 0 ? inversionTotal / flujoCajaAnual : Infinity;

    return {
      inversionTotal, prestamo, cuotaMensual, cuotaAnual,
      ingresosBrutos, gestionAnual, gastosOp, noi,
      capRate, irpfAnual, flujoCajaAnual, flujoCajaMes,
      cashOnCash, precioVentaEstimado, gananciaTotal, tir, per
    };
  }

  private calcularTIR(flujos: number[]): number {
    let tasa = 0.08;
    for (let i = 0; i < 100; i++) {
      let npv = 0, dnpv = 0;
      flujos.forEach((f, t) => {
        npv += f / Math.pow(1 + tasa, t);
        dnpv -= t * f / Math.pow(1 + tasa, t + 1);
      });
      if (Math.abs(npv) < 0.01) break;
      tasa -= npv / dnpv;
    }
    return isFinite(tasa) ? tasa * 100 : 0;
  }

  veredictoClass(): string {
    const c = this.r().cashOnCash;
    if (c >= 6) return 'green';
    if (c >= 3) return 'amber';
    return 'red';
  }

  veredictoLabel(): string {
    const c = this.r().cashOnCash;
    if (c >= 6) return 'Inversión excelente';
    if (c >= 3) return 'Inversión aceptable';
    if (c >= 0) return 'Rentabilidad baja';
    return 'Flujo de caja negativo';
  }
}
