import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import {
  UrbiaBackendService,
  ScrapingStats,
  PortalScrapingStats
} from '../../core/services/urbia-backend.service';

interface APIService {
  nombre: string;
  url: string;
  paraQue: string;
}

interface ScraperDef {
  portal: string;
  cobertura: string;
  restricciones: string;
}

@Component({
  selector: 'app-apis-fuentes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="apis-page">
      <header class="hero">
        <div>
          <h1>APIs y Fuentes de UrbIA</h1>
          <p>Panel de integraciones, scraping y arquitectura operativa.</p>
        </div>
        <button class="btn-refresh" (click)="cargarStats()" [disabled]="loading()">Actualizar</button>
      </header>

      <section class="kpi-grid">
        <article class="kpi-card">
          <span>Total anuncios</span>
          <strong>{{ stats()?.totalAnuncios ?? 0 | number:'1.0-0':'es-ES' }}</strong>
        </article>
        <article class="kpi-card">
          <span>Última ejecución</span>
          <strong>{{ stats()?.ultimaEjecucion ? (stats()!.ultimaEjecucion | date:'d MMM HH:mm':'':'es-ES') : 'N/D' }}</strong>
        </article>
        <article class="kpi-card">
          <span>Portales activos</span>
          <strong>{{ stats()?.portalesActivos ?? 0 }}</strong>
        </article>
        <article class="kpi-card highlight">
          <span>Fotocasa</span>
          <strong>{{ stats()?.fotocasaResumen?.totalAnuncios ?? 0 | number:'1.0-0':'es-ES' }}</strong>
          <small>anuncios guardados</small>
        </article>
      </section>

      <nav class="tabs">
        <button [class.active]="activeTab() === 'apis'" (click)="activeTab.set('apis')">APIs Externas</button>
        <button [class.active]="activeTab() === 'scrapers'" (click)="activeTab.set('scrapers')">Scrapers</button>
        <button [class.active]="activeTab() === 'tasacion'" (click)="activeTab.set('tasacion')">Tasación AVM</button>
        <button [class.active]="activeTab() === 'infra'" (click)="activeTab.set('infra')">Infraestructura</button>
      </nav>

      <section class="tab-card" *ngIf="activeTab() === 'apis'">
        <table>
          <thead>
            <tr>
              <th>Servicio</th>
              <th>URL</th>
              <th>Uso</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let api of apisExternas">
              <td>{{ api.nombre }}</td>
              <td><code>{{ api.url }}</code></td>
              <td>{{ api.paraQue }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="tab-card" *ngIf="activeTab() === 'scrapers'">
        <div class="scraper-grid">
          <article class="scraper-card" *ngFor="let s of scrapers">
            <h3>{{ s.portal }}</h3>
            <p><strong>Cobertura:</strong> {{ s.cobertura }}</p>
            <p><strong>Restricciones:</strong> {{ s.restricciones }}</p>

            <div class="live" *ngIf="getPortalStats(s.portal) as portal">
              <span>Total guardados: {{ portal.totalAnuncios | number:'1.0-0':'es-ES' }}</span>
              <span>Última ejecución: {{ portal.ultimaEjecucion | date:'d MMM HH:mm':'':'es-ES' }}</span>
            </div>
          </article>
        </div>

        <div class="result-note" *ngIf="stats()?.fotocasaResumen as f">
          Fotocasa completado con éxito: {{ f.totalAnuncios | number:'1.0-0':'es-ES' }} anuncios disponibles en BD.
        </div>
      </section>

      <section class="tab-card" *ngIf="activeTab() === 'tasacion'">
        <h2>Motor Tasación AVM</h2>
        <p class="endpoint">POST /api/tasacion/estimar</p>
        <ul>
          <li>60% mediana asking prices (Idealista + Fotocasa).</li>
          <li>40% precio notarial ajustado con IPV.</li>
          <li>Mediana, P25/P75 y filtro por radio con Haversine (~1.5 km).</li>
        </ul>
        <div class="links">
          <a href="https://www.tinsa.es" target="_blank" rel="noopener noreferrer">Tinsa</a>
          <a href="https://www.gloval.es" target="_blank" rel="noopener noreferrer">Gloval</a>
          <a href="https://uve-valoraciones.es" target="_blank" rel="noopener noreferrer">UVE Valoraciones</a>
        </div>
      </section>

      <section class="tab-card" *ngIf="activeTab() === 'infra'">
        <div class="infra-grid">
          <article>
            <h3>Base de datos</h3>
            <p>PostgreSQL local (Docker) y Azure PostgreSQL en producción.</p>
          </article>
          <article>
            <h3>Storage</h3>
            <p>Azure Blob Storage para snapshots crudos de scraping.</p>
          </article>
          <article>
            <h3>Backend</h3>
            <p>API .NET en Azure App Service: urbia-api.azurewebsites.net</p>
          </article>
          <article>
            <h3>Cartografía</h3>
            <p>Base CartoDB + parcelas catastrales WMS (zoom >= 15).</p>
          </article>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .apis-page { padding: 26px; display: grid; gap: 16px; }
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: linear-gradient(120deg, #1f7ae0 0%, #0f57a7 100%);
      color: #fff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: var(--shadow-card);
    }
    .hero h1 { margin: 0; font-size: 30px; }
    .hero p { margin: 6px 0 0; opacity: .95; }

    .btn-refresh {
      background: #fff;
      color: #114b90;
      border: 0;
      border-radius: 10px;
      font-weight: 700;
      padding: 10px 14px;
      cursor: pointer;
    }

    .kpi-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .kpi-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      display: grid;
      gap: 4px;
    }

    .kpi-card span { font-size: 12px; color: var(--text-muted); }
    .kpi-card strong { font-size: 22px; color: var(--text-primary); }
    .kpi-card.highlight {
      background: linear-gradient(135deg, #e7fff8 0%, #f3fffb 100%);
      border-color: #b8efe0;
    }

    .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tabs button {
      border: 1px solid var(--border);
      background: #fff;
      color: var(--text-secondary);
      border-radius: 999px;
      padding: 8px 14px;
      cursor: pointer;
      font-weight: 600;
    }
    .tabs button.active {
      background: #1f7ae0;
      color: #fff;
      border-color: #1f7ae0;
    }

    .tab-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      box-shadow: var(--shadow-soft);
    }

    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e7edf5; }
    th { color: var(--text-primary); font-size: 13px; }
    td { color: var(--text-secondary); font-size: 14px; }
    code { color: #1f7ae0; background: #eef5ff; padding: 3px 6px; border-radius: 5px; }

    .scraper-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
    .scraper-card { border: 1px solid var(--border); border-radius: 12px; padding: 14px; background: #fff; }
    .scraper-card h3 { margin: 0 0 10px; color: var(--text-primary); }
    .scraper-card p { margin: 6px 0; color: var(--text-secondary); font-size: 14px; }
    .live {
      margin-top: 10px;
      display: grid;
      gap: 4px;
      background: #eef5ff;
      border: 1px solid #d5e6fb;
      border-radius: 10px;
      padding: 10px;
      color: #17497f;
      font-size: 12px;
    }

    .result-note {
      margin-top: 12px;
      border-radius: 10px;
      padding: 12px;
      background: #edfff5;
      border: 1px solid #b8efe0;
      color: #10684f;
      font-weight: 600;
    }

    .endpoint {
      background: #eef5ff;
      border: 1px solid #cfe2fb;
      color: #1f7ae0;
      border-radius: 8px;
      padding: 8px 10px;
      display: inline-block;
      font-weight: 700;
    }

    .links { display: flex; gap: 10px; flex-wrap: wrap; }
    .links a {
      color: #1f7ae0;
      text-decoration: none;
      border: 1px solid #cde0f8;
      background: #f3f9ff;
      border-radius: 999px;
      padding: 8px 12px;
      font-weight: 600;
    }

    .infra-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .infra-grid article { border: 1px solid var(--border); border-radius: 10px; padding: 12px; background: #fff; }
    .infra-grid h3 { margin: 0 0 8px; color: var(--text-primary); }
    .infra-grid p { margin: 0; color: var(--text-secondary); font-size: 14px; }

    @media (max-width: 860px) {
      .apis-page { padding: 14px; }
      .hero { padding: 16px; }
      .hero h1 { font-size: 24px; }
    }
  `]
})
export class ApisFuentesComponent {
  private backend = inject(UrbiaBackendService);

  readonly activeTab = signal<'apis' | 'scrapers' | 'tasacion' | 'infra'>('apis');
  readonly loading = signal(false);
  readonly stats = signal<ScrapingStats | null>(null);

  readonly apisExternas: APIService[] = [
    {
      nombre: 'Catastro (OVC)',
      url: 'ovc.catastro.meh.es',
      paraQue: 'Búsqueda por dirección, referencia catastral, coordenadas y WMS de parcelas.'
    },
    {
      nombre: 'INE (IPV)',
      url: 'servicios.ine.es/wstempus',
      paraQue: 'Índice trimestral de precios de vivienda e hipotecas constituidas.'
    },
    {
      nombre: 'Banco de España',
      url: 'bde.es/api/estadisticas',
      paraQue: 'Tipos hipotecarios y Euribor para ajustar el motor AVM.'
    },
    {
      nombre: 'GeoNames',
      url: 'download.geonames.org',
      paraQue: 'Seed inicial de códigos postales con coordenadas.'
    },
    {
      nombre: 'INE Municipios',
      url: 'ine.es/daco/daco42',
      paraQue: 'Seed inicial de municipios (fuente oficial).'
    }
  ];

  readonly scrapers: ScraperDef[] = [
    {
      portal: 'fotocasa',
      cobertura: '5 ciudades × 15 zonas',
      restricciones: 'Cloudflare y rate limit (4-8s entre peticiones)'
    },
    {
      portal: 'idealista',
      cobertura: '5 ciudades × 15 zonas',
      restricciones: 'Bloqueo diurno de IP, recomendado de madrugada'
    },
    {
      portal: 'notarial',
      cobertura: 'Precios reales por municipio',
      restricciones: 'Fuente oficial sin bloqueo'
    }
  ];

  constructor() {
    this.cargarStats();
  }

  cargarStats(): void {
    this.loading.set(true);
    this.backend.getScrapingStats().pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      this.stats.set(data);
      this.loading.set(false);
    });
  }

  getPortalStats(portal: string): PortalScrapingStats | undefined {
    return this.stats()?.portales?.find(p => p.portal.toLowerCase() === portal.toLowerCase());
  }
}
