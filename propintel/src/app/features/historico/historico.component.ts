import { Component, inject, effect, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { NgFor, DecimalPipe } from '@angular/common';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';

declare const ApexCharts: any;

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [NgFor, DecimalPipe],
  template: `
    <div class="page">

      <div class="page-header">
        <div>
          <h1 class="page-title">HISTÓRICO</h1>
          <p class="page-sub">Evolución del mercado · Asking vs Notarial · Últimos 12 meses</p>
        </div>
        <div class="ciudad-actual">
          <span class="ciudad-label">{{ svc.ciudadData().nombre }}</span>
          <span class="periodo-badge">2025 – 2026</span>
        </div>
      </div>

      <!-- Tendencia general -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Tendencia de precios · €/m²</div>
            <div class="card-sub">Comparativa mensual Asking Price (portales) vs Precio Real Notarial</div>
          </div>
          <div class="legend">
            <span class="leg"><span class="dot" style="background:#e8c547"></span>Asking</span>
            <span class="leg"><span class="dot" style="background:#4fd1a5"></span>Notarial</span>
            <span class="leg"><span class="dot" style="background:#f87171;border-radius:2px"></span>Gap</span>
          </div>
        </div>
        <div #trendChart class="chart-wrap"></div>
      </div>

      <!-- Dos columnas: GAP evolución + Stats resumen -->
      <div class="row-2col">

        <!-- Gap evolution -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Evolución del gap</div>
              <div class="card-sub">% de sobrevaloración del asking sobre el precio real notarial</div>
            </div>
          </div>
          <div #gapChart class="chart-wrap-sm"></div>
        </div>

        <!-- Stats anuales -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Resumen anual</div>
              <div class="card-sub">Variaciones acumuladas en los últimos 12 meses</div>
            </div>
          </div>
          <div class="stats-list">
            <div class="stat-row">
              <div class="stat-info">
                <span class="stat-label">Subida del Asking Price</span>
                <span class="stat-desc">Precio anunciado en portales</span>
              </div>
              <span class="stat-val asking">+{{ askingSubida() | number:'1.1-1' }}%</span>
            </div>
            <div class="stat-row">
              <div class="stat-info">
                <span class="stat-label">Subida Notarial real</span>
                <span class="stat-desc">Precio escriturado efectivo</span>
              </div>
              <span class="stat-val notarial">+{{ notarialSubida() | number:'1.1-1' }}%</span>
            </div>
            <div class="stat-row">
              <div class="stat-info">
                <span class="stat-label">Gap actual</span>
                <span class="stat-desc">Margen de negociación estimado</span>
              </div>
              <span class="stat-val gap">{{ svc.ciudadData().gap | number:'1.1-1' }}%</span>
            </div>
            <div class="stat-row">
              <div class="stat-info">
                <span class="stat-label">Máximo gap del año</span>
                <span class="stat-desc">Mes con mayor diferencia</span>
              </div>
              <span class="stat-val" style="color:#a78bfa">{{ maxGap() | number:'1.1-1' }}%</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-insight">
              <div class="insight-icon">💡</div>
              <div class="insight-text">
                El precio notarial sube un
                <strong style="color:var(--notarial)">{{ (notarialSubida()).toFixed(1) }}%</strong>
                anual mientras el asking sube un
                <strong style="color:var(--asking)">{{ (askingSubida()).toFixed(1) }}%</strong>.
                La brecha se amplía — el margen de negociación <strong>aumenta</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla histórica detallada -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Detalle mensual</div>
            <div class="card-sub">Asking, Notarial y Gap por mes · fuente: penotariado.com + Idealista</div>
          </div>
        </div>
        <table class="hist-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Asking €/m²</th>
              <th>Notarial €/m²</th>
              <th>Gap</th>
              <th>Diferencia €/m²</th>
              <th>Var. Asking</th>
              <th>Var. Notarial</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of svc.ciudadData().historico; let i = index">
              <td class="col-mes">{{ h.mes }}</td>
              <td class="col-asking">{{ h.asking | number:'1.0-0':'es-ES' }} €</td>
              <td class="col-notarial">{{ h.notarial | number:'1.0-0':'es-ES' }} €</td>
              <td>
                <span class="gap-pill" [class]="getGapClass(calcGap(h.asking, h.notarial))">
                  +{{ calcGap(h.asking, h.notarial) | number:'1.1-1' }}%
                </span>
              </td>
              <td class="col-diff">{{ (h.asking - h.notarial) | number:'1.0-0':'es-ES' }} €</td>
              <td class="col-var" [class.pos]="varPct(i, 'asking') > 0" [class.neg]="varPct(i, 'asking') < 0">
                {{ i === 0 ? '—' : (varPct(i, 'asking') | number:'1.1-1') + '%' }}
              </td>
              <td class="col-var" [class.pos]="varPct(i, 'notarial') > 0" [class.neg]="varPct(i, 'notarial') < 0">
                {{ i === 0 ? '—' : (varPct(i, 'notarial') | number:'1.1-1') + '%' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  `,
  styles: [`
    .page { padding:28px 32px; display:flex; flex-direction:column; gap:24px; animation:fadeIn .4s ease; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

    .page-header { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px; }
    .page-title  { font-family:'Bebas Neue',sans-serif; font-size:48px; letter-spacing:2px; line-height:1; }
    .page-sub    { font-size:13px; color:var(--text-secondary); margin-top:6px; font-weight:300; }

    .ciudad-actual { display:flex; align-items:center; gap:10px; }
    .ciudad-label  { font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:1px; color:var(--accent); }
    .periodo-badge { background:var(--bg3); border:1px solid var(--border); color:var(--text-muted); font-size:11px; padding:4px 10px; border-radius:20px; }

    .card { background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:22px 24px; }
    .card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
    .card-title  { font-size:13.5px; font-weight:500; color:var(--text-primary); }
    .card-sub    { font-size:11.5px; color:var(--text-secondary); margin-top:3px; font-weight:300; }

    .legend { display:flex; gap:14px; align-items:center; }
    .leg    { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); }
    .dot    { width:10px; height:10px; border-radius:50%; }

    .chart-wrap    { height:300px; }
    .chart-wrap-sm { height:220px; }

    .row-2col { display:grid; grid-template-columns:1fr 360px; gap:20px; }

    /* STATS */
    .stats-list { display:flex; flex-direction:column; gap:0; }
    .stat-row {
      display:flex; justify-content:space-between; align-items:center;
      padding:14px 0; border-bottom:1px solid var(--border);
    }
    .stat-row:last-of-type { border-bottom:none; }
    .stat-info { display:flex; flex-direction:column; gap:3px; }
    .stat-label { font-size:13px; color:var(--text-primary); font-weight:400; }
    .stat-desc  { font-size:11px; color:var(--text-muted); }
    .stat-val   { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:1px; }
    .stat-val.asking   { color:var(--asking); }
    .stat-val.notarial { color:var(--notarial); }
    .stat-val.gap      { color:var(--gap); }
    .stat-divider { height:1px; background:var(--border); margin:8px 0; }
    .stat-insight {
      display:flex; gap:12px; align-items:flex-start;
      background:rgba(79,209,165,0.05);
      border:1px solid rgba(79,209,165,0.12);
      border-radius:8px; padding:14px; margin-top:4px;
    }
    .insight-icon { font-size:18px; flex-shrink:0; }
    .insight-text { font-size:12.5px; color:var(--text-secondary); line-height:1.7; font-weight:300; }

    /* TABLA */
    .hist-table { width:100%; border-collapse:collapse; }
    .hist-table th {
      font-size:10px; letter-spacing:1px; text-transform:uppercase;
      color:var(--text-muted); padding:7px 12px; text-align:left;
      border-bottom:1px solid var(--border); font-weight:500;
    }
    .hist-table td {
      padding:10px 12px; font-size:12.5px;
      border-bottom:1px solid rgba(255,255,255,0.03);
      vertical-align:middle;
    }
    .hist-table tr:last-child td { border-bottom:none; }
    .hist-table tr:hover td { background:rgba(255,255,255,0.02); }

    .col-mes      { color:var(--text-secondary); }
    .col-asking   { color:var(--asking); font-family:'DM Mono',monospace; }
    .col-notarial { color:var(--notarial); font-family:'DM Mono',monospace; }
    .col-diff     { color:var(--gap); font-family:'DM Mono',monospace; font-size:12px; }
    .col-var      { font-family:'DM Mono',monospace; font-size:12px; color:var(--text-muted); }
    .col-var.pos  { color:var(--gap); }
    .col-var.neg  { color:var(--notarial); }

    .gap-pill { font-size:11px; font-family:'DM Mono',monospace; padding:3px 8px; border-radius:8px; font-weight:500; }
    .gap-high { background:rgba(248,113,113,0.15); color:#f87171; }
    .gap-med  { background:rgba(232,197,71,0.12);  color:#e8c547; }
    .gap-low  { background:rgba(79,209,165,0.12);  color:#4fd1a5; }

    @media(max-width:1100px) { .row-2col{grid-template-columns:1fr} .page{padding:20px} }
  `]
})
export class HistoricoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('trendChart') trendChartEl!: ElementRef;
  @ViewChild('gapChart')   gapChartEl!:   ElementRef;

  svc = inject(InmobiliarioService);

  private trendChart: any = null;
  private gapChart:   any = null;
  private ready = false;

  constructor() {
    effect(() => {
      const d = this.svc.ciudadData();
      if (this.ready) this.updateCharts(d);
    });
  }

  ngAfterViewInit() {
    this.ready = true;
    this.initCharts();
  }

  private initCharts() {
    const d = this.svc.ciudadData();
    this.trendChart = new ApexCharts(this.trendChartEl.nativeElement, this.trendOptions(d));
    this.trendChart.render();
    this.gapChart = new ApexCharts(this.gapChartEl.nativeElement, this.gapOptions(d));
    this.gapChart.render();
  }

  private updateCharts(d: any) {
    this.trendChart?.updateSeries([
      { name: 'Asking',   data: d.historico.map((h: any) => h.asking) },
      { name: 'Notarial', data: d.historico.map((h: any) => h.notarial) },
    ]);
    this.trendChart?.updateOptions({ xaxis: { categories: d.historico.map((h: any) => h.mes) } }, false, false);
    this.gapChart?.updateSeries([{ name: 'Gap %', data: d.historico.map((h: any) => this.calcGap(h.asking, h.notarial)) }]);
    this.gapChart?.updateOptions({ xaxis: { categories: d.historico.map((h: any) => h.mes) } }, false, false);
  }

  private trendOptions(d: any) {
    const cats = d.historico.map((h: any) => h.mes);
    const shared = {
      chart: { background:'transparent', toolbar:{ show:false }, fontFamily:'DM Sans, sans-serif', animations:{ enabled:true, speed:500 } },
      grid: { borderColor:'rgba(255,255,255,0.05)', xaxis:{ lines:{ show:false } } },
      xaxis: { categories: cats, axisBorder:{ show:false }, axisTicks:{ show:false }, labels:{ style:{ colors:'#4a4d55', fontSize:'11px' } } },
      yaxis: { labels:{ style:{ colors:'#4a4d55', fontSize:'11px' }, formatter:(v: number) => v.toLocaleString('es-ES') + '€' } },
      dataLabels: { enabled:false },
      markers: { size:0 },
      legend: { show:false },
      tooltip: { theme:'dark', y:{ formatter:(v: number) => v.toLocaleString('es-ES') + ' €/m²' } },
    };
    return {
      ...shared,
      series: [
        { name:'Asking',   data: d.historico.map((h: any) => h.asking) },
        { name:'Notarial', data: d.historico.map((h: any) => h.notarial) },
      ],
      chart: { ...shared.chart, type:'area', height:300 },
      colors: ['#e8c547', '#4fd1a5'],
      stroke: { curve:'smooth', width:[2.5, 2.5] },
      fill: { type:'gradient', gradient:{ shade:'dark', type:'vertical', opacityFrom:0.2, opacityTo:0.02 } },
    };
  }

  private gapOptions(d: any) {
    const gaps = d.historico.map((h: any) => this.calcGap(h.asking, h.notarial));
    return {
      series: [{ name:'Gap %', data: gaps }],
      chart: { type:'bar', height:220, background:'transparent', toolbar:{ show:false }, fontFamily:'DM Sans, sans-serif', animations:{ enabled:true, speed:500 } },
      colors: ['#f87171'],
      plotOptions: { bar:{ borderRadius:4, columnWidth:'55%' } },
      fill: { opacity:0.7 },
      dataLabels: { enabled:false },
      grid: { borderColor:'rgba(255,255,255,0.05)', xaxis:{ lines:{ show:false } } },
      xaxis: { categories: d.historico.map((h: any) => h.mes), axisBorder:{ show:false }, axisTicks:{ show:false }, labels:{ style:{ colors:'#4a4d55', fontSize:'11px' } } },
      yaxis: { labels:{ style:{ colors:'#4a4d55', fontSize:'11px' }, formatter:(v: number) => v.toFixed(1) + '%' } },
      tooltip: { theme:'dark', y:{ formatter:(v: number) => '+' + v.toFixed(1) + '%' } },
      legend: { show:false },
    };
  }

  calcGap(asking: number, notarial: number): number {
    return notarial > 0 ? +((asking - notarial) / notarial * 100).toFixed(1) : 0;
  }

  getGapClass(gap: number): string {
    if (gap >= 20) return 'gap-high';
    if (gap >= 13) return 'gap-med';
    return 'gap-low';
  }

  askingSubida(): number {
    const h = this.svc.ciudadData().historico;
    if (h.length < 2) return 0;
    return (h[h.length - 1].asking - h[0].asking) / h[0].asking * 100;
  }

  notarialSubida(): number {
    const h = this.svc.ciudadData().historico;
    if (h.length < 2) return 0;
    return (h[h.length - 1].notarial - h[0].notarial) / h[0].notarial * 100;
  }

  maxGap(): number {
    const h = this.svc.ciudadData().historico;
    return h.length ? Math.max(...h.map(x => this.calcGap(x.asking, x.notarial))) : 0;
  }

  varPct(i: number, campo: 'asking' | 'notarial'): number {
    const h = this.svc.ciudadData().historico;
    if (i === 0) return 0;
    const prev = h[i - 1][campo];
    const curr = h[i][campo];
    return prev > 0 ? (curr - prev) / prev * 100 : 0;
  }

  ngOnDestroy() {
    this.trendChart?.destroy();
    this.gapChart?.destroy();
  }
}
