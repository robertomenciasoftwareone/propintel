import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';

interface Barrio {
  nombre: string;
  distrito: string;
  ciudad: string;
  scoreTotal: number;
  scores: {
    transporte: number;
    seguridad: number;
    colegios: number;
    comercios: number;
    parques: number;
    restaurantes: number;
    ruido: number;
    precio: number;
  };
  precioM2: number;
  precioM2Alquiler: number;
  rentabilidadBruta: number;
  tendencia: 'subiendo' | 'estable' | 'bajando';
  perfil: string[];
  tags: string[];
  aiInsight: string;
}

@Component({
  selector: 'app-barrios',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, DecimalPipe],
  template: `
<div class="page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">Ranking de barrios</h1>
      <p class="page-sub">Análisis IA de calidad de vida, precios y oportunidades por barrio · Madrid 2026</p>
    </div>
    <a routerLink="/mapa-resultados" class="btn-ghost">← Volver al mapa</a>
  </div>

  <!-- Filtros -->
  <div class="filters-bar">
    <div class="filter-group">
      <label>Prioridad</label>
      <div class="filter-tabs">
        <button *ngFor="let f of filtros"
          class="filter-tab" [class.active]="filtroActivo() === f.key"
          (click)="filtroActivo.set(f.key)">
          {{ f.icon }} {{ f.label }}
        </button>
      </div>
    </div>
    <div class="filter-group">
      <label>Precio máximo/m²</label>
      <div class="price-range">
        <input type="range" [value]="precioMax()" (input)="precioMax.set(+$any($event.target).value)"
          min="2000" max="12000" step="500" class="range-input" />
        <span class="range-val">{{ precioMax() | number }} €/m²</span>
      </div>
    </div>
    <div class="filter-group">
      <label>Perfil</label>
      <div class="filter-tabs">
        <button *ngFor="let p of perfiles"
          class="filter-tab sm" [class.active]="perfilActivo() === p"
          (click)="perfilActivo.set(p)">{{ p }}</button>
      </div>
    </div>
  </div>

  <!-- Scorecard IA destacado -->
  <div class="ai-highlight" *ngIf="barrioTop()">
    <div class="ai-highlight-badge">🤖 Recomendación IA</div>
    <div class="ai-highlight-content">
      <div class="ai-highlight-left">
        <div class="ai-barrio-name">{{ barrioTop()?.nombre }}</div>
        <div class="ai-barrio-dist">{{ barrioTop()?.distrito }}, Madrid</div>
        <div class="ai-insight">{{ barrioTop()?.aiInsight }}</div>
        <div class="ai-tags">
          <span class="ai-tag" *ngFor="let t of barrioTop()?.tags">{{ t }}</span>
        </div>
      </div>
      <div class="ai-highlight-right">
        <div class="ai-score-circle">
          <div class="score-val">{{ barrioTop()?.scoreTotal }}</div>
          <div class="score-label">Score IA</div>
        </div>
        <div class="ai-stats">
          <div class="ai-stat">
            <span class="ai-stat-val">{{ barrioTop()?.precioM2 | number:'1.0-0' }} €/m²</span>
            <span class="ai-stat-label">Precio compra</span>
          </div>
          <div class="ai-stat">
            <span class="ai-stat-val">{{ barrioTop()?.rentabilidadBruta | number:'1.1-1' }}%</span>
            <span class="ai-stat-label">Rentabilidad bruta</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Grid de barrios -->
  <div class="barrios-grid">
    <div class="barrio-card" *ngFor="let b of barriosFiltrados(); let i = index">

      <!-- Rank & header -->
      <div class="card-top">
        <div class="rank-badge" [class.rank-gold]="i===0" [class.rank-silver]="i===1" [class.rank-bronze]="i===2">
          #{{ i + 1 }}
        </div>
        <div class="tendencia-pill" [class]="'tend-' + b.tendencia">
          {{ b.tendencia === 'subiendo' ? '↑' : b.tendencia === 'bajando' ? '↓' : '→' }}
          {{ b.tendencia }}
        </div>
      </div>

      <div class="barrio-name">{{ b.nombre }}</div>
      <div class="barrio-distrito">{{ b.distrito }}</div>

      <!-- Score total -->
      <div class="score-bar-wrap">
        <div class="score-label-row">
          <span>Score IA</span>
          <span class="score-num">{{ b.scoreTotal }}/10</span>
        </div>
        <div class="score-bar">
          <div class="score-fill" [style.width.%]="b.scoreTotal * 10"
            [class.fill-green]="b.scoreTotal >= 8"
            [class.fill-blue]="b.scoreTotal >= 6 && b.scoreTotal < 8"
            [class.fill-yellow]="b.scoreTotal < 6"></div>
        </div>
      </div>

      <!-- Scores desglosados -->
      <div class="scores-grid">
        <div class="score-item" *ngFor="let s of getScoreItems(b)">
          <div class="score-icon">{{ s.icon }}</div>
          <div class="score-mini-bar">
            <div class="mini-fill" [style.width.%]="s.valor * 10"></div>
          </div>
          <div class="score-mini-val">{{ s.valor }}</div>
        </div>
      </div>

      <!-- Precios -->
      <div class="precio-row">
        <div class="precio-item">
          <div class="precio-val">{{ b.precioM2 | number:'1.0-0' }} €</div>
          <div class="precio-lbl">m² compra</div>
        </div>
        <div class="precio-sep"></div>
        <div class="precio-item">
          <div class="precio-val">{{ b.precioM2Alquiler | number:'1.0-0' }} €</div>
          <div class="precio-lbl">m² alquiler</div>
        </div>
        <div class="precio-sep"></div>
        <div class="precio-item">
          <div class="precio-val rentab">{{ b.rentabilidadBruta | number:'1.1-1' }}%</div>
          <div class="precio-lbl">Rentab. bruta</div>
        </div>
      </div>

      <!-- Tags perfil -->
      <div class="perfil-tags">
        <span class="perfil-tag" *ngFor="let p of b.perfil">{{ p }}</span>
      </div>

      <div class="card-cta">
        <a [routerLink]="['/mapa-resultados']" [queryParams]="{barrio: b.nombre}" class="btn-ver">
          Ver pisos →
        </a>
      </div>
    </div>
  </div>

  <!-- Tabla comparativa completa -->
  <div class="tabla-section">
    <div class="tabla-title">Comparativa completa de indicadores</div>
    <div class="tabla-wrap">
      <table class="tabla">
        <thead>
          <tr>
            <th>Barrio</th>
            <th>🚇 Transporte</th>
            <th>🔒 Seguridad</th>
            <th>🏫 Colegios</th>
            <th>🛍️ Comercios</th>
            <th>🌳 Parques</th>
            <th>🍽️ Restaurantes</th>
            <th>🔕 Ruido</th>
            <th>💰 Precio</th>
            <th>€/m²</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let b of barriosFiltrados()">
            <td class="barrio-cell"><strong>{{ b.nombre }}</strong><br><small>{{ b.distrito }}</small></td>
            <td><div class="score-dot" [class]="scoreClass(b.scores.transporte)">{{ b.scores.transporte }}</div></td>
            <td><div class="score-dot" [class]="scoreClass(b.scores.seguridad)">{{ b.scores.seguridad }}</div></td>
            <td><div class="score-dot" [class]="scoreClass(b.scores.colegios)">{{ b.scores.colegios }}</div></td>
            <td><div class="score-dot" [class]="scoreClass(b.scores.comercios)">{{ b.scores.comercios }}</div></td>
            <td><div class="score-dot" [class]="scoreClass(b.scores.parques)">{{ b.scores.parques }}</div></td>
            <td><div class="score-dot" [class]="scoreClass(b.scores.restaurantes)">{{ b.scores.restaurantes }}</div></td>
            <td><div class="score-dot" [class]="scoreClass(b.scores.ruido)">{{ b.scores.ruido }}</div></td>
            <td><div class="score-dot" [class]="scoreClass(b.scores.precio)">{{ b.scores.precio }}</div></td>
            <td class="precio-cell">{{ b.precioM2 | number:'1.0-0' }} €</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
  `,
  styles: [`
    .page { padding: 32px; font-family: 'Plus Jakarta Sans', sans-serif; max-width: 1600px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { font-size: 26px; font-weight: 800; color: #0F172A; letter-spacing: -0.04em; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748B; margin: 0; }
    .btn-ghost { font-size: 13px; color: #64748B; text-decoration: none; padding: 8px 14px; border: 1px solid rgba(0,82,255,.1); border-radius: 10px; transition: all .2s; }
    .btn-ghost:hover { border-color: #0052FF; color: #0052FF; }

    .filters-bar { display: flex; gap: 24px; align-items: flex-end; flex-wrap: wrap; background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 16px; padding: 16px 20px; margin-bottom: 20px; }
    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #94A3B8; }
    .filter-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
    .filter-tab { padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(0,82,255,.1); background: #F8FAFC; color: #64748B; font-size: 12px; cursor: pointer; font-weight: 500; transition: all .2s; font-family: inherit; }
    .filter-tab.sm { font-size: 11px; padding: 5px 10px; }
    .filter-tab.active { background: #0052FF; color: #fff; border-color: #0052FF; }
    .price-range { display: flex; align-items: center; gap: 10px; }
    .range-input { width: 160px; accent-color: #0052FF; }
    .range-val { font-size: 12px; font-weight: 600; color: #0F172A; white-space: nowrap; }

    /* AI Highlight */
    .ai-highlight { background: linear-gradient(135deg, #0052FF 0%, #7C3AED 100%); border-radius: 20px; padding: 24px 28px; color: #fff; margin-bottom: 24px; }
    .ai-highlight-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.2); display: inline-block; padding: 4px 10px; border-radius: 20px; margin-bottom: 14px; letter-spacing: .04em; }
    .ai-highlight-content { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
    .ai-barrio-name { font-size: 28px; font-weight: 800; letter-spacing: -0.04em; }
    .ai-barrio-dist { font-size: 14px; opacity: .7; margin-bottom: 10px; }
    .ai-insight { font-size: 13px; line-height: 1.6; opacity: .9; max-width: 520px; margin-bottom: 12px; }
    .ai-tags { display: flex; gap: 8px; flex-wrap: wrap; }
    .ai-tag { font-size: 11px; padding: 4px 10px; background: rgba(255,255,255,.15); border-radius: 20px; font-weight: 500; }
    .ai-highlight-right { display: flex; align-items: center; gap: 24px; flex-shrink: 0; }
    .ai-score-circle { width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,.15); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,.3); }
    .score-val { font-size: 32px; font-weight: 800; }
    .score-label { font-size: 10px; opacity: .7; font-weight: 600; letter-spacing: .06em; }
    .ai-stats { display: flex; flex-direction: column; gap: 12px; }
    .ai-stat { display: flex; flex-direction: column; gap: 2px; }
    .ai-stat-val { font-size: 20px; font-weight: 700; }
    .ai-stat-label { font-size: 11px; opacity: .6; }

    /* Grid */
    .barrios-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .barrio-card { background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 12px; transition: all .3s; }
    .barrio-card:hover { box-shadow: 0 8px 32px rgba(0,82,255,.08); transform: translateY(-2px); }
    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .rank-badge { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: #F1F5F9; color: #64748B; }
    .rank-gold { background: #FEF3C7; color: #D97706; }
    .rank-silver { background: #F1F5F9; color: #64748B; }
    .rank-bronze { background: #FEF0E8; color: #C2410C; }
    .tendencia-pill { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
    .tend-subiendo { background: rgba(16,185,129,.1); color: #059669; }
    .tend-estable { background: rgba(100,116,139,.1); color: #64748B; }
    .tend-bajando { background: rgba(225,29,72,.1); color: #E11D48; }
    .barrio-name { font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em; }
    .barrio-distrito { font-size: 12px; color: #64748B; margin-top: -8px; }
    .score-bar-wrap { display: flex; flex-direction: column; gap: 4px; }
    .score-label-row { display: flex; justify-content: space-between; font-size: 11px; color: #64748B; font-weight: 500; }
    .score-num { font-weight: 700; color: #0F172A; }
    .score-bar { height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 3px; transition: width .5s; }
    .fill-green { background: #10B981; }
    .fill-blue { background: #0052FF; }
    .fill-yellow { background: #F59E0B; }

    .scores-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .score-item { display: flex; flex-direction: column; gap: 3px; align-items: center; }
    .score-icon { font-size: 14px; }
    .score-mini-bar { width: 100%; height: 4px; background: #F1F5F9; border-radius: 2px; overflow: hidden; }
    .mini-fill { height: 100%; background: #0052FF; opacity: .7; border-radius: 2px; }
    .score-mini-val { font-size: 10px; font-weight: 600; color: #64748B; }

    .precio-row { display: flex; gap: 0; border: 1px solid rgba(0,82,255,.08); border-radius: 12px; overflow: hidden; }
    .precio-item { flex: 1; padding: 10px; text-align: center; }
    .precio-sep { width: 1px; background: rgba(0,82,255,.08); }
    .precio-val { font-size: 15px; font-weight: 700; color: #0F172A; }
    .precio-val.rentab { color: #10B981; }
    .precio-lbl { font-size: 10px; color: #94A3B8; }

    .perfil-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .perfil-tag { font-size: 10px; padding: 3px 8px; background: #EEF4FF; color: #0052FF; border-radius: 20px; font-weight: 500; }

    .card-cta { margin-top: auto; }
    .btn-ver { display: block; text-align: center; padding: 9px; border-radius: 10px; background: #F8FAFF; color: #0052FF; font-size: 12px; font-weight: 600; text-decoration: none; border: 1px solid rgba(0,82,255,.12); transition: all .2s; }
    .btn-ver:hover { background: #EEF4FF; }

    /* Tabla */
    .tabla-section { background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 20px; padding: 24px; }
    .tabla-title { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .tabla-wrap { overflow-x: auto; }
    .tabla { width: 100%; border-collapse: collapse; font-size: 12px; }
    .tabla th { padding: 10px 12px; text-align: center; background: #F8FAFC; color: #64748B; font-weight: 600; border-bottom: 1px solid rgba(0,82,255,.08); white-space: nowrap; }
    .tabla td { padding: 10px 12px; text-align: center; border-bottom: 1px solid rgba(0,82,255,.04); }
    .barrio-cell { text-align: left; }
    .barrio-cell small { color: #94A3B8; }
    .precio-cell { font-weight: 700; color: #0F172A; }
    .score-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin: auto; }
    .dot-green { background: rgba(16,185,129,.15); color: #059669; }
    .dot-blue { background: rgba(0,82,255,.1); color: #0052FF; }
    .dot-yellow { background: rgba(245,158,11,.1); color: #D97706; }
    .dot-red { background: rgba(225,29,72,.1); color: #E11D48; }
  `]
})
export class BarriosComponent {
  filtroActivo = signal<string>('scoreTotal');
  precioMax = signal(8000);
  perfilActivo = signal('Todos');

  filtros = [
    { key: 'scoreTotal', icon: '⭐', label: 'Score total' },
    { key: 'transporte', icon: '🚇', label: 'Transporte' },
    { key: 'seguridad', icon: '🔒', label: 'Seguridad' },
    { key: 'precio', icon: '💰', label: 'Precio' },
    { key: 'rentabilidad', icon: '📈', label: 'Inversión' },
  ];

  perfiles = ['Todos', 'Familias', 'Jóvenes', 'Inversores', 'Lujo'];

  private todosBarrios: Barrio[] = [
    {
      nombre: 'Malasaña', distrito: 'Centro', ciudad: 'madrid',
      scoreTotal: 8.4,
      scores: { transporte: 9, seguridad: 7, colegios: 7, comercios: 10, parques: 5, restaurantes: 10, ruido: 4, precio: 6 },
      precioM2: 5200, precioM2Alquiler: 20, rentabilidadBruta: 4.6,
      tendencia: 'subiendo',
      perfil: ['Jóvenes', 'Inversores'],
      tags: ['Muy céntrico', 'Vida nocturna', 'Vintage', 'Turístico'],
      aiInsight: 'Zona premium con alta demanda de alquiler turístico. Rentabilidad sostenida y apreciación constante. Ideal para inversión en pisos pequeños.',
    },
    {
      nombre: 'Chamberí', distrito: 'Chamberí', ciudad: 'madrid',
      scoreTotal: 9.1,
      scores: { transporte: 10, seguridad: 9, colegios: 9, comercios: 9, parques: 7, restaurantes: 9, ruido: 7, precio: 5 },
      precioM2: 6800, precioM2Alquiler: 22, rentabilidadBruta: 3.9,
      tendencia: 'subiendo',
      perfil: ['Familias', 'Lujo'],
      tags: ['Residencial premium', 'Excelentes colegios', 'Muy tranquilo'],
      aiInsight: 'El barrio más equilibrado de Madrid. Máxima puntuación en seguridad y colegios. Preferido por familias con alto poder adquisitivo. Precios altos pero mercado muy estable.',
    },
    {
      nombre: 'Vallecas', distrito: 'Puente de Vallecas', ciudad: 'madrid',
      scoreTotal: 6.8,
      scores: { transporte: 8, seguridad: 6, colegios: 7, comercios: 7, parques: 6, restaurantes: 6, ruido: 7, precio: 9 },
      precioM2: 2400, precioM2Alquiler: 11, rentabilidadBruta: 5.5,
      tendencia: 'subiendo',
      perfil: ['Jóvenes', 'Inversores', 'Familias'],
      tags: ['Precio asequible', 'Alta rentabilidad', 'En regeneración'],
      aiInsight: 'Zona con el mejor binomio precio-rentabilidad de Madrid. El metro ofrece excelente conectividad. Proceso de gentrificación en marcha que augura apreciación en 5-10 años.',
    },
    {
      nombre: 'Salamanca', distrito: 'Salamanca', ciudad: 'madrid',
      scoreTotal: 9.0,
      scores: { transporte: 9, seguridad: 10, colegios: 10, comercios: 10, parques: 6, restaurantes: 10, ruido: 6, precio: 2 },
      precioM2: 9500, precioM2Alquiler: 28, rentabilidadBruta: 3.5,
      tendencia: 'estable',
      perfil: ['Lujo', 'Familias'],
      tags: ['Lujo', 'Serrano', 'Máxima seguridad', 'Embajadas'],
      aiInsight: 'El distrito más exclusivo de Madrid. Precios record pero mercado con muy poca oferta. Ideal para preservar patrimonio a largo plazo. No es la mejor opción en rentabilidad por alquiler.',
    },
    {
      nombre: 'Lavapiés', distrito: 'Centro', ciudad: 'madrid',
      scoreTotal: 7.2,
      scores: { transporte: 9, seguridad: 6, colegios: 6, comercios: 8, parques: 5, restaurantes: 9, ruido: 5, precio: 8 },
      precioM2: 4200, precioM2Alquiler: 17, rentabilidadBruta: 4.9,
      tendencia: 'subiendo',
      perfil: ['Jóvenes', 'Inversores'],
      tags: ['Multicultural', 'Artístico', 'Céntrico', 'Gastronómico'],
      aiInsight: 'Barrio en fuerte transformación. El Mercado de Lavapiés y la escena artística han impulsado precios. Alta demanda de alquiler turístico. Riesgo: tensión regulatoria en alquiler vacacional.',
    },
    {
      nombre: 'Hortaleza', distrito: 'Hortaleza', ciudad: 'madrid',
      scoreTotal: 7.8,
      scores: { transporte: 7, seguridad: 9, colegios: 9, comercios: 7, parques: 8, restaurantes: 6, ruido: 9, precio: 8 },
      precioM2: 3200, precioM2Alquiler: 14, rentabilidadBruta: 5.3,
      tendencia: 'subiendo',
      perfil: ['Familias', 'Inversores'],
      tags: ['Tranquilo', 'Buenas escuelas', 'Parques', 'Precio moderado'],
      aiInsight: 'Distrito favorito para familias con presupuesto moderado. Excelentes colegios concertados, parques y zonas deportivas. El aeropuerto está cerca pero no genera molestias. Gran calidad de vida.',
    },
    {
      nombre: 'Retiro', distrito: 'Retiro', ciudad: 'madrid',
      scoreTotal: 8.9,
      scores: { transporte: 9, seguridad: 9, colegios: 8, comercios: 8, parques: 10, restaurantes: 8, ruido: 8, precio: 4 },
      precioM2: 7200, precioM2Alquiler: 24, rentabilidadBruta: 4.0,
      tendencia: 'estable',
      perfil: ['Familias', 'Lujo'],
      tags: ['Parque del Retiro', 'Premium', 'Cultural', 'Museos'],
      aiInsight: 'Vivir junto al parque más famoso de Madrid tiene un precio. Zona muy consolidada con poca rotación. Alta calidad de vida y excelente acceso a museos y cultura.',
    },
    {
      nombre: 'Carabanchel', distrito: 'Carabanchel', ciudad: 'madrid',
      scoreTotal: 6.5,
      scores: { transporte: 8, seguridad: 6, colegios: 7, comercios: 7, parques: 6, restaurantes: 5, ruido: 7, precio: 9 },
      precioM2: 2100, precioM2Alquiler: 10, rentabilidadBruta: 5.7,
      tendencia: 'subiendo',
      perfil: ['Jóvenes', 'Inversores'],
      tags: ['Más económico', 'Oportunidad', 'Metro directo'],
      aiInsight: 'El barrio con mayor potencial de revalorización en Madrid. Conexión directa en metro a Ópera en 12 minutos. Inversores están comprando masivamente en esta zona.',
    },
  ];

  barriosFiltrados = computed(() => {
    let lista = [...this.todosBarrios].filter(b => b.precioM2 <= this.precioMax());

    if (this.perfilActivo() !== 'Todos') {
      lista = lista.filter(b => b.perfil.includes(this.perfilActivo()));
    }

    lista.sort((a, b) => {
      const f = this.filtroActivo();
      if (f === 'scoreTotal') return b.scoreTotal - a.scoreTotal;
      if (f === 'rentabilidad') return b.rentabilidadBruta - a.rentabilidadBruta;
      if (f === 'precio') return a.precioM2 - b.precioM2;
      if (f === 'transporte') return b.scores.transporte - a.scores.transporte;
      if (f === 'seguridad') return b.scores.seguridad - a.scores.seguridad;
      return b.scoreTotal - a.scoreTotal;
    });

    return lista;
  });

  barrioTop = computed((): Barrio | undefined => this.barriosFiltrados()[0]);

  getScoreItems(b: Barrio) {
    return [
      { icon: '🚇', valor: b.scores.transporte },
      { icon: '🔒', valor: b.scores.seguridad },
      { icon: '🏫', valor: b.scores.colegios },
      { icon: '🛍️', valor: b.scores.comercios },
      { icon: '🌳', valor: b.scores.parques },
      { icon: '🍽️', valor: b.scores.restaurantes },
      { icon: '🔕', valor: b.scores.ruido },
      { icon: '💰', valor: b.scores.precio },
    ];
  }

  scoreClass(v: number): string {
    if (v >= 8) return 'score-dot dot-green';
    if (v >= 6) return 'score-dot dot-blue';
    if (v >= 4) return 'score-dot dot-yellow';
    return 'score-dot dot-red';
  }
}
