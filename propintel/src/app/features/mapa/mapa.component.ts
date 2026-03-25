import { Component, inject, AfterViewInit, OnDestroy, ElementRef, ViewChild, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import type * as LeafletType from 'leaflet';

// Leaflet y markercluster se cargan como scripts globales (angular.json).
// Accedemos via window.L para que markerClusterGroup esté disponible.
const L = (window as any)['L'] as typeof LeafletType & { markerClusterGroup: any };

interface AnuncioMapa {
  id: number;
  zona: string;
  lat: number;
  lon: number;
  precioTotal: number;
  precioM2: number;
  notarialM2: number;
  gapPct: number;
  superficieM2: number | null;
  tipoInmueble: string | null;
  habitaciones: number | null;
  fuente: string;
  url: string;
  titulo: string | null;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  template: `
    <div class="mapa-container">
      <div class="mapa-header">
        <h2>Mapa de Inmuebles</h2>
        <div class="counter">
          @if (!loading()) {
            {{ totalPins() }} inmuebles
          }
        </div>
        <div class="legend">
          <span class="leg-item"><span class="dot oportunidad"></span>&lt; 0%</span>
          <span class="leg-item"><span class="dot neutro"></span>0–13%</span>
          <span class="leg-item"><span class="dot caro"></span>13–20%</span>
          <span class="leg-item"><span class="dot sobrevalorado"></span>&gt; 20%</span>
        </div>
      </div>
      <div #mapContainer class="map-wrap"></div>
      @if (loading()) {
        <div class="loading-overlay">
          <div class="spinner"></div>
          <span>Cargando inmuebles…</span>
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
      padding: 16px 20px 12px;
      flex-shrink: 0;
    }
    .mapa-header h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
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
      gap: 12px;
      font-size: 11px;
      color: var(--text-secondary);
    }
    .leg-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    .dot.oportunidad   { background: #4fd1a5; }
    .dot.neutro        { background: #6ec1e4; }
    .dot.caro          { background: #e8c547; }
    .dot.sobrevalorado { background: #f87171; }

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
      width: 28px;
      height: 28px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Cluster bubbles (dark theme) ── */
    :host ::ng-deep .marker-cluster {
      background: transparent !important;
    }
    :host ::ng-deep .marker-cluster div {
      background: rgba(232, 197, 71, 0.18) !important;
      border: 2px solid rgba(232, 197, 71, 0.5) !important;
      color: var(--text-primary) !important;
      font-family: 'DM Sans', sans-serif !important;
      font-weight: 600 !important;
      font-size: 13px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 50% !important;
      box-shadow: 0 0 18px rgba(232, 197, 71, 0.2), 0 4px 12px rgba(0,0,0,.4) !important;
      backdrop-filter: blur(4px) !important;
      transition: transform .2s ease, box-shadow .2s ease !important;
    }
    :host ::ng-deep .marker-cluster:hover div {
      transform: scale(1.12) !important;
      box-shadow: 0 0 24px rgba(232, 197, 71, 0.35), 0 6px 20px rgba(0,0,0,.5) !important;
    }
    :host ::ng-deep .marker-cluster-small div {
      width: 36px !important;
      height: 36px !important;
    }
    :host ::ng-deep .marker-cluster-medium div {
      width: 44px !important;
      height: 44px !important;
      font-size: 14px !important;
      background: rgba(232, 197, 71, 0.22) !important;
      border-color: rgba(232, 197, 71, 0.6) !important;
    }
    :host ::ng-deep .marker-cluster-large div {
      width: 54px !important;
      height: 54px !important;
      font-size: 15px !important;
      background: rgba(232, 197, 71, 0.28) !important;
      border-color: rgba(232, 197, 71, 0.7) !important;
      box-shadow: 0 0 28px rgba(232, 197, 71, 0.3), 0 4px 16px rgba(0,0,0,.5) !important;
    }

    /* Popup styling for dark theme */
    :host ::ng-deep .leaflet-popup-content-wrapper {
      background: var(--bg3);
      color: var(--text-primary);
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      border: 1px solid var(--border-bright);
    }
    :host ::ng-deep .leaflet-popup-tip {
      background: var(--bg3);
    }
    :host ::ng-deep .leaflet-popup-content {
      margin: 12px 14px;
      font-size: 12.5px;
      line-height: 1.6;
    }
    :host ::ng-deep .popup-gap {
      font-weight: 600;
      font-size: 13px;
    }
    :host ::ng-deep .popup-gap.neg  { color: #4fd1a5; }
    :host ::ng-deep .popup-gap.low  { color: #6ec1e4; }
    :host ::ng-deep .popup-gap.med  { color: #e8c547; }
    :host ::ng-deep .popup-gap.high { color: #f87171; }
    :host ::ng-deep .popup-btn {
      display: inline-block;
      margin-top: 6px;
      padding: 5px 12px;
      border-radius: 6px;
      background: rgba(232,197,71,0.12);
      color: var(--accent);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid rgba(232,197,71,0.2);
      transition: background .15s;
    }
    :host ::ng-deep .popup-btn:hover {
      background: rgba(232,197,71,0.22);
    }

    /* Dark controls */
    :host ::ng-deep .leaflet-control-attribution {
      background: rgba(13,15,18,.7) !important;
      color: var(--text-muted) !important;
      font-size: 10px !important;
    }
    :host ::ng-deep .leaflet-control-attribution a {
      color: var(--text-secondary) !important;
    }
    :host ::ng-deep .leaflet-control-zoom a {
      background: var(--bg3) !important;
      color: var(--text-primary) !important;
      border-color: var(--border) !important;
    }
    :host ::ng-deep .leaflet-control-zoom a:hover {
      background: var(--bg2) !important;
    }
  `]
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private http   = inject(HttpClient);
  private router = inject(Router);
  private map!: L.Map;
  private clusterGroup!: any;

  readonly loading   = signal(true);
  readonly totalPins = signal(0);

  ngAfterViewInit(): void {
    this.initMap();
    this.loadPins();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    const container = this.mapContainer.nativeElement;

    // Limpia cualquier instancia previa de Leaflet en el contenedor
    (container as any)._leaflet_id = undefined;

    this.map = L.map(container, {
      center: [40.0, -3.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    // Tile oscuro CartoDB — nombres en idioma local (español para España)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(this.map);

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
        let size = 'small';
        if (count >= 20) size = 'large';
        else if (count >= 8) size = 'medium';
        return L.divIcon({
          html: `<div>${count}</div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(44, 44),
        });
      },
    });
    this.map.addLayer(this.clusterGroup);
  }

  private loadPins(): void {
    this.loading.set(true);

    const cities = ['madrid', 'barcelona', 'asturias', 'valencia', 'sevilla'];
    const headers = { 'X-Api-Key': environment.apiKey };

    console.log('[Mapa] Cargando pins, apiUrl=', environment.apiUrl);

    let pending = cities.length;
    const allPins: AnuncioMapa[] = [];

    for (const city of cities) {
      const url = `${environment.apiUrl}/ciudades/${city}/mapa`;
      console.log('[Mapa] GET', url);
      this.http.get<AnuncioMapa[]>(url, { headers })
        .subscribe({
          next: (pins) => {
            console.log(`[Mapa] ${city}: ${pins.length} pins`);
            allPins.push(...pins);
            pending--;
            console.log(`[Mapa] pending=${pending}`);
            if (pending === 0) this.renderPins(allPins);
          },
          error: (err) => {
            console.error(`[Mapa] ERROR ${city}:`, err.status, err.message);
            pending--;
            if (pending === 0) this.renderPins(allPins);
          },
        });
    }
  }

  private renderPins(pins: AnuncioMapa[]): void {
    this.loading.set(false);
    this.totalPins.set(pins.length);

    if (!pins.length) return;

    this.clusterGroup.clearLayers();

    const bounds = L.latLngBounds([]);
    const markers: L.CircleMarker[] = [];

    for (const p of pins) {
      if (!p.lat || !p.lon) continue;

      const color  = this.gapColor(p.gapPct);
      const latlng = L.latLng(p.lat, p.lon);
      bounds.extend(latlng);

      const marker = L.circleMarker(latlng, {
        radius:      this.pinRadius(p.gapPct),
        fillColor:   color,
        fillOpacity: 0.85,
        color:       color,
        weight:      1.5,
        opacity:     0.5,
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
            <span style="color:var(--text-secondary)">Precio:</span> <strong>${this.fmt(p.precioTotal)} €</strong>
            <span style="color:var(--text-muted)"> · ${Math.round(p.precioM2)} €/m²</span><br>
            <span style="color:var(--text-secondary)">Notarial:</span> ${Math.round(p.notarialM2)} €/m²<br>
            <span class="popup-gap ${gapClass}">Gap: ${p.gapPct > 0 ? '+' : ''}${p.gapPct}%</span>
          </div>
          <span class="popup-btn" data-id="${p.id}">Ver ficha →</span>
        </div>
      `, { closeButton: false, maxWidth: 260 });

      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.querySelector(`.popup-btn[data-id="${p.id}"]`);
          btn?.addEventListener('click', () => this.router.navigate(['/ficha', p.id]));
        });
      });

      markers.push(marker);
    }

    this.clusterGroup.addLayers(markers);

    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }

    // Fuerza a Leaflet a recalcular el tamaño del contenedor
    setTimeout(() => this.map.invalidateSize(), 100);
  }

  private gapColor(gap: number): string {
    if (gap < 0)  return '#4fd1a5';
    if (gap < 13) return '#6ec1e4';
    if (gap < 20) return '#e8c547';
    return '#f87171';
  }

  private pinRadius(gap: number): number {
    const abs = Math.abs(gap);
    if (abs > 25) return 10;
    if (abs > 15) return 8;
    return 6;
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
