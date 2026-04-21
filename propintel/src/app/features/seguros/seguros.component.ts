import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, CurrencyPipe, DecimalPipe } from '@angular/common';

interface SeguroHogar {
  id: string;
  compania: string;
  producto: string;
  logo: string;
  precioAnual: number;
  precioMensual: number;
  valorContinente: number;
  valorContenido: number;
  coberturas: string[];
  extras: string[];
  franquicia: number;
  asistencia24h: boolean;
  cancelacionAnual: boolean;
  mejor: boolean;
  popular: boolean;
  link: string;
  rating: number;
  resenas: number;
  descuento?: string;
}

@Component({
  selector: 'app-seguros',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, CurrencyPipe, DecimalPipe],
  template: `
<div class="page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">Comparador de seguros de hogar</h1>
      <p class="page-sub">Encuentra el seguro ideal para tu nuevo inmueble · Precios actualizados 2026</p>
    </div>
    <a routerLink="/hipotecas" class="btn-ghost">← Hipotecas</a>
  </div>

  <!-- Configurador -->
  <div class="config-strip">
    <div class="config-item">
      <label>Valor del continente (m²)</label>
      <div class="input-prefix">
        <span class="prefix">€</span>
        <input type="number"
          [value]="valorContinente()"
          (input)="valorContinente.set(+$any($event.target).value)"
          min="50000" step="5000" class="calc-input" />
      </div>
    </div>
    <div class="config-item">
      <label>Valor del contenido</label>
      <div class="input-prefix">
        <span class="prefix">€</span>
        <input type="number"
          [value]="valorContenido()"
          (input)="valorContenido.set(+$any($event.target).value)"
          min="0" step="1000" class="calc-input" />
      </div>
    </div>
    <div class="config-item">
      <label>Tipo de vivienda</label>
      <div class="tipo-tabs">
        <button *ngFor="let t of tiposVivienda"
          class="tipo-tab" [class.active]="tipoVivienda() === t"
          (click)="tipoVivienda.set(t)">{{ t }}</button>
      </div>
    </div>
    <div class="config-item">
      <label>Superfície (m²)</label>
      <input type="number"
        [value]="superficie()"
        (input)="superficie.set(+$any($event.target).value)"
        min="30" max="500" step="10" class="calc-input sm" />
    </div>
  </div>

  <!-- Info banner -->
  <div class="info-banner">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
    <span>Si tienes hipoteca, el banco puede <strong>exigir seguro de hogar</strong>. El importe mínimo asegurado debe cubrir el valor de tasación del continente.</span>
  </div>

  <div class="main-grid">
    <!-- Resultados -->
    <div class="results-col">
      <div class="results-header">
        <span class="results-count">{{ ofertasFiltradas().length }} seguros disponibles</span>
        <div class="sort-tabs">
          <button *ngFor="let s of sortOpciones"
            class="sort-tab" [class.active]="sortBy() === s.key"
            (click)="sortBy.set(s.key)">{{ s.label }}</button>
        </div>
      </div>

      <div class="seguro-cards">
        <div class="seguro-card"
          *ngFor="let s of ofertasFiltradas()"
          [class.card-best]="s.mejor"
          [class.card-popular]="s.popular && !s.mejor">

          <!-- Badges -->
          <div class="card-badges">
            <span class="badge badge-best" *ngIf="s.mejor">🏆 MEJOR PRECIO</span>
            <span class="badge badge-popular" *ngIf="s.popular && !s.mejor">⭐ MÁS CONTRATADO</span>
            <span class="badge badge-dto" *ngIf="s.descuento">{{ s.descuento }}</span>
          </div>

          <div class="card-main">
            <div class="card-left">
              <div class="company-logo">
                <span class="logo-letter">{{ s.compania[0] }}</span>
              </div>
              <div class="company-info">
                <div class="company-name">{{ s.compania }}</div>
                <div class="product-name">{{ s.producto }}</div>
                <div class="rating-row">
                  <span class="stars">{{ '★'.repeat(Math.round(s.rating)) }}</span>
                  <span class="rating-val">{{ s.rating | number:'1.1-1' }}</span>
                  <span class="resenas">({{ s.resenas | number }} resenas)</span>
                </div>
              </div>
            </div>

            <div class="card-right">
              <div class="precio-anual">{{ s.precioAnual | currency:'EUR':'symbol':'1.0-0' }}<span class="precio-periodo">/año</span></div>
              <div class="precio-mensual">≈ {{ s.precioMensual | currency:'EUR':'symbol':'1.0-0' }}/mes</div>
              <div class="franquicia-pill" *ngIf="s.franquicia > 0">Franquicia {{ s.franquicia | currency:'EUR':'symbol':'1.0-0' }}</div>
              <div class="sin-franquicia" *ngIf="s.franquicia === 0">Sin franquicia</div>
            </div>
          </div>

          <!-- Coberturas -->
          <div class="coberturas">
            <div class="cob-section">
              <div class="cob-title">Coberturas incluidas</div>
              <div class="cob-tags">
                <span class="cob-tag ok" *ngFor="let c of s.coberturas">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  {{ c }}
                </span>
              </div>
            </div>
            <div class="cob-section" *ngIf="s.extras.length > 0">
              <div class="cob-title extras">Extras destacados</div>
              <div class="cob-tags">
                <span class="cob-tag extra" *ngFor="let e of s.extras">{{ e }}</span>
              </div>
            </div>
          </div>

          <!-- Features row -->
          <div class="features-row">
            <div class="feat" [class.feat-on]="s.asistencia24h">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Asistencia 24h
            </div>
            <div class="feat" [class.feat-on]="s.cancelacionAnual">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              Cancelación anual
            </div>
            <div class="feat feat-on">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Continente {{ s.valorContinente | currency:'EUR':'symbol':'1.0-0' }}
            </div>
          </div>

          <div class="card-cta">
            <a [href]="s.link" target="_blank" rel="noopener" class="btn-contratar">
              Ver oferta →
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel lateral: guía -->
    <aside class="guide-panel">
      <div class="guide-card">
        <div class="guide-title">¿Qué cubre un seguro de hogar?</div>
        <div class="guide-items">
          <div class="guide-item" *ngFor="let g of guiaItems">
            <div class="guide-icon">{{ g.icon }}</div>
            <div>
              <div class="guide-item-title">{{ g.titulo }}</div>
              <div class="guide-item-desc">{{ g.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="guide-card tip-card">
        <div class="guide-title">Consejo IA</div>
        <div class="ai-tip">
          <div class="ai-icon">🤖</div>
          <p>Para un piso de <strong>{{ superficie() }} m²</strong> en Madrid, el valor medio del continente recomendado es
          <strong>{{ (superficie() * 850) | currency:'EUR':'symbol':'1.0-0' }}</strong>. Asegúrate de no infraasegurar el inmueble o el banco podría rechazar la póliza.</p>
        </div>
      </div>

      <div class="guide-card calc-card">
        <div class="guide-title">Costes totales estimados</div>
        <div class="cost-rows">
          <div class="cost-row">
            <span>Seguro hogar (mejor oferta/año)</span>
            <span class="cost-val">{{ ofertasFiltradas()[0]?.precioAnual | currency:'EUR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="cost-row">
            <span>Seguro vida (estimado)</span>
            <span class="cost-val">~{{ ((valorContinente() * 0.0003) | number:'1.0-0') }} €/año</span>
          </div>
          <div class="cost-row total-row">
            <span>Total seguros/año</span>
            <span class="cost-val total-val">{{ ((ofertasFiltradas()[0]?.precioAnual || 0) + (valorContinente() * 0.0003)) | currency:'EUR':'symbol':'1.0-0' }}</span>
          </div>
        </div>
      </div>
    </aside>
  </div>

</div>
  `,
  styles: [`
    .page { padding: 32px; font-family: 'Plus Jakarta Sans', sans-serif; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { font-size: 26px; font-weight: 800; color: #0F172A; letter-spacing: -0.04em; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748B; margin: 0; }
    .btn-ghost { font-size: 13px; color: #64748B; text-decoration: none; padding: 8px 14px; border: 1px solid rgba(0,82,255,.1); border-radius: 10px; transition: all .2s; }
    .btn-ghost:hover { border-color: #0052FF; color: #0052FF; }

    .config-strip {
      display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap;
      background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 16px;
      padding: 20px 24px; margin-bottom: 16px;
    }
    .config-item { display: flex; flex-direction: column; gap: 6px; }
    .config-item label { font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: .06em; }
    .input-prefix { display: flex; align-items: center; border: 1px solid rgba(0,82,255,.12); border-radius: 10px; overflow: hidden; }
    .prefix { padding: 8px 10px; background: #F8FAFC; color: #64748B; font-size: 13px; border-right: 1px solid rgba(0,82,255,.08); }
    .calc-input { border: none; outline: none; padding: 8px 12px; font-size: 14px; font-family: inherit; width: 120px; color: #0F172A; }
    .calc-input.sm { border: 1px solid rgba(0,82,255,.12); border-radius: 10px; padding: 8px 12px; width: 80px; font-family: inherit; font-size: 14px; outline: none; }
    .tipo-tabs { display: flex; gap: 4px; }
    .tipo-tab { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(0,82,255,.1); background: #F8FAFC; color: #64748B; font-size: 12px; cursor: pointer; font-weight: 500; transition: all .2s; }
    .tipo-tab.active { background: #0052FF; color: #fff; border-color: #0052FF; }

    .info-banner { display: flex; gap: 10px; align-items: center; background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #92400E; }
    .info-banner svg { flex-shrink: 0; color: #F59E0B; }

    .main-grid { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }

    .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .results-count { font-size: 13px; color: #64748B; font-weight: 500; }
    .sort-tabs { display: flex; gap: 4px; }
    .sort-tab { padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(0,82,255,.1); background: transparent; color: #64748B; font-size: 11px; cursor: pointer; font-weight: 500; transition: all .2s; }
    .sort-tab.active { background: #EEF4FF; color: #0052FF; border-color: #0052FF; }

    .seguro-cards { display: flex; flex-direction: column; gap: 16px; }
    .seguro-card {
      background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 20px;
      padding: 20px 24px; transition: all .3s;
    }
    .seguro-card:hover { box-shadow: 0 8px 32px rgba(0,82,255,.08); transform: translateY(-1px); }
    .card-best { border-color: #0052FF; box-shadow: 0 0 0 1px #0052FF; }
    .card-popular { border-color: #F59E0B; }
    .card-badges { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; letter-spacing: .03em; }
    .badge-best { background: rgba(0,82,255,.1); color: #0052FF; }
    .badge-popular { background: rgba(245,158,11,.1); color: #F59E0B; }
    .badge-dto { background: rgba(16,185,129,.1); color: #059669; }

    .card-main { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .card-left { display: flex; gap: 14px; align-items: center; }
    .company-logo { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0052FF, #00B5A3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .logo-letter { font-size: 20px; font-weight: 800; color: #fff; }
    .company-name { font-size: 16px; font-weight: 700; color: #0F172A; }
    .product-name { font-size: 12px; color: #64748B; }
    .rating-row { display: flex; align-items: center; gap: 4px; margin-top: 3px; }
    .stars { color: #F59E0B; font-size: 12px; }
    .rating-val { font-size: 12px; font-weight: 600; color: #0F172A; }
    .resenas { font-size: 11px; color: #94A3B8; }
    .card-right { text-align: right; }
    .precio-anual { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.04em; }
    .precio-periodo { font-size: 14px; font-weight: 500; color: #64748B; }
    .precio-mensual { font-size: 12px; color: #64748B; margin-top: 2px; }
    .franquicia-pill { display: inline-block; margin-top: 6px; font-size: 11px; padding: 3px 8px; background: #FFF8F0; color: #F59E0B; border-radius: 6px; font-weight: 600; }
    .sin-franquicia { display: inline-block; margin-top: 6px; font-size: 11px; padding: 3px 8px; background: rgba(16,185,129,.08); color: #059669; border-radius: 6px; font-weight: 600; }

    .coberturas { margin-bottom: 14px; display: flex; flex-direction: column; gap: 8px; }
    .cob-section { display: flex; flex-direction: column; gap: 6px; }
    .cob-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #94A3B8; }
    .cob-title.extras { color: #10B981; }
    .cob-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .cob-tag { font-size: 11px; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px; font-weight: 500; }
    .cob-tag.ok { background: rgba(16,185,129,.08); color: #059669; }
    .cob-tag.extra { background: rgba(139,92,246,.08); color: #7C3AED; }

    .features-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .feat { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #94A3B8; font-weight: 500; }
    .feat svg { opacity: .4; }
    .feat.feat-on { color: #0F172A; }
    .feat.feat-on svg { opacity: 1; color: #0052FF; }

    .card-cta { display: flex; justify-content: flex-end; }
    .btn-contratar { background: #0052FF; color: #fff; border: none; padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; transition: all .2s; display: inline-block; }
    .btn-contratar:hover { background: #0041CC; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(0,82,255,.25); }

    /* Guide panel */
    .guide-panel { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 80px; }
    .guide-card { background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 20px; padding: 20px; }
    .guide-title { font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 14px; }
    .guide-items { display: flex; flex-direction: column; gap: 12px; }
    .guide-item { display: flex; gap: 10px; align-items: flex-start; }
    .guide-icon { font-size: 18px; flex-shrink: 0; }
    .guide-item-title { font-size: 12px; font-weight: 600; color: #0F172A; }
    .guide-item-desc { font-size: 11px; color: #64748B; margin-top: 2px; line-height: 1.4; }
    .tip-card { background: linear-gradient(135deg, #EEF4FF, #F0FDF4); border-color: #C7D7FF; }
    .ai-tip { display: flex; gap: 10px; align-items: flex-start; }
    .ai-icon { font-size: 22px; flex-shrink: 0; }
    .ai-tip p { font-size: 12px; color: #374151; line-height: 1.6; margin: 0; }
    .calc-card { background: #FAFAFA; }
    .cost-rows { display: flex; flex-direction: column; gap: 10px; }
    .cost-row { display: flex; justify-content: space-between; font-size: 12px; color: #64748B; }
    .cost-val { font-weight: 600; color: #0F172A; }
    .total-row { padding-top: 10px; border-top: 1px solid rgba(0,82,255,.08); font-weight: 700; font-size: 13px; color: #0F172A; }
    .total-val { color: #0052FF; }
  `]
})
export class SegurosComponent {
  readonly Math = Math;

  valorContinente = signal(150000);
  valorContenido = signal(20000);
  tipoVivienda = signal('Piso');
  superficie = signal(80);
  sortBy = signal<'precio' | 'rating' | 'coberturas'>('precio');

  tiposVivienda = ['Piso', 'Casa', 'Chalet', 'Ático'];

  sortOpciones = [
    { key: 'precio' as const, label: 'Precio' },
    { key: 'rating' as const, label: 'Valoración' },
    { key: 'coberturas' as const, label: 'Coberturas' },
  ];

  guiaItems = [
    { icon: '🏠', titulo: 'Continente', desc: 'Cubre la estructura del edificio: paredes, suelos, techos, instalaciones.' },
    { icon: '🛋️', titulo: 'Contenido', desc: 'Muebles, electrodomésticos, ropa y objetos personales dentro del hogar.' },
    { icon: '💧', titulo: 'Daños por agua', desc: 'Roturas de tuberías, filtraciones y humedades cubiertas por la póliza.' },
    { icon: '🔥', titulo: 'Incendio y explosión', desc: 'Daños materiales causados por fuego, rayos o explosiones.' },
    { icon: '🤝', titulo: 'Responsabilidad civil', desc: 'Daños que causes a terceros como propietario o inquilino.' },
  ];

  private seguros: SeguroHogar[] = [
    {
      id: 'mutua',
      compania: 'Mutua Madrileña',
      producto: 'Hogar Esencial',
      logo: 'M',
      precioAnual: 189,
      precioMensual: 16,
      valorContinente: 150000,
      valorContenido: 20000,
      coberturas: ['Incendio', 'Robo', 'Agua', 'RC civil', 'Cristales'],
      extras: ['App gestión siniestros', 'Reparaciones urgentes'],
      franquicia: 0,
      asistencia24h: true,
      cancelacionAnual: true,
      mejor: true,
      popular: false,
      link: 'https://www.mutua.es/seguros/hogar/',
      rating: 4.6,
      resenas: 12400,
      descuento: '20% primer año',
    },
    {
      id: 'mapfre',
      compania: 'MAPFRE',
      producto: 'Hogar Total',
      logo: 'M',
      precioAnual: 215,
      precioMensual: 18,
      valorContinente: 150000,
      valorContenido: 25000,
      coberturas: ['Incendio', 'Robo', 'Agua', 'RC civil', 'Cristales', 'Fenómenos atmosféricos'],
      extras: ['Servicio jurídico', 'Reparaciones hogar 24h'],
      franquicia: 150,
      asistencia24h: true,
      cancelacionAnual: true,
      mejor: false,
      popular: true,
      link: 'https://www.mapfre.es/seguros/hogar/',
      rating: 4.4,
      resenas: 23800,
    },
    {
      id: 'generali',
      compania: 'Generali',
      producto: 'Mi Casa Segura',
      logo: 'G',
      precioAnual: 178,
      precioMensual: 15,
      valorContinente: 150000,
      valorContenido: 18000,
      coberturas: ['Incendio', 'Robo', 'Agua', 'RC civil'],
      extras: ['Gestor personal online'],
      franquicia: 200,
      asistencia24h: false,
      cancelacionAnual: true,
      mejor: false,
      popular: false,
      link: 'https://www.generali.es/seguros-hogar/',
      rating: 4.1,
      resenas: 7200,
      descuento: '15% online',
    },
    {
      id: 'allianz',
      compania: 'Allianz',
      producto: 'Hogar Premium',
      logo: 'A',
      precioAnual: 264,
      precioMensual: 22,
      valorContinente: 200000,
      valorContenido: 30000,
      coberturas: ['Incendio', 'Robo', 'Agua', 'RC civil', 'Cristales', 'Fenómenos atmosféricos', 'Daños eléctricos'],
      extras: ['Defensa jurídica', 'Seguro viaje incluido', 'Cyber-seguro'],
      franquicia: 0,
      asistencia24h: true,
      cancelacionAnual: false,
      mejor: false,
      popular: false,
      link: 'https://www.allianz.es/seguros-hogar.html',
      rating: 4.5,
      resenas: 18600,
    },
    {
      id: 'verti',
      compania: 'Verti',
      producto: 'Hogar Online',
      logo: 'V',
      precioAnual: 162,
      precioMensual: 14,
      valorContinente: 120000,
      valorContenido: 15000,
      coberturas: ['Incendio', 'Agua', 'RC civil'],
      extras: ['100% online'],
      franquicia: 300,
      asistencia24h: false,
      cancelacionAnual: true,
      mejor: false,
      popular: false,
      link: 'https://www.verti.es/seguro-hogar/',
      rating: 3.9,
      resenas: 4500,
      descuento: '10% sin papeles',
    },
    {
      id: 'axa',
      compania: 'AXA',
      producto: 'Hogar Tranquilidad',
      logo: 'A',
      precioAnual: 228,
      precioMensual: 19,
      valorContinente: 180000,
      valorContenido: 25000,
      coberturas: ['Incendio', 'Robo', 'Agua', 'RC civil', 'Cristales', 'Daños eléctricos'],
      extras: ['Asistencia en viaje', 'Protección mascotas'],
      franquicia: 0,
      asistencia24h: true,
      cancelacionAnual: true,
      mejor: false,
      popular: false,
      link: 'https://www.axa.es/seguros/hogar',
      rating: 4.3,
      resenas: 15200,
    },
  ];

  ofertasFiltradas = computed(() => {
    const sorted = [...this.seguros].sort((a, b) => {
      if (this.sortBy() === 'precio') return a.precioAnual - b.precioAnual;
      if (this.sortBy() === 'rating') return b.rating - a.rating;
      return b.coberturas.length - a.coberturas.length;
    });

    sorted.forEach((s, i) => {
      s.mejor = i === 0 && this.sortBy() === 'precio';
    });

    return sorted;
  });
}
