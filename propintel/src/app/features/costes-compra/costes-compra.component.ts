import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, CurrencyPipe, DecimalPipe } from '@angular/common';

interface ConceptoGasto {
  nombre: string;
  descripcion: string;
  importe: number;
  pct?: number;
  tipo: 'impuesto' | 'notaria' | 'banco' | 'otros';
  opcional?: boolean;
}

@Component({
  selector: 'app-costes-compra',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, CurrencyPipe, DecimalPipe],
  template: `
<div class="page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">Calculadora de costes de compra</h1>
      <p class="page-sub">Calcula todos los gastos reales al comprar un inmueble en España · ITP, AJD, notaría, gestoría y más</p>
    </div>
    <a routerLink="/hipotecas" class="btn-ghost">← Hipotecas</a>
  </div>

  <div class="main-grid">

    <!-- Configurador -->
    <div class="config-col">
      <div class="config-card">
        <div class="config-title">Datos del inmueble</div>

        <div class="field">
          <label>Precio de compra</label>
          <div class="input-prefix">
            <span class="prefix">€</span>
            <input type="number"
              [value]="precioCompra()"
              (input)="precioCompra.set(+$any($event.target).value)"
              min="50000" step="5000" class="calc-input" />
          </div>
        </div>

        <div class="field">
          <label>Comunidad Autónoma</label>
          <select class="calc-select" [value]="ccaa()" (change)="ccaa.set($any($event.target).value)">
            <option *ngFor="let c of comunidades" [value]="c.id">{{ c.nombre }} (ITP {{ c.itp }}%)</option>
          </select>
        </div>

        <div class="field">
          <label>Tipo de vivienda</label>
          <div class="tipo-tabs">
            <button *ngFor="let t of tiposViv"
              class="tipo-tab" [class.active]="tipoViv() === t.key"
              (click)="tipoViv.set(t.key)">{{ t.label }}</button>
          </div>
        </div>

        <div class="field" *ngIf="tipoViv() === 'nueva'">
          <label>IVA aplicable</label>
          <div class="tipo-tabs">
            <button class="tipo-tab" [class.active]="ivaReducido()" (click)="ivaReducido.set(true)">10% (general)</button>
            <button class="tipo-tab" [class.active]="!ivaReducido()" (click)="ivaReducido.set(false)">4% (VPO)</button>
          </div>
        </div>

        <div class="field">
          <label>¿Solicitas hipoteca?</label>
          <div class="tipo-tabs">
            <button class="tipo-tab" [class.active]="conHipoteca()" (click)="conHipoteca.set(true)">Sí</button>
            <button class="tipo-tab" [class.active]="!conHipoteca()" (click)="conHipoteca.set(false)">No</button>
          </div>
        </div>

        <div class="field" *ngIf="conHipoteca()">
          <label>Importe hipoteca — <strong>{{ pctHipoteca() }}%</strong></label>
          <input type="range"
            [value]="pctHipoteca()"
            (input)="pctHipoteca.set(+$any($event.target).value)"
            min="50" max="100" step="5" class="range-input" />
          <div class="range-labels"><span>50%</span><span>80%</span><span>100%</span></div>
        </div>

        <div class="field">
          <label>¿Gastos de gestoría?</label>
          <div class="tipo-tabs">
            <button class="tipo-tab" [class.active]="conGestoria()" (click)="conGestoria.set(true)">Sí</button>
            <button class="tipo-tab" [class.active]="!conGestoria()" (click)="conGestoria.set(false)">No</button>
          </div>
        </div>
      </div>

      <!-- Resumen rápido -->
      <div class="resumen-card">
        <div class="resumen-title">Resumen de gastos</div>
        <div class="resumen-big">
          <div class="resumen-total">{{ totalGastos() | currency:'EUR':'symbol':'1.0-0' }}</div>
          <div class="resumen-pct">{{ (totalGastos() / precioCompra() * 100) | number:'1.1-1' }}% del precio</div>
        </div>
        <div class="resumen-rows">
          <div class="resumen-row" *ngFor="let g of gastosPorTipo()">
            <div class="resumen-dot" [style.background]="g.color"></div>
            <span>{{ g.tipo }}</span>
            <span class="resumen-val">{{ g.total | currency:'EUR':'symbol':'1.0-0' }}</span>
          </div>
        </div>
        <div class="precio-total-row">
          <span>Precio total (inmueble + gastos)</span>
          <span class="precio-total-val">{{ (precioCompra() + totalGastos()) | currency:'EUR':'symbol':'1.0-0' }}</span>
        </div>
        <div class="ahorro-row" *ngIf="conHipoteca()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          Necesitas <strong>{{ ahorroNecesario() | currency:'EUR':'symbol':'1.0-0' }}</strong> de ahorro propio (entrada + gastos)
        </div>
      </div>
    </div>

    <!-- Detalle de gastos -->
    <div class="detail-col">
      <div class="detail-header">
        <div class="detail-title">Desglose completo de gastos</div>
        <div class="detail-sub">Ordenados por importe · Basado en {{ ccaaNombre() }}</div>
      </div>

      <div class="gasto-cards">
        <div class="gasto-card" *ngFor="let g of gastosDetalle()" [class.gasto-opcional]="g.opcional">
          <div class="gasto-tipo-dot" [class]="'dot-' + g.tipo"></div>
          <div class="gasto-main">
            <div class="gasto-nombre">{{ g.nombre }}</div>
            <div class="gasto-desc">{{ g.descripcion }}</div>
          </div>
          <div class="gasto-importe">
            <div class="gasto-val">{{ g.importe | currency:'EUR':'symbol':'1.0-0' }}</div>
            <div class="gasto-pct" *ngIf="g.pct">{{ g.pct }}%</div>
            <div class="gasto-tag opcional" *ngIf="g.opcional">Opcional</div>
          </div>
        </div>
      </div>

      <!-- Guía fiscal -->
      <div class="fiscal-guide">
        <div class="fiscal-title">Guía fiscal por CCAA</div>
        <div class="fiscal-table">
          <div class="fiscal-row header">
            <span>Comunidad</span>
            <span>ITP segunda mano</span>
            <span>AJD obra nueva</span>
          </div>
          <div class="fiscal-row" *ngFor="let c of comunidades" [class.active-ccaa]="c.id === ccaa()">
            <span>{{ c.nombre }}</span>
            <span class="fiscal-itp">{{ c.itp }}%</span>
            <span class="fiscal-ajd">{{ c.ajd }}%</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
    .page { padding: 32px; font-family: 'Plus Jakarta Sans', sans-serif; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .page-title { font-size: 26px; font-weight: 800; color: #0F172A; letter-spacing: -0.04em; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748B; margin: 0; }
    .btn-ghost { font-size: 13px; color: #64748B; text-decoration: none; padding: 8px 14px; border: 1px solid rgba(0,82,255,.1); border-radius: 10px; transition: all .2s; }
    .btn-ghost:hover { border-color: #0052FF; color: #0052FF; }

    .main-grid { display: grid; grid-template-columns: 360px 1fr; gap: 24px; align-items: start; }

    .config-card, .resumen-card { background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 20px; padding: 24px; }
    .config-card { margin-bottom: 16px; }
    .config-title { font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 20px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
    .field label { font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: .06em; }
    .input-prefix { display: flex; align-items: center; border: 1px solid rgba(0,82,255,.12); border-radius: 10px; overflow: hidden; }
    .prefix { padding: 10px 12px; background: #F8FAFC; color: #64748B; font-size: 13px; border-right: 1px solid rgba(0,82,255,.08); }
    .calc-input { border: none; outline: none; padding: 10px 12px; font-size: 14px; font-family: inherit; width: 100%; color: #0F172A; }
    .calc-select { border: 1px solid rgba(0,82,255,.12); border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 13px; color: #0F172A; outline: none; width: 100%; background: #fff; }
    .tipo-tabs { display: flex; gap: 4px; }
    .tipo-tab { padding: 7px 14px; border-radius: 8px; border: 1px solid rgba(0,82,255,.1); background: #F8FAFC; color: #64748B; font-size: 12px; cursor: pointer; font-weight: 500; transition: all .2s; font-family: inherit; flex: 1; }
    .tipo-tab.active { background: #0052FF; color: #fff; border-color: #0052FF; }
    .range-input { width: 100%; accent-color: #0052FF; }
    .range-labels { display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; }

    /* Resumen */
    .resumen-title { font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .resumen-big { text-align: center; margin-bottom: 20px; }
    .resumen-total { font-size: 36px; font-weight: 800; color: #0052FF; letter-spacing: -0.04em; }
    .resumen-pct { font-size: 13px; color: #64748B; }
    .resumen-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .resumen-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #374151; }
    .resumen-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .resumen-val { margin-left: auto; font-weight: 600; color: #0F172A; }
    .precio-total-row { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid rgba(0,82,255,.08); font-size: 13px; color: #64748B; font-weight: 600; }
    .precio-total-val { color: #0F172A; font-weight: 800; }
    .ahorro-row { margin-top: 12px; background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #92400E; display: flex; gap: 8px; align-items: center; }
    .ahorro-row svg { flex-shrink: 0; color: #F59E0B; }

    /* Detail col */
    .detail-col { display: flex; flex-direction: column; gap: 20px; }
    .detail-header { margin-bottom: 4px; }
    .detail-title { font-size: 16px; font-weight: 700; color: #0F172A; }
    .detail-sub { font-size: 12px; color: #64748B; margin-top: 2px; }
    .gasto-cards { display: flex; flex-direction: column; gap: 10px; }
    .gasto-card { display: flex; gap: 14px; align-items: center; background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 14px; padding: 16px 20px; }
    .gasto-card.gasto-opcional { opacity: .7; border-style: dashed; }
    .gasto-tipo-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .dot-impuesto { background: #E11D48; }
    .dot-notaria { background: #0052FF; }
    .dot-banco { background: #10B981; }
    .dot-otros { background: #F59E0B; }
    .gasto-main { flex: 1; }
    .gasto-nombre { font-size: 14px; font-weight: 600; color: #0F172A; }
    .gasto-desc { font-size: 12px; color: #64748B; margin-top: 2px; }
    .gasto-importe { text-align: right; flex-shrink: 0; }
    .gasto-val { font-size: 18px; font-weight: 700; color: #0F172A; }
    .gasto-pct { font-size: 11px; color: #64748B; }
    .gasto-tag { font-size: 10px; padding: 2px 7px; border-radius: 6px; font-weight: 600; margin-top: 4px; display: inline-block; }
    .gasto-tag.opcional { background: rgba(245,158,11,.1); color: #F59E0B; }

    /* Fiscal guide */
    .fiscal-guide { background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 20px; padding: 24px; }
    .fiscal-title { font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .fiscal-table { display: flex; flex-direction: column; gap: 0; border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,82,255,.08); }
    .fiscal-row { display: grid; grid-template-columns: 2fr 1fr 1fr; padding: 10px 14px; font-size: 12px; border-bottom: 1px solid rgba(0,82,255,.06); }
    .fiscal-row:last-child { border-bottom: none; }
    .fiscal-row.header { background: #F8FAFC; font-weight: 700; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: .06em; }
    .fiscal-row.active-ccaa { background: #EEF4FF; font-weight: 600; }
    .fiscal-itp { color: #E11D48; font-weight: 600; }
    .fiscal-ajd { color: #0052FF; font-weight: 600; }
  `]
})
export class CostesCompraComponent {
  precioCompra = signal(200000);
  ccaa = signal('madrid');
  tipoViv = signal<'segunda' | 'nueva'>('segunda');
  ivaReducido = signal(true);
  conHipoteca = signal(true);
  pctHipoteca = signal(80);
  conGestoria = signal(true);

  tiposViv = [
    { key: 'segunda' as const, label: 'Segunda mano' },
    { key: 'nueva' as const, label: 'Obra nueva' },
  ];

  comunidades = [
    { id: 'madrid', nombre: 'Madrid', itp: 6, ajd: 0.75 },
    { id: 'cataluña', nombre: 'Cataluña', itp: 10, ajd: 1.5 },
    { id: 'andalucia', nombre: 'Andalucía', itp: 7, ajd: 1.2 },
    { id: 'valencia', nombre: 'C. Valenciana', itp: 10, ajd: 1.5 },
    { id: 'pais_vasco', nombre: 'País Vasco', itp: 4, ajd: 0.5 },
    { id: 'galicia', nombre: 'Galicia', itp: 10, ajd: 1.5 },
    { id: 'aragon', nombre: 'Aragón', itp: 8, ajd: 1 },
    { id: 'castilla_la_mancha', nombre: 'Castilla-La Mancha', itp: 9, ajd: 1 },
    { id: 'castilla_leon', nombre: 'Castilla y León', itp: 8, ajd: 1.5 },
    { id: 'canarias', nombre: 'Canarias', itp: 6.5, ajd: 0.75 },
    { id: 'extremadura', nombre: 'Extremadura', itp: 8, ajd: 1.5 },
    { id: 'asturias', nombre: 'Asturias', itp: 8, ajd: 1.2 },
    { id: 'murcia', nombre: 'Murcia', itp: 8, ajd: 1.5 },
    { id: 'baleares', nombre: 'Baleares', itp: 11, ajd: 1.5 },
    { id: 'la_rioja', nombre: 'La Rioja', itp: 7, ajd: 1 },
    { id: 'navarra', nombre: 'Navarra', itp: 6, ajd: 0.5 },
    { id: 'cantabria', nombre: 'Cantabria', itp: 10, ajd: 1.5 },
  ];

  ccaaNombre = computed(() => this.comunidades.find(c => c.id === this.ccaa())?.nombre ?? '');

  private itpActual = computed(() => this.comunidades.find(c => c.id === this.ccaa())?.itp ?? 6);
  private ajdActual = computed(() => this.comunidades.find(c => c.id === this.ccaa())?.ajd ?? 0.75);

  gastosDetalle = computed((): ConceptoGasto[] => {
    const precio = this.precioCompra();
    const gastos: ConceptoGasto[] = [];

    if (this.tipoViv() === 'segunda') {
      const pctITP = this.itpActual();
      gastos.push({
        nombre: `ITP (Impuesto Transmisiones Patrimoniales)`,
        descripcion: `${pctITP}% del precio de compra en ${this.ccaaNombre()}. El mayor gasto fiscal en segunda mano.`,
        importe: precio * pctITP / 100,
        pct: pctITP,
        tipo: 'impuesto',
      });
    } else {
      const ivaRate = this.ivaReducido() ? 10 : 4;
      gastos.push({
        nombre: `IVA obra nueva`,
        descripcion: `${ivaRate}% del precio de compra. General 10%, VPO o especial 4%.`,
        importe: precio * ivaRate / 100,
        pct: ivaRate,
        tipo: 'impuesto',
      });
      const pctAJD = this.ajdActual();
      gastos.push({
        nombre: `AJD (Actos Jurídicos Documentados)`,
        descripcion: `${pctAJD}% sobre el precio de compra para obra nueva en ${this.ccaaNombre()}.`,
        importe: precio * pctAJD / 100,
        pct: pctAJD,
        tipo: 'impuesto',
      });
    }

    const notariaBase = Math.min(Math.max(precio * 0.003, 600), 2500);
    gastos.push({
      nombre: 'Notaría (escritura compraventa)',
      descripcion: 'Arancel notarial regulado. Escalonado según precio del inmueble.',
      importe: Math.round(notariaBase),
      tipo: 'notaria',
    });

    gastos.push({
      nombre: 'Registro de la Propiedad',
      descripcion: 'Inscripción de la escritura en el registro. Aprox. 50% del arancel notarial.',
      importe: Math.round(notariaBase * 0.5),
      tipo: 'notaria',
    });

    if (this.conHipoteca()) {
      const capitalHipoteca = precio * this.pctHipoteca() / 100;
      gastos.push({
        nombre: 'Tasación hipotecaria',
        descripcion: 'Valoración oficial del inmueble exigida por el banco. Empresa homologada BdE.',
        importe: Math.round(300 + precio * 0.001),
        tipo: 'banco',
      });

      const notariaHipoteca = Math.min(Math.max(capitalHipoteca * 0.002, 400), 1800);
      gastos.push({
        nombre: 'Notaría (escritura hipoteca)',
        descripcion: 'La hipoteca requiere escritura notarial adicional. Desde 2019 lo paga el banco.',
        importe: 0,
        tipo: 'banco',
        descripcion2: 'Desde Ley Hipotecaria 2019 lo asume el banco',
      } as any);

      gastos.push({
        nombre: 'Seguro de vida vinculado',
        descripcion: 'Exigido por muchos bancos. Importe estimado para perfil medio 35 años.',
        importe: Math.round(capitalHipoteca * 0.002),
        tipo: 'banco',
        opcional: true,
      });

      gastos.push({
        nombre: 'Seguro de hogar (continente)',
        descripcion: 'Obligatorio si hay hipoteca. Cubre el valor de la construcción.',
        importe: 220,
        tipo: 'banco',
      });
    }

    if (this.conGestoria()) {
      gastos.push({
        nombre: 'Gestoría',
        descripcion: 'Tramitación de impuestos, registro y documentación. Recomendado para simplificar.',
        importe: Math.round(200 + precio * 0.001),
        tipo: 'otros',
        opcional: true,
      });
    }

    gastos.push({
      nombre: 'IBI (Impuesto Bienes Inmuebles)',
      descripcion: 'Parte proporcional del IBI del año en curso. Se pacta entre comprador y vendedor.',
      importe: Math.round(precio * 0.004 / 12 * 6),
      tipo: 'otros',
      opcional: true,
    });

    return gastos.filter(g => g.importe > 0).sort((a, b) => b.importe - a.importe);
  });

  totalGastos = computed(() => this.gastosDetalle().reduce((sum, g) => sum + g.importe, 0));

  ahorroNecesario = computed(() => {
    const entrada = this.precioCompra() * (1 - this.pctHipoteca() / 100);
    return entrada + this.totalGastos();
  });

  gastosPorTipo = computed(() => {
    const tipos: Record<string, { tipo: string; total: number; color: string }> = {
      impuesto: { tipo: 'Impuestos (ITP/IVA/AJD)', total: 0, color: '#E11D48' },
      notaria: { tipo: 'Notaría y Registro', total: 0, color: '#0052FF' },
      banco: { tipo: 'Costes hipoteca', total: 0, color: '#10B981' },
      otros: { tipo: 'Gestoría y otros', total: 0, color: '#F59E0B' },
    };
    for (const g of this.gastosDetalle()) {
      tipos[g.tipo].total += g.importe;
    }
    return Object.values(tipos).filter(t => t.total > 0);
  });
}
