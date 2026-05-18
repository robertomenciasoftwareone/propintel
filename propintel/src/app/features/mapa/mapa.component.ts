import {
  Component, inject, AfterViewInit, OnDestroy, ElementRef,
  ViewChild, signal, computed
} from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface AnuncioMapa {
  id: number; zona: string; lat: number; lon: number;
  precioTotal: number; precioM2: number; notarialM2: number; gapPct: number;
  superficieM2: number | null; tipoInmueble: string | null;
  habitaciones: number | null; fuente: string; url: string; titulo: string | null;
}

interface PrecioCP {
  cp: string; lat: number | null; lon: number | null;
  precioM2: number; numAnuncios: number; gapPct: number | null; nombre: string | null;
}

interface GeoResult { place_name: string; center: [number, number]; }

type Vista = 'pins' | 'cp';

const MAPTILER_KEY = '0ONivd6VfHWkfYnnsxcJ';
const PIN_LAYERS   = ['pins-glow', 'pins', 'clusters', 'cluster-count', 'cluster-halo'];

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [DecimalPipe, TitleCasePipe, FormsModule, RouterLink],
  template: `
<div class="shell">

  <!-- ── SIDEBAR ── -->
  <aside class="sidebar">

    <!-- Logo / back -->
    <div class="sidebar-head">
      <a routerLink="/dashboard" class="back-link">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Dashboard
      </a>
      <div class="sb-title">Mapa PropIntel</div>
    </div>

    <!-- Geocoder -->
    <div class="geocoder">
      <div class="geo-input-wrap">
        <svg class="geo-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          class="geo-input"
          [(ngModel)]="searchQuery"
          (input)="onSearchInput()"
          (keydown.escape)="geoResults = []"
          placeholder="Busca dirección o zona..."
          autocomplete="off" />
        @if (searchQuery) {
          <button class="geo-clear" (click)="searchQuery=''; geoResults=[]">✕</button>
        }
      </div>
      @if (geoResults.length > 0) {
        <div class="geo-dropdown">
          @for (r of geoResults; track r.place_name) {
            <button class="geo-item" (click)="flyToResult(r)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ r.place_name }}
            </button>
          }
        </div>
      }
    </div>

    <!-- Stats -->
    @if (stats(); as s) {
      <div class="stats-bar">
        <div class="stat-block">
          <div class="stat-num">{{ s.total | number }}</div>
          <div class="stat-lbl">inmuebles</div>
        </div>
        <div class="stat-sep"></div>
        <div class="stat-block">
          <div class="stat-num">{{ s.precioMedio | number:'1.0-0' }}</div>
          <div class="stat-lbl">€/m² medio</div>
        </div>
        <div class="stat-sep"></div>
        <div class="stat-block">
          <div class="stat-num" [style.color]="gapColor(s.gapMedio)">
            {{ s.gapMedio > 0 ? '+' : '' }}{{ s.gapMedio }}%
          </div>
          <div class="stat-lbl">gap medio</div>
        </div>
      </div>
    }

    <!-- Filters -->
    <div class="filters">
      <select class="filter-sel" [(ngModel)]="filtroHab" (change)="applyFilters()">
        <option value="">🛏 Habitaciones</option>
        <option value="1">1 o más</option>
        <option value="2">2 o más</option>
        <option value="3">3 o más</option>
        <option value="4">4 o más</option>
      </select>
      <select class="filter-sel" [(ngModel)]="filtroFuente" (change)="applyFilters()">
        <option value="">📡 Fuente</option>
        <option value="idealista">Idealista</option>
        <option value="fotocasa">Fotocasa</option>
      </select>
      <select class="filter-sel" [(ngModel)]="filtroPrecioMax" (change)="applyFilters()">
        <option value="">💶 Precio máx.</option>
        <option value="150000">150 k</option>
        <option value="250000">250 k</option>
        <option value="400000">400 k</option>
        <option value="600000">600 k</option>
      </select>
    </div>

    <!-- Cards list -->
    <div class="cards-list">
      @if (loading()) {
        <div class="sb-loading">
          <div class="spinner"></div>
          <span>Cargando datos…</span>
        </div>
      } @else {
        <div class="list-header">
          <span>{{ sidebarCards().length }} resultados</span>
          <span class="list-hint">· precio ascendente</span>
        </div>
        @for (p of sidebarCards(); track p.id) {
          <div class="pin-card"
               [class.highlighted]="hoveredId() === p.id"
               (click)="flyToPin(p)"
               (mouseenter)="hoveredId.set(p.id)"
               (mouseleave)="hoveredId.set(null)">
            <div class="pc-gap-strip" [style.background]="gapColor(p.gapPct)"></div>
            <div class="pc-body">
              <div class="pc-titulo">{{ p.titulo ?? ((p.tipoInmueble | titlecase) ?? 'Piso') + ' · ' + p.zona }}</div>
              <div class="pc-meta">
                @if (p.habitaciones) { <span>🛏 {{ p.habitaciones }}h</span> }
                @if (p.superficieM2) { <span>{{ p.superficieM2 | number:'1.0-0' }} m²</span> }
                <span class="pc-fuente">{{ p.fuente }}</span>
              </div>
            </div>
            <div class="pc-right">
              @if (p.precioTotal > 0) {
                <div class="pc-precio">{{ p.precioTotal | number:'1.0-0' }} €</div>
              }
              <div class="pc-m2">{{ p.precioM2 | number:'1.0-0' }} €/m²</div>
              <div class="pc-gap" [style.color]="gapColor(p.gapPct)">
                {{ p.gapPct > 0 ? '+' : '' }}{{ p.gapPct }}%
              </div>
            </div>
          </div>
        }
        @if (sidebarCards().length === 0) {
          <div class="sb-empty">Sin resultados con estos filtros</div>
        }
      }
    </div>
  </aside>

  <!-- ── MAP AREA ── -->
  <div class="map-area">
    <div #mapContainer class="map-canvas"></div>

    <!-- Floating controls top-left -->
    <div class="float-top-left">
      <div class="view-toggle">
        <button [class.active]="vistaActiva() === 'pins'" (click)="setVista('pins')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
          Inmuebles
        </button>
        <button [class.active]="vistaActiva() === 'cp'" (click)="setVista('cp')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
          Por zona
        </button>
      </div>
    </div>

    <!-- Floating layer buttons top-right -->
    <div class="float-top-right">
      <button class="layer-btn" [class.active]="catastroVisible()" (click)="toggleCatastro()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        Catastro
      </button>
      <button class="layer-btn" [class.active]="metroVisible()" (click)="toggleMetro()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM3 20l2-3h14l2 3H3z"/></svg>
        Metro
      </button>
    </div>

    <!-- Legend -->
    @if (vistaActiva() === 'pins') {
      <div class="float-legend">
        <div class="leg-item"><span class="leg-dot" style="background:#4fd1a5"></span>Oportunidad &lt; 0%</div>
        <div class="leg-item"><span class="leg-dot" style="background:#6ec1e4"></span>Neutral 0–13%</div>
        <div class="leg-item"><span class="leg-dot" style="background:#e8c547"></span>Caro 13–20%</div>
        <div class="leg-item"><span class="leg-dot" style="background:#f87171"></span>Sobrevalorado &gt; 20%</div>
      </div>
    } @else {
      <div class="float-legend">
        <div class="leg-item"><span class="leg-dot" style="background:#4fd1a5"></span>&lt; 2.000 €/m²</div>
        <div class="leg-item"><span class="leg-dot" style="background:#6ec1e4"></span>2–3.5 k</div>
        <div class="leg-item"><span class="leg-dot" style="background:#e8c547"></span>3.5–5 k</div>
        <div class="leg-item"><span class="leg-dot" style="background:#f87171"></span>&gt; 5.000 €/m²</div>
      </div>
    }

    <!-- Map loading overlay -->
    @if (loading()) {
      <div class="map-loading">
        <div class="spinner accent-spinner"></div>
      </div>
    }
  </div>

</div>
  `,
  styles: [`
    /* ─── SHELL ─── */
    :host { display:flex; height:100%; overflow:hidden; }
    .shell {
      display:grid; grid-template-columns:340px 1fr;
      width:100%; height:100%; overflow:hidden;
    }

    /* ─── SIDEBAR ─── */
    .sidebar {
      display:flex; flex-direction:column; overflow:hidden;
      background:var(--bg2); border-right:1px solid var(--border);
      height:100%;
    }
    .sidebar-head {
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 16px 12px; border-bottom:1px solid var(--border); flex-shrink:0;
    }
    .back-link {
      display:flex; align-items:center; gap:6px; font-size:12px;
      color:var(--text-muted); text-decoration:none; transition:color .15s;
    }
    .back-link:hover { color:var(--text-secondary); }
    .sb-title { font-size:13px; font-weight:600; color:var(--text-primary); }

    /* Geocoder */
    .geocoder { padding:12px 12px 0; flex-shrink:0; position:relative; }
    .geo-input-wrap {
      display:flex; align-items:center; gap:8px;
      background:var(--bg3); border:1.5px solid var(--border);
      border-radius:10px; padding:9px 12px; transition:border-color .2s;
    }
    .geo-input-wrap:focus-within { border-color:rgba(232,197,71,0.5); }
    .geo-icon { color:var(--text-muted); flex-shrink:0; }
    .geo-input {
      flex:1; background:none; border:none; outline:none;
      font-size:13px; color:var(--text-primary); font-family:inherit;
    }
    .geo-input::placeholder { color:var(--text-muted); }
    .geo-clear {
      background:none; border:none; color:var(--text-muted);
      cursor:pointer; font-size:11px; padding:0; transition:color .15s;
    }
    .geo-clear:hover { color:var(--text-secondary); }
    .geo-dropdown {
      position:absolute; top:calc(100% + 4px); left:12px; right:12px; z-index:100;
      background:var(--bg3); border:1px solid var(--border-bright);
      border-radius:10px; overflow:hidden;
      box-shadow:0 8px 24px rgba(0,0,0,.4);
    }
    .geo-item {
      display:flex; align-items:flex-start; gap:8px; width:100%; text-align:left;
      padding:9px 12px; background:none; border:none; cursor:pointer;
      font-size:12px; color:var(--text-secondary); font-family:inherit;
      transition:background .15s; line-height:1.4; border-bottom:1px solid var(--border);
    }
    .geo-item:last-child { border-bottom:none; }
    .geo-item:hover { background:rgba(232,197,71,0.06); color:var(--text-primary); }
    .geo-item svg { flex-shrink:0; margin-top:1px; color:var(--text-muted); }

    /* Stats */
    .stats-bar {
      display:flex; align-items:center; gap:0;
      margin:12px 12px 0; background:var(--bg3);
      border:1px solid var(--border); border-radius:10px;
      overflow:hidden; flex-shrink:0;
    }
    .stat-block { flex:1; padding:10px 4px; text-align:center; }
    .stat-num { font-size:15px; font-weight:700; color:var(--text-primary); font-family:'DM Mono',monospace; }
    .stat-lbl { font-size:10px; color:var(--text-muted); margin-top:1px; }
    .stat-sep { width:1px; background:var(--border); height:32px; }

    /* Filters */
    .filters {
      display:flex; flex-direction:column; gap:6px;
      padding:10px 12px 0; flex-shrink:0;
    }
    .filter-sel {
      width:100%; background:var(--bg3); border:1px solid var(--border);
      border-radius:8px; padding:7px 10px; font-size:12px;
      color:var(--text-secondary); font-family:inherit; cursor:pointer;
      outline:none; transition:border-color .15s;
      appearance:none;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E");
      background-repeat:no-repeat; background-position:right 10px center;
      padding-right:28px;
    }
    .filter-sel:focus { border-color:rgba(232,197,71,0.4); }
    .filter-sel option { background:var(--bg3); }

    /* Cards */
    .cards-list {
      flex:1; overflow-y:auto; padding:10px 8px 12px;
      display:flex; flex-direction:column; gap:0;
    }
    .cards-list::-webkit-scrollbar { width:4px; }
    .cards-list::-webkit-scrollbar-track { background:transparent; }
    .cards-list::-webkit-scrollbar-thumb { background:var(--border-bright); border-radius:2px; }

    .list-header {
      font-size:10.5px; color:var(--text-muted); padding:4px 6px 8px;
      border-bottom:1px solid var(--border); margin-bottom:4px; flex-shrink:0;
    }
    .list-hint { color:var(--border-bright); }

    .pin-card {
      display:flex; align-items:stretch; gap:0; cursor:pointer;
      border-radius:8px; overflow:hidden; margin-bottom:4px;
      border:1px solid var(--border); background:var(--bg);
      transition:all .15s;
    }
    .pin-card:hover, .pin-card.highlighted {
      border-color:rgba(232,197,71,0.35);
      background:rgba(232,197,71,0.04);
      transform:translateX(2px);
    }
    .pc-gap-strip { width:3px; flex-shrink:0; }
    .pc-body { flex:1; padding:8px 10px; min-width:0; }
    .pc-titulo {
      font-size:12px; font-weight:500; color:var(--text-primary);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      line-height:1.4;
    }
    .pc-meta {
      display:flex; gap:6px; margin-top:3px;
      font-size:10.5px; color:var(--text-muted);
    }
    .pc-fuente {
      text-transform:capitalize; background:var(--bg3);
      padding:1px 5px; border-radius:4px; border:1px solid var(--border);
    }
    .pc-right {
      display:flex; flex-direction:column; align-items:flex-end;
      padding:8px 10px; justify-content:center; gap:2px; flex-shrink:0;
    }
    .pc-precio { font-size:12px; font-weight:700; color:var(--accent); font-family:'DM Mono',monospace; }
    .pc-m2 { font-size:10px; color:var(--text-muted); font-family:'DM Mono',monospace; }
    .pc-gap { font-size:11px; font-weight:600; }

    .sb-loading, .sb-empty {
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:10px; color:var(--text-muted); font-size:13px; padding:32px 0;
    }

    /* ─── MAP AREA ─── */
    .map-area { position:relative; overflow:hidden; }
    .map-canvas { width:100%; height:100%; }

    /* Floating controls */
    .float-top-left {
      position:absolute; top:14px; left:14px; z-index:10;
    }
    .view-toggle {
      display:flex; background:rgba(13,15,18,0.9);
      border:1px solid rgba(255,255,255,0.1); border-radius:10px;
      overflow:hidden; backdrop-filter:blur(8px);
    }
    .view-toggle button {
      display:flex; align-items:center; gap:6px;
      padding:8px 14px; background:none; border:none;
      font-size:12px; font-weight:500; color:rgba(255,255,255,0.55);
      cursor:pointer; font-family:inherit; transition:all .15s;
    }
    .view-toggle button.active {
      background:rgba(232,197,71,0.15); color:var(--accent);
    }
    .view-toggle button:not(:last-child) { border-right:1px solid rgba(255,255,255,0.08); }

    .float-top-right {
      position:absolute; top:14px; right:14px; z-index:10;
      display:flex; flex-direction:column; gap:6px;
    }
    .layer-btn {
      display:flex; align-items:center; gap:7px;
      padding:7px 12px; border-radius:9px; font-size:11.5px; font-weight:500;
      border:1px solid rgba(255,255,255,0.1); background:rgba(13,15,18,0.9);
      color:rgba(255,255,255,0.55); cursor:pointer; font-family:inherit;
      transition:all .15s; backdrop-filter:blur(8px); white-space:nowrap;
    }
    .layer-btn:hover { color:rgba(255,255,255,0.8); border-color:rgba(255,255,255,0.2); }
    .layer-btn.active { color:#a78bfa; border-color:rgba(167,139,250,0.45); background:rgba(167,139,250,0.12); }
    .layer-btn.active + .layer-btn { }

    /* Metro active override */
    .layer-btn[class*="active"]:last-child { color:#6ea8fe; border-color:rgba(110,168,254,0.45); background:rgba(110,168,254,0.1); }

    /* Legend */
    .float-legend {
      position:absolute; bottom:28px; left:14px; z-index:10;
      background:rgba(13,15,18,0.88); border:1px solid rgba(255,255,255,0.1);
      border-radius:10px; padding:10px 14px; backdrop-filter:blur(8px);
      display:flex; flex-direction:column; gap:5px;
    }
    .leg-item { display:flex; align-items:center; gap:7px; font-size:11px; color:rgba(255,255,255,0.6); }
    .leg-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

    /* Map loading overlay */
    .map-loading {
      position:absolute; inset:0; z-index:20;
      display:flex; align-items:center; justify-content:center;
      background:rgba(7,12,28,0.5); backdrop-filter:blur(2px);
    }

    /* Spinners */
    .spinner {
      width:24px; height:24px; border:2px solid var(--border);
      border-top-color:var(--text-muted); border-radius:50%;
      animation:spin .8s linear infinite;
    }
    .accent-spinner { width:32px; height:32px; border-top-color:var(--accent); }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* MapLibre popup overrides */
    :host ::ng-deep .urbia-popup .maplibregl-popup-content {
      background:#141822; color:#e2e8f0;
      border:1px solid rgba(255,255,255,0.1); border-radius:12px;
      padding:14px 16px; box-shadow:0 12px 40px rgba(0,0,0,.6);
      font-family:'DM Sans',sans-serif; font-size:13px;
      min-width:200px;
    }
    :host ::ng-deep .urbia-popup .maplibregl-popup-tip { border-top-color:#141822; }
    :host ::ng-deep .urbia-popup .maplibregl-popup-tip-container { filter:drop-shadow(0 2px 4px rgba(0,0,0,.4)); }
    :host ::ng-deep .up-titulo {
      font-size:13.5px; font-weight:600; color:#f1f5f9;
      margin-bottom:2px; line-height:1.4;
    }
    :host ::ng-deep .up-zona { font-size:11px; color:rgba(255,255,255,0.4); margin-bottom:8px; }
    :host ::ng-deep .up-meta { font-size:11px; color:rgba(255,255,255,0.4); margin-bottom:8px; }
    :host ::ng-deep .up-prices {
      border-top:1px solid rgba(255,255,255,0.08); padding-top:8px;
      display:flex; flex-direction:column; gap:4px;
    }
    :host ::ng-deep .up-price-row {
      display:flex; justify-content:space-between; align-items:center;
    }
    :host ::ng-deep .up-lbl { font-size:11px; color:rgba(255,255,255,0.4); }
    :host ::ng-deep .up-val { font-size:12px; font-weight:600; color:#f1f5f9; font-family:'DM Mono',monospace; }
    :host ::ng-deep .up-gap { font-size:13px; font-weight:700; margin-top:4px; }
    :host ::ng-deep .up-cta {
      margin-top:8px; font-size:10.5px; color:rgba(232,197,71,0.65);
      border-top:1px solid rgba(255,255,255,0.06); padding-top:6px;
    }

    /* MapLibre controls dark overrides */
    :host ::ng-deep .maplibregl-ctrl-group {
      background:rgba(13,15,18,0.9) !important;
      border:1px solid rgba(255,255,255,0.1) !important;
      box-shadow:0 4px 16px rgba(0,0,0,.4) !important;
      border-radius:10px !important; overflow:hidden !important;
      backdrop-filter:blur(8px) !important;
    }
    :host ::ng-deep .maplibregl-ctrl-group button {
      background:transparent !important; color:rgba(255,255,255,0.6) !important;
      border-color:rgba(255,255,255,0.08) !important;
    }
    :host ::ng-deep .maplibregl-ctrl-group button:hover { background:rgba(255,255,255,0.06) !important; }
    :host ::ng-deep .maplibregl-ctrl-attrib {
      background:rgba(0,0,0,0.5) !important; color:rgba(255,255,255,0.4) !important;
      font-size:9px !important; border-radius:6px !important;
    }
    :host ::ng-deep .maplibregl-ctrl-attrib a { color:rgba(255,255,255,0.4) !important; }

    @media (max-width: 860px) {
      .shell { grid-template-columns:1fr; }
      .sidebar { display:none; }
    }
  `]
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private http   = inject(HttpClient);
  private router = inject(Router);

  private map: any = null;
  private maplibre: any = null;
  private popup: any = null;

  readonly loading         = signal(true);
  readonly vistaActiva     = signal<Vista>('pins');
  readonly catastroVisible = signal(false);
  readonly metroVisible    = signal(false);
  readonly hoveredId       = signal<number | null>(null);

  private allPins: AnuncioMapa[] = [];
  readonly filteredPins = signal<AnuncioMapa[]>([]);
  readonly sidebarCards = signal<AnuncioMapa[]>([]);

  readonly stats = computed(() => {
    const pins = this.filteredPins();
    if (!pins.length) return null;
    const total      = pins.length;
    const precioMedio = Math.round(pins.reduce((s, p) => s + p.precioM2, 0) / total);
    const gapMedio   = +(pins.reduce((s, p) => s + p.gapPct, 0) / total).toFixed(1);
    return { total, precioMedio, gapMedio };
  });

  filtroHab       = '';
  filtroFuente    = '';
  filtroPrecioMax = '';

  searchQuery = '';
  geoResults: GeoResult[] = [];
  private search$ = new Subject<string>();
  private readonly headers = { 'X-Api-Key': environment.apiKey };

  // ─── Init ──────────────────────────────────────────────────────────────────

  async ngAfterViewInit(): Promise<void> {
    this.search$.pipe(debounceTime(300)).subscribe(q => this.geocode(q));
    await this.initMap();
    this.loadPins();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.popup?.remove();
    this.search$.complete();
  }

  // ─── Geocoder ─────────────────────────────────────────────────────────────

  onSearchInput(): void { this.search$.next(this.searchQuery); }

  private async geocode(q: string): Promise<void> {
    if (q.length < 3) { this.geoResults = []; return; }
    try {
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?country=es&key=${MAPTILER_KEY}`;
      const res: any = await firstValueFrom(this.http.get(url));
      this.geoResults = (res.features ?? []).slice(0, 5).map((f: any) => ({
        place_name: f.place_name,
        center: f.center as [number, number],
      }));
    } catch { this.geoResults = []; }
  }

  flyToResult(r: GeoResult): void {
    this.map?.flyTo({ center: r.center, zoom: 14, duration: 1000, essential: true });
    this.searchQuery = r.place_name;
    this.geoResults  = [];
  }

  // ─── Map init ─────────────────────────────────────────────────────────────

  private async initMap(): Promise<void> {
    const ml = await import('maplibre-gl');
    this.maplibre = (ml as any).default ?? ml;
    const maplibregl = this.maplibre;

    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
      center: [-3.7038, 40.4168],
      zoom: 11,
      attributionControl: false,
      pitchWithRotate: false,
    });

    this.map.addControl(
      new maplibregl.AttributionControl({ compact: true }), 'bottom-right'
    );
    this.map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right'
    );

    await new Promise<void>(res => this.map.on('load', res));

    this.popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'urbia-popup',
      maxWidth: '290px',
      offset: 14,
    });

    this.setupPinInteractions();
  }

  private setupPinInteractions(): void {
    const map = this.map;

    map.on('mouseenter', 'pins', (e: any) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features[0];
      this.hoveredId.set(f.properties['id']);
      this.openPinPopup(f);
    });
    map.on('mouseleave', 'pins', () => {
      map.getCanvas().style.cursor = '';
      this.hoveredId.set(null);
      this.popup.remove();
    });
    map.on('click', 'pins', (e: any) => {
      this.router.navigate(['/ficha', e.features[0].properties['id']]);
    });

    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
    map.on('click', 'clusters', (e: any) => {
      const [f] = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const src  = map.getSource('pins') as any;
      src.getClusterExpansionZoom(f.properties['cluster_id'], (err: any, zoom: any) => {
        if (!err) map.easeTo({ center: (f.geometry as any).coordinates, zoom, duration: 450 });
      });
    });
  }

  private openPinPopup(f: any): void {
    const p       = f.properties as any;
    const gapHex  = this.gapColor(p['gapPct']);
    const titulo  = p['titulo'] || `${p['tipoInmueble'] || 'Inmueble'} · ${p['zona']}`;
    const meta    = [
      p['superficieM2'] ? `${p['superficieM2']} m²` : null,
      p['habitaciones'] ? `${p['habitaciones']} hab` : null,
    ].filter(Boolean).join(' · ');

    const precioHtml = p['precioTotal'] > 0
      ? `<span class="up-val">${this.fmt(p['precioTotal'])} €</span>`
      : `<span class="up-val">${this.fmt(p['precioM2'])} €/m²</span>`;

    this.popup
      .setLngLat((f.geometry as any).coordinates)
      .setHTML(`
        <div class="up-titulo">${this.esc(titulo)}</div>
        <div class="up-zona">${this.esc(p['zona'])} · ${this.esc(p['fuente'])}</div>
        ${meta ? `<div class="up-meta">${meta}</div>` : ''}
        <div class="up-prices">
          <div class="up-price-row">
            <span class="up-lbl">Precio</span>
            ${precioHtml}
          </div>
          <div class="up-price-row">
            <span class="up-lbl">Notarial</span>
            <span class="up-val">${this.fmt(p['notarialM2'])} €/m²</span>
          </div>
          <div class="up-gap" style="color:${gapHex}">
            Gap ${p['gapPct'] > 0 ? '+' : ''}${p['gapPct']}%
            <span style="font-weight:400;font-size:11px;color:rgba(255,255,255,0.45)">
              &nbsp;·&nbsp;${this.gapLabel(p['gapPct'])}
            </span>
          </div>
        </div>
        <div class="up-cta">Click para ver ficha completa →</div>
      `)
      .addTo(this.map);
  }

  // ─── Pins data ─────────────────────────────────────────────────────────────

  private async loadPins(): Promise<void> {
    this.loading.set(true);
    try {
      const pins = await firstValueFrom(
        this.http.get<AnuncioMapa[]>(`${environment.apiUrl}/ciudades/madrid/mapa`, {
          headers: this.headers,
        })
      );
      this.allPins = pins;
      this.applyFilters();
    } catch {
      this.loading.set(false);
    }
  }

  applyFilters(): void {
    let pins = [...this.allPins];
    if (this.filtroHab)       pins = pins.filter(p => p.habitaciones != null && p.habitaciones >= +this.filtroHab);
    if (this.filtroFuente)    pins = pins.filter(p => p.fuente === this.filtroFuente);
    if (this.filtroPrecioMax) pins = pins.filter(p => p.precioTotal > 0 && p.precioTotal <= +this.filtroPrecioMax);

    this.filteredPins.set(pins);
    this.sidebarCards.set([...pins].sort((a, b) => (a.precioTotal || a.precioM2) - (b.precioTotal || b.precioM2)).slice(0, 100));

    if (this.vistaActiva() === 'pins') this.updatePinsSource(pins);
  }

  private pinsToGeoJSON(pins: AnuncioMapa[]): any {
    return {
      type: 'FeatureCollection',
      features: pins
        .filter(p => p.lat && p.lon)
        .map(p => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: {
            id: p.id, zona: p.zona, fuente: p.fuente, titulo: p.titulo ?? '',
            precioTotal: p.precioTotal, precioM2: p.precioM2, notarialM2: p.notarialM2,
            gapPct: p.gapPct, superficieM2: p.superficieM2 ?? 0,
            tipoInmueble: p.tipoInmueble ?? 'piso', habitaciones: p.habitaciones ?? 0,
          },
        })),
    };
  }

  private updatePinsSource(pins: AnuncioMapa[]): void {
    if (!this.map) return;
    const geojson = this.pinsToGeoJSON(pins);
    const src = this.map.getSource('pins') as any;
    if (src) {
      src.setData(geojson);
    } else {
      this.addPinsLayers(geojson);
    }
    this.loading.set(false);
    if (pins.length) {
      const coords  = pins.filter(p => p.lat && p.lon).map(p => [p.lon, p.lat] as [number, number]);
      if (coords.length) {
        const lngs  = coords.map(c => c[0]);
        const lats  = coords.map(c => c[1]);
        this.map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 60, maxZoom: 13, duration: 800 }
        );
      }
    }
  }

  private addPinsLayers(geojson: any): void {
    const map = this.map;

    map.addSource('pins', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 15,
      clusterRadius: 55,
    });

    // Cluster halo glow
    map.addLayer({
      id: 'cluster-halo', type: 'circle', source: 'pins',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'rgba(232,197,71,0.12)',
        'circle-radius': ['step', ['get', 'point_count'], 32, 10, 42, 50, 55],
        'circle-stroke-width': 0,
      },
    });

    // Cluster circles
    map.addLayer({
      id: 'clusters', type: 'circle', source: 'pins',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], '#E8C547', 10, '#F59E0B', 50, '#F87171'],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 27, 50, 35],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.15)',
        'circle-opacity': 0.88,
      },
    });

    // Cluster labels
    map.addLayer({
      id: 'cluster-count', type: 'symbol', source: 'pins',
      filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 13 },
      paint: { 'text-color': '#0d0f12' },
    });

    // Pin outer glow
    map.addLayer({
      id: 'pins-glow', type: 'circle', source: 'pins',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['step', ['get', 'gapPct'], '#4fd1a5', 0, '#6ec1e4', 13, '#e8c547', 20, '#f87171'],
        'circle-radius': ['interpolate', ['linear'], ['get', 'precioM2'], 1000, 14, 10000, 18],
        'circle-opacity': 0.12,
        'circle-stroke-width': 0,
      },
    });

    // Individual pins
    map.addLayer({
      id: 'pins', type: 'circle', source: 'pins',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['step', ['get', 'gapPct'], '#4fd1a5', 0, '#6ec1e4', 13, '#e8c547', 20, '#f87171'],
        'circle-radius': ['interpolate', ['linear'], ['get', 'precioM2'], 1000, 5, 5000, 7, 10000, 9],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.35)',
        'circle-opacity': 0.92,
      },
    });
  }

  // ─── Vista CP ─────────────────────────────────────────────────────────────

  setVista(v: Vista): void {
    if (this.vistaActiva() === v) return;
    this.vistaActiva.set(v);
    if (v === 'pins') {
      this.removeCpLayers();
      this.updatePinsSource(this.filteredPins());
    } else {
      this.hideLayers(PIN_LAYERS);
      this.loadCapaCP();
    }
  }

  private hideLayers(ids: string[]): void {
    ids.forEach(id => {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', 'none');
    });
  }

  private showLayers(ids: string[]): void {
    ids.forEach(id => {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', 'visible');
    });
  }

  private removeCpLayers(): void {
    ['cp-glow', 'cp-circles'].forEach(id => {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    });
    if (this.map.getSource('cp')) this.map.removeSource('cp');
    this.showLayers(PIN_LAYERS);
    this.map.off('mouseenter', 'cp-circles', () => {});
    this.map.off('mouseleave', 'cp-circles', () => {});
  }

  private async loadCapaCP(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<PrecioCP[]>(`${environment.apiUrl}/mapa/cp?ciudad=madrid`, {
          headers: this.headers,
        })
      );
      this.renderCapaCP(data);
    } catch { this.loading.set(false); }
  }

  private renderCapaCP(datos: PrecioCP[]): void {
    this.loading.set(false);
    const geojson = {
      type: 'FeatureCollection',
      features: datos
        .filter(d => d.lat && d.lon)
        .map(d => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [d.lon!, d.lat!] },
          properties: {
            cp: d.cp, nombre: d.nombre ?? d.cp,
            precioM2: d.precioM2, numAnuncios: d.numAnuncios, gapPct: d.gapPct ?? 0,
          },
        })),
    };

    this.map.addSource('cp', { type: 'geojson', data: geojson });

    this.map.addLayer({
      id: 'cp-glow', type: 'circle', source: 'cp',
      paint: {
        'circle-color': ['step', ['get', 'precioM2'], '#4fd1a5', 2000, '#6ec1e4', 3500, '#e8c547', 5000, '#f87171'],
        'circle-radius': ['interpolate', ['linear'], ['get', 'numAnuncios'], 1, 20, 30, 34, 100, 46],
        'circle-opacity': 0.12, 'circle-stroke-width': 0,
      },
    });

    this.map.addLayer({
      id: 'cp-circles', type: 'circle', source: 'cp',
      paint: {
        'circle-color': ['step', ['get', 'precioM2'], '#4fd1a5', 2000, '#6ec1e4', 3500, '#e8c547', 5000, '#f87171'],
        'circle-radius': ['interpolate', ['linear'], ['get', 'numAnuncios'], 1, 12, 30, 20, 100, 28],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.25)',
        'circle-opacity': 0.88,
      },
    });

    this.map.on('mouseenter', 'cp-circles', (e: any) => {
      this.map.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties as any;
      const gapStr = p['gapPct']
        ? `<div class="up-price-row"><span class="up-lbl">Gap medio</span><span class="up-val" style="color:${this.gapColor(p['gapPct'])}">${p['gapPct'] > 0 ? '+' : ''}${p['gapPct']}%</span></div>`
        : '';
      this.popup
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML(`
          <div class="up-titulo">CP ${this.esc(p['cp'])}</div>
          <div class="up-zona">${this.esc(p['nombre'])}</div>
          <div class="up-prices">
            <div class="up-price-row">
              <span class="up-lbl">Precio medio</span>
              <span class="up-val">${this.fmt(p['precioM2'])} €/m²</span>
            </div>
            <div class="up-price-row">
              <span class="up-lbl">Anuncios activos</span>
              <span class="up-val">${p['numAnuncios']}</span>
            </div>
            ${gapStr}
          </div>
        `)
        .addTo(this.map);
    });
    this.map.on('mouseleave', 'cp-circles', () => {
      this.map.getCanvas().style.cursor = '';
      this.popup.remove();
    });
  }

  // ─── Catastro ─────────────────────────────────────────────────────────────

  toggleCatastro(): void {
    if (!this.map) return;
    if (this.catastroVisible()) {
      if (this.map.getLayer('catastro')) this.map.removeLayer('catastro');
      if (this.map.getSource('catastro')) this.map.removeSource('catastro');
      this.catastroVisible.set(false);
    } else {
      this.map.addSource('catastro', {
        type: 'raster',
        tiles: [
          'https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap' +
          '&LAYERS=Catastro&FORMAT=image%2Fpng&TRANSPARENT=TRUE&WIDTH=256&HEIGHT=256' +
          '&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}',
        ],
        tileSize: 256,
        attribution: '© Catastro',
      });
      this.map.addLayer({
        id: 'catastro', type: 'raster', source: 'catastro',
        paint: { 'raster-opacity': 0.65 },
      });
      this.catastroVisible.set(true);
      if (this.map.getZoom() < 14) this.map.flyTo({ zoom: 14, duration: 700 });
    }
  }

  // ─── Metro ────────────────────────────────────────────────────────────────

  async toggleMetro(): Promise<void> {
    if (!this.map) return;
    if (this.metroVisible()) {
      if (this.map.getLayer('metro-labels')) this.map.removeLayer('metro-labels');
      if (this.map.getLayer('metro'))        this.map.removeLayer('metro');
      if (this.map.getSource('metro'))       this.map.removeSource('metro');
      this.metroVisible.set(false);
      return;
    }

    const query = `[out:json][timeout:15];
      node["station"="subway"]["network"="Metro de Madrid"](40.30,-3.85,40.56,-3.55);
      out body;`;
    try {
      const data: any = await firstValueFrom(
        this.http.get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      );
      const geojson = {
        type: 'FeatureCollection',
        features: (data.elements ?? []).map((n: any) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [n.lon, n.lat] },
          properties: { name: n.tags?.name ?? 'Metro', lines: n.tags?.ref ?? '' },
        })),
      };

      this.map.addSource('metro', { type: 'geojson', data: geojson });
      this.map.addLayer({
        id: 'metro', type: 'circle', source: 'metro',
        paint: {
          'circle-color': '#003087',
          'circle-radius': 7,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.92,
        },
      });
      this.map.addLayer({
        id: 'metro-labels', type: 'symbol', source: 'metro',
        minzoom: 13,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
        },
        paint: { 'text-color': '#6ea8fe', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1 },
      });

      this.map.on('mouseenter', 'metro', (e: any) => {
        const p = e.features[0].properties as any;
        this.popup
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<div class="up-titulo" style="color:#6ea8fe">🚇 ${this.esc(p['name'])}</div>${p['lines'] ? `<div class="up-zona">Línea ${this.esc(p['lines'])}</div>` : ''}`)
          .addTo(this.map);
      });
      this.map.on('mouseleave', 'metro', () => { this.popup.remove(); });

      this.metroVisible.set(true);
    } catch { console.error('Error cargando metro'); }
  }

  // ─── Sidebar interactions ─────────────────────────────────────────────────

  flyToPin(pin: AnuncioMapa): void {
    if (!this.map || !pin.lat || !pin.lon) return;
    this.map.flyTo({ center: [pin.lon, pin.lat], zoom: 16, duration: 700, essential: true });
    setTimeout(() => {
      const features = this.map.queryRenderedFeatures(
        this.map.project([pin.lon, pin.lat]),
        { layers: ['pins'] }
      );
      if (features?.length) this.openPinPopup(features[0]);
    }, 800);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  gapColor(gap: number): string {
    if (gap < 0)  return '#4fd1a5';
    if (gap < 13) return '#6ec1e4';
    if (gap < 20) return '#e8c547';
    return '#f87171';
  }

  gapLabel(gap: number): string {
    if (gap < 0)  return 'Oportunidad';
    if (gap < 13) return 'Neutral';
    if (gap < 20) return 'Caro';
    return 'Sobrevalorado';
  }

  private fmt(n: number): string {
    return Math.round(n).toLocaleString('es-ES');
  }

  private esc(text: string): string {
    const d = document.createElement('div');
    d.textContent = String(text);
    return d.innerHTML;
  }
}
