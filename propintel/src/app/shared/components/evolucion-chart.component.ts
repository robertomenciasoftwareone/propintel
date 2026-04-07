import { Component, inject, effect, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-evolucion-chart',
  standalone: true,
  template: `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Evolución Asking vs Notarial · 12 meses</div>
          <div class="card-sub">El área roja es el gap — el margen real que puedes negociar</div>
        </div>
        <div class="legend">
          <span class="leg"><span class="dot" style="background:#e8c547"></span>Idealista</span>
          <span class="leg"><span class="dot" style="background:#60a5fa"></span>Fotocasa</span>
          <span class="leg"><span class="dot" style="background:var(--notarial)"></span>Notarial</span>
        </div>
      </div>
      <div #chartEl class="chart-wrap"></div>
    </div>
  `,
  styles: [`
    .card { background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:22px 24px; }
    .card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
    .card-title  { font-size:13.5px; font-weight:500; color:var(--text-primary); }
    .card-sub    { font-size:11.5px; color:var(--text-secondary); margin-top:3px; font-weight:300; }
    .legend      { display:flex; gap:14px; align-items:center; }
    .leg         { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); }
    .dot         { width:10px; height:10px; border-radius:50%; }
    .chart-wrap  { height:300px; }
  `]
})
export class EvolucionChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartEl') chartEl!: ElementRef;
  svc = inject(InmobiliarioService);
  private chart: any = null;
  private ready = false;

  constructor() {
    effect(() => {
      const d = this.svc.ciudadData();
      if (this.ready) this.updateChart(d);
    });
  }

  ngAfterViewInit() {
    this.ready = true;
    this.initChart();
  }

  private initChart() {
    const d = this.svc.ciudadData();
    this.chart = new ApexCharts(this.chartEl.nativeElement, this.buildOptions(d) as any);
    this.chart.render();
  }

  private updateChart(d: any) {
    if (!this.chart) return;
    this.chart.updateOptions({
      xaxis: { categories: d.historico.map((h: any) => h.mes) }
    }, false, false);
    this.chart.updateSeries([
      { name: 'Idealista',       data: d.historico.map((h: any) => h.askingIdealista ?? h.asking) },
      { name: 'Fotocasa',        data: d.historico.map((h: any) => h.askingFotocasa ?? h.asking) },
      { name: 'Precio Notarial', data: d.historico.map((h: any) => h.notarial) },
    ]);
  }

  private buildOptions(d: any) {
    return {
      series: [
        { name: 'Idealista',       data: d.historico.map((h: any) => h.askingIdealista ?? h.asking) },
        { name: 'Fotocasa',        data: d.historico.map((h: any) => h.askingFotocasa ?? h.asking) },
        { name: 'Precio Notarial', data: d.historico.map((h: any) => h.notarial) },
      ],
      chart: {
        type: 'area', height: 300,
        background: 'transparent',
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 600 },
        fontFamily: 'DM Sans, sans-serif',
      },
      colors: ['#e8c547', '#60a5fa', '#4fd1a5'],
      fill: {
        type: 'gradient',
        gradient: { shade: 'dark', type: 'vertical', opacityFrom: 0.15, opacityTo: 0.02 }
      },
      stroke: { curve: 'smooth', width: [2, 2, 2.5], dashArray: [4, 4, 0] },
      dataLabels: { enabled: false },
      markers: { size: 0 },
      grid: {
        borderColor: 'rgba(255,255,255,0.05)',
        xaxis: { lines: { show: false } },
      },
      xaxis: {
        categories: d.historico.map((h: any) => h.mes),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: '#4a4d55', fontSize: '11px' } },
      },
      yaxis: {
        labels: {
          style: { colors: '#4a4d55', fontSize: '11px' },
          formatter: (v: number) => v.toLocaleString('es-ES') + '€',
        }
      },
      tooltip: {
        theme: 'dark',
        custom: ({ series, dataPointIndex, w }: any) => {
          const idl = series[0][dataPointIndex];
          const ftc = series[1][dataPointIndex];
          const not = series[2][dataPointIndex];
          const ask = Math.round((idl + ftc) / 2);
          const gap = not ? (((ask - not) / not) * 100).toFixed(1) : '–';
          const mes = w.globals.categoryLabels[dataPointIndex];
          return `<div style="background:#1a1e25;border:1px solid rgba(255,255,255,0.1);padding:12px 16px;border-radius:8px;font-family:'DM Sans',sans-serif;min-width:200px">
            <div style="font-size:10px;color:#4a4d55;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">${mes}</div>
            <div style="color:#e8c547;font-size:13px;margin-bottom:3px">Idealista: ${idl.toLocaleString('es-ES')} €/m²</div>
            <div style="color:#60a5fa;font-size:13px;margin-bottom:3px">Fotocasa: ${ftc.toLocaleString('es-ES')} €/m²</div>
            <div style="color:#4fd1a5;font-size:13px;margin-bottom:10px">Notarial: ${not.toLocaleString('es-ES')} €/m²</div>
            <div style="background:rgba(248,113,113,0.12);color:#f87171;padding:5px 10px;border-radius:6px;font-size:12px">Gap negociable: +${gap}%</div>
          </div>`;
        }
      },
      legend: { show: false },
    };
  }

  ngOnDestroy() { this.chart?.destroy(); }
}
