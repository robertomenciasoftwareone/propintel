import { Component, inject, AfterViewInit, OnDestroy, ElementRef, ViewChild, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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

type Vista = 'pins' | 'cp';

@Component({
  selector: 'app-mapa',
  standalone: true,
  template: `
    <div class="mapa-container">
      <div class="mapa-header">
        <h2>Mapa de Inmuebles</h2>
        <div class="header-center">
          <!-- Toggle de vista -->
          <div class="vista-toggle">
            <button [class.active]="vistaActiva() === 'pins'" (click)="setVista('pins')">
              Marcadores
            </button>
            <button [class.active]="vistaActiva() === 'cp'" (click)="setVista('cp')">
              Por C.Postal
            </button>
          </div>
          <!-- Toggle capa Catastro -->
          <button class="catastro-btn" [class.active]="catastroVisible()" (click)="toggleCatastro()">
            Parcelas Catastro
          </button>
        </div>
        <div class="counter">
          @if (!loading()) {
            @if (vistaActiva() === 'pins') { {{ totalPins() }} inmuebles }
            @else { {{ totalCp() }} códigos postales }
          }
        </div>
      </div>

      <!-- Leyenda dinámica según vista -->
      @if (vistaActiva() === 'pins') {
        <div class="legend">
          <span class="leg-item"><span class="dot oportunidad"></span>&lt; 0%</span>
          <span class="leg-item"><span class="dot neutro"></span>0–13%</span>
          <span class="leg-item"><span class="dot caro"></span>13–20%</span>
          <span class="leg-item"><span class="dot sobrevalorado"></span>&gt; 20%</span>
          <span class="leg-label">Gap asking/notarial</span>
        </div>
      } @else {
        <div class="legend">
          <span class="leg-item"><span class="dot cp-bajo"></span>&lt; 2.000 €/m²</span>
          <span class="leg-item"><span class="dot cp-medio"></span>2–3.5k</span>
          <span class="leg-item"><span class="dot cp-alto"></span>3.5–5k</span>
          <span class="leg-item"><span class="dot cp-lujo"></span>&gt; 5.000 €/m²</span>
          <span class="leg-label">Precio medio asking</span>
        </div>
      }

      <div #mapContainer class="map-wrap"></div>
      @if (loading()) {
        <div class="loading-overlay">
          <div class="spinner"></div>
          <span>Cargando datos…</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .mapa-container {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .mapa-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 8px;
      flex-shrink: 0;
      gap: 12px;
      flex-wrap: wrap;
    }
    .mapa-header h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
    .header-center {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .vista-toggle {
      display: flex;
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .vista-toggle button {
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background .15s, color .15s;
    }
    .vista-toggle button.active {
      background: rgba(232,197,71,0.12);
      color: var(--accent);
    }
    .catastro-btn {
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 7px;
      cursor: pointer;
      transition: background .15s, color .15s, border-color .15s;
    }
    .catastro-btn.active {
      color: #a78bfa;
      border-color: rgba(167,139,250,0.4);
      background: rgba(167,139,250,0.08);
    }
    .counter {
      font-size: 12px;
      color: var(--text-muted);
      background: var(--bg3);
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    .legend {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: var(--text-secondary);
      padding: 0 20px 8px;
      flex-shrink: 0;
    }
    .leg-label { color: var(--text-muted); margin-left: 4px; }
    .leg-item { display: flex; align-items: center; gap: 4px; }
    .dot {
      width: 9px; height: 9px; border-radius: 50%;
    }
    .dot.oportunidad   { background: #4fd1a5; }
    .dot.neutro        { background: #6ec1e4; }
    .dot.caro          { background: #e8c547; }
    .dot.sobrevalorado { background: #f87171; }
    .dot.cp-bajo       { background: #4fd1a5; }
    .dot.cp-medio      { background: #6ec1e4; }
    .dot.cp-alto       { background: #e8c547; }
    .dot.cp-lujo       { background: #f87171; }

    .map-wrap {
      flex: 1;
      border-radius: 12px;
      margin: 0 20px 20px;
      overflow: hidden;
      border: 1px solid var(--border);
      min-height: 400px;
    }
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(13, 15, 18, 0.7);
      color: var(--text-secondary);
      font-size: 13px;
      z-index: 1000;
    }
    .spinner {
      width: 28px; height: 28px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Cluster bubbles */
    :host ::ng-deep .marker-cluster { background: transparent !important; }
    :host ::ng-deep .marker-cluster div {
      background: rgba(232, 197, 71, 0.18) !important;
      border: 2px solid rgba(232, 197, 71, 0.5) !important;
      color: var(--text-primary) !important;
      font-family: 'DM Sans', sans-serif !important;
      font-weight: 600 !important; font-size: 13px !important;
      display: flex !important; align-items: center !important;
      justify-content: center !important; border-radius: 50% !important;
      box-shadow: 0 0 18px rgba(232,197,71,.2), 0 4px 12px rgba(0,0,0,.4) !important;
      backdrop-filter: blur(4px) !important;
      transition: transform .2s, box-shadow .2s !important;
    }
    :host ::ng-deep .marker-cluster:hover div {
      transform: scale(1.12) !important;
      box-shadow: 0 0 24px rgba(232,197,71,.35), 0 6px 20px rgba(0,0,0,.5) !important;
    }
    :host ::ng-deep .marker-cluster-small div  { width: 36px !important; height: 36px !important; }
    :host ::ng-deep .marker-cluster-medium div { width: 44px !important; height: 44px !important; font-size: 14px !important; background: rgba(232,197,71,.22) !important; border-color: rgba(232,197,71,.6) !important; }
    :host ::ng-deep .marker-cluster-large div  { width: 54px !important; height: 54px !important; font-size: 15px !important; background: rgba(232,197,71,.28) !important; border-color: rgba(232,197,71,.7) !important; }

    /* Popup */
    :host ::ng-deep .leaflet-popup-content-wrapper {
      background: var(--bg3); color: var(--text-primary);
      border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,.5);
      border: 1px solid var(--border-bright);
    }
    :host ::ng-deep .leaflet-popup-tip { background: var(--bg3); }
    :host ::ng-deep .leaflet-popup-content { margin: 12px 14px; font-size: 12.5px; line-height: 1.6; }
    :host ::ng-deep .popup-gap { font-weight: 600; font-size: 13px; }
    :host ::ng-deep .popup-gap.neg  { color: #4fd1a5; }
    :host ::ng-deep .popup-gap.low  { color: #6ec1e4; }
    :host ::ng-deep .popup-gap.med  { color: #e8c547; }
    :host ::ng-deep .popup-gap.high { color: #f87171; }
    :host ::ng-deep .popup-btn {
      display: inline-block; margin-top: 6px; padding: 5px 12px;
      border-radius: 6px; background: rgba(232,197,71,.12);
      color: var(--accent); font-size: 11px; font-weight: 500;
      cursor: pointer; border: 1px solid rgba(232,197,71,.2);
      transition: background .15s;
    }
    :host ::ng-deep .popup-btn:hover { background: rgba(232,197,71,.22); }

    /* Controls */
    :host ::ng-deep .leaflet-control-attribution {
      background: rgba(13,15,18,.7) !important;
      color: var(--text-muted) !important; font-size: 10px !important;
    }
    :host ::ng-deep .leaflet-control-attribution a { color: var(--text-secondary) !important; }
    :host ::ng-deep .leaflet-control-zoom a {
      background: var(--bg3) !important; color: var(--text-primary) !important;
      border-color: var(--border) !important;
    }
    :host ::ng-deep .leaflet-control-zoom a:hover { background: var(--bg2) !important; }
  `]
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private http   = inject(HttpClient);
  private router = inject(Router);
  private map: any = null;
  private L: any = null;
  private clusterGroup: any = null;
  private cpLayer: any = null;
  private catastroLayer: any = null;

  readonly loading        = signal(true);
  readonly totalPins      = signal(0);
  readonly totalCp        = signal(0);
  readonly vistaActiva    = signal<Vista>('pins');
  readonly catastroVisible = signal(false);

  private readonly headers = { 'X-Api-Key': environment.apiKey };
  private readonly cities  = ['madrid', 'barcelona', 'asturias', 'valencia', 'sevilla'];

  async ngAfterViewInit(): Promise<void> {
    await this.initMap();
    this.loadPins();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  setVista(v: Vista): void {
    if (this.vistaActiva() === v) return;
    this.vistaActiva.set(v);
    if (v === 'pins') {
      this.cpLayer && this.map.removeLayer(this.cpLayer);
      this.cpLayer = null;
      this.map.addLayer(this.clusterGroup);
    } else {
      this.map.removeLayer(this.clusterGroup);
      this.loadCapaCP();
    }
  }

  toggleCatastro(): void {
    if (!this.L) return;
    if (this.catastroVisible()) {
      this.catastroLayer && this.map.removeLayer(this.catastroLayer);
      this.catastroLayer = null;
      this.catastroVisible.set(false);
    } else {
      this.catastroLayer = this.L.tileLayer.wms(
        'https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx',
        {
          layers: 'Catastro',
          format: 'image/png',
          transparent: true,
          version: '1.1.1',
          attribution: '© Dirección General del Catastro',
          opacity: 0.65,
        } as any
      );
      this.catastroLayer.addTo(this.map);
      this.catastroVisible.set(true);
      if (this.map.getZoom() < 14) this.map.setZoom(14);
    }
  }

  private async initMap(): Promise<void> {
    const leafletModule = await import('leaflet');
    const L = (leafletModule as any).default ?? leafletModule;
    (window as any)['L'] = L; // el plugin necesita window.L
    await import('leaflet.markercluster' as any);
    this.L = L;

    const container = this.mapContainer.nativeElement;
    (container as any)._leaflet_id = undefined;

    this.map = L.map(container, {
      center: [40.4168, -3.7038],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    // Stadia Alidade Dark — oscuro con iconos de metro/bus/cercanías visibles
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://osm.org/copyright">OSM</a>',
      maxZoom: 20,
    }).addTo(this.map);

    // markerCluster es opcional — si no está disponible usamos layerGroup normal
    if (typeof (L as any).markerClusterGroup === 'function') {
      this.clusterGroup = (L as any).markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        animate: true,
        animateAddingMarkers: false,
        disableClusteringAtZoom: 16,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const size = count >= 20 ? 'large' : count >= 8 ? 'medium' : 'small';
          return L.divIcon({
            html: `<div>${count}</div>`,
            className: `marker-cluster marker-cluster-${size}`,
            iconSize: L.point(44, 44),
          });
        },
      });
    } else {
      this.clusterGroup = L.layerGroup();
    }
    this.map.addLayer(this.clusterGroup);
  }

  // ─── VISTA PINS ──────────────────────────────────────────────────────────

  private loadPins(): void {
    this.loading.set(true);
    let pending = this.cities.length;
    const allPins: AnuncioMapa[] = [];

    for (const city of this.cities) {
      const url = `${environment.apiUrl}/ciudades/${city}/mapa`;
      this.http.get<AnuncioMapa[]>(url, { headers: this.headers }).subscribe({
        next: (pins) => {
          allPins.push(...pins);
          if (--pending === 0) this.renderPins(allPins);
        },
        error: () => { if (--pending === 0) this.renderPins(allPins); },
      });
    }
  }

  private renderPins(pins: AnuncioMapa[]): void {
    const L = this.L;
    this.loading.set(false);
    this.totalPins.set(pins.length);
    if (!pins.length || !L) return;

    if (typeof this.clusterGroup.clearLayers === 'function') {
      this.clusterGroup.clearLayers();
    }
    const bounds = L.latLngBounds([]);
    const markers: any[] = [];

    for (const p of pins) {
      if (!p.lat || !p.lon) continue;
      const color  = this.gapColor(p.gapPct);
      const latlng = L.latLng(p.lat, p.lon);
      bounds.extend(latlng);

      const marker = L.circleMarker(latlng, {
        radius: this.pinRadius(p.gapPct),
        fillColor: color, fillOpacity: 0.85,
        color, weight: 1.5, opacity: 0.5,
      });

      const gapClass = p.gapPct < 0 ? 'neg' : p.gapPct < 13 ? 'low' : p.gapPct < 20 ? 'med' : 'high';
      const titulo   = p.titulo ?? `${p.tipoInmueble ?? 'Inmueble'} en ${p.zona}`;
      const m2Label  = p.superficieM2 ? `${p.superficieM2} m²` : '—';
      const habLabel = p.habitaciones ? `${p.habitaciones} hab` : '';
      const meta     = [m2Label, habLabel].filter(Boolean).join(' · ');

      marker.bindPopup(`
        <div style="min-width:180px">
          <strong>${this.escapeHtml(titulo)}</strong><br>
          <span style="color:var(--text-secondary)">${p.zona} · ${p.fuente}</span><br>
          <span style="color:var(--text-secondary)">${meta}</span><br>
          <div style="margin:6px 0">
            <span style="color:var(--text-secondary)">Precio:</span>
            <strong>${this.fmt(p.precioTotal)} €</strong>
            <span style="color:var(--text-muted)"> · ${Math.round(p.precioM2)} €/m²</span><br>
            <span style="color:var(--text-secondary)">Notarial:</span> ${Math.round(p.notarialM2)} €/m²<br>
            <span class="popup-gap ${gapClass}">Gap: ${p.gapPct > 0 ? '+' : ''}${p.gapPct}%</span>
          </div>
          <span class="popup-btn" data-id="${p.id}">Ver ficha →</span>
        </div>
      `, { closeButton: false, maxWidth: 260 });

      marker.on('popupopen', () => {
        setTimeout(() => {
          document.querySelector(`.popup-btn[data-id="${p.id}"]`)
            ?.addEventListener('click', () => this.router.navigate(['/ficha', p.id]));
        });
      });

      markers.push(marker);
    }

    if (typeof this.clusterGroup.addLayers === 'function') {
      this.clusterGroup.addLayers(markers);
    } else {
      markers.forEach(m => this.clusterGroup.addLayer(m));
    }
    if (bounds.isValid()) this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    setTimeout(() => this.map.invalidateSize(), 100);
  }

  // ─── VISTA CP ─────────────────────────────────────────────────────────────

  private loadCapaCP(): void {
    this.loading.set(true);
    const allCp: PrecioCP[] = [];
    let pending = this.cities.length;

    for (const city of this.cities) {
      const url = `${environment.apiUrl}/mapa/cp?ciudad=${city}`;
      this.http.get<PrecioCP[]>(url, { headers: this.headers }).subscribe({
        next: (data) => {
          allCp.push(...data);
          if (--pending === 0) this.renderCapaCP(allCp);
        },
        error: () => { if (--pending === 0) this.renderCapaCP(allCp); },
      });
    }
  }

  private renderCapaCP(datos: PrecioCP[]): void {
    const L = this.L;
    this.loading.set(false);
    this.totalCp.set(datos.length);
    if (!L) return;

    this.cpLayer && this.map.removeLayer(this.cpLayer);
    this.cpLayer = L.layerGroup();

    const bounds = L.latLngBounds([]);

    for (const cp of datos) {
      if (!cp.lat || !cp.lon) continue;
      const latlng = L.latLng(cp.lat, cp.lon);
      bounds.extend(latlng);

      const color  = this.cpColor(cp.precioM2);
      const radius = this.cpRadius(cp.numAnuncios);

      const marker = L.circleMarker(latlng, {
        radius,
        fillColor: color, fillOpacity: 0.75,
        color, weight: 1.5, opacity: 0.6,
      });

      const gapStr = cp.gapPct != null
        ? `<br><span style="color:var(--text-secondary)">Gap:</span> ${cp.gapPct > 0 ? '+' : ''}${cp.gapPct}%`
        : '';
      const nombre = cp.nombre ? `<span style="color:var(--text-muted)">${cp.nombre}</span><br>` : '';

      marker.bindPopup(`
        <div style="min-width:160px">
          <strong>CP ${cp.cp}</strong><br>
          ${nombre}
          <span style="color:var(--text-secondary)">Precio medio:</span>
          <strong>${this.fmt(cp.precioM2)} €/m²</strong><br>
          <span style="color:var(--text-secondary)">Anuncios activos:</span> ${cp.numAnuncios}
          ${gapStr}
        </div>
      `, { closeButton: false, maxWidth: 220 });

      this.cpLayer.addLayer(marker);
    }

    this.cpLayer.addTo(this.map);
    if (bounds.isValid()) this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    setTimeout(() => this.map.invalidateSize(), 100);
  }

  private cpColor(precioM2: number): string {
    if (precioM2 < 2000)  return '#4fd1a5';
    if (precioM2 < 3500)  return '#6ec1e4';
    if (precioM2 < 5000)  return '#e8c547';
    return '#f87171';
  }

  private cpRadius(n: number): number {
    if (n >= 50) return 14;
    if (n >= 20) return 11;
    if (n >= 5)  return 8;
    return 6;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private gapColor(gap: number): string {
    if (gap < 0)  return '#4fd1a5';
    if (gap < 13) return '#6ec1e4';
    if (gap < 20) return '#e8c547';
    return '#f87171';
  }

  private pinRadius(gap: number): number {
    const abs = Math.abs(gap);
    return abs > 25 ? 10 : abs > 15 ? 8 : 6;
  }

  private fmt(n: number): string {
    return n.toLocaleString('es-ES');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
