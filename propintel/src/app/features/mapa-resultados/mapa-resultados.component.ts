import {
  Component, inject, OnInit, OnDestroy, AfterViewInit,
  PLATFORM_ID, effect, computed, signal
} from '@angular/core';
import { isPlatformBrowser, NgIf, NgFor, CurrencyPipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BusquedaService } from '../../core/services/busqueda.service';
import { AuthService } from '../../core/services/auth.service';
import { BusquedaFiltros, ResultadoBusqueda } from '../../core/models/auth.model';
import { ServiciosUrbiaPanelComponent } from './servicios-urbia-panel.component';
import { FavoritosService } from '../../core/services/favoritos.service';
import { CompararService } from '../../core/services/comparar.service';

@Component({
  selector: 'app-mapa-resultados',
  standalone: true,
  imports: [NgIf, NgFor, CurrencyPipe, TitleCasePipe, DecimalPipe, RouterLink, FormsModule, ServiciosUrbiaPanelComponent],
  template: `
    <div class="layout">

      <!-- LEFT PANEL -->
      <aside class="panel-left">

        <!-- Header -->
        <div class="panel-header">
          <a routerLink="/" class="back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Nueva búsqueda
          </a>
          <a routerLink="/" class="panel-logo-link">
            <img src="assets/logo_urbia.png" alt="UrbIA" class="panel-logo" />
          </a>
        </div>

        <!-- Market stats pulse -->
        <div class="stats-pulse" *ngIf="!loading() && stats()">
          <div class="stat-row">
            <div class="stat-pill stat-green">
              <span class="stat-dot"></span>
              <span class="stat-num">{{ stats()!.verde }}</span>
              <span class="stat-lbl">baratas</span>
            </div>
            <div class="stat-pill stat-yellow">
              <span class="stat-dot"></span>
              <span class="stat-num">{{ stats()!.amarillo }}</span>
              <span class="stat-lbl">justas</span>
            </div>
            <div class="stat-pill stat-red">
              <span class="stat-dot"></span>
              <span class="stat-num">{{ stats()!.rojo }}</span>
              <span class="stat-lbl">caras</span>
            </div>
          </div>
          <div class="gap-insight">
            <span class="gap-label">Gap medio</span>
            <span class="gap-value" [style.color]="stats()!.avgGap > 15 ? '#DC2626' : stats()!.avgGap > 5 ? '#D97706' : '#16A34A'">
              {{ stats()!.avgGap > 0 ? '+' : '' }}{{ stats()!.avgGap | number:'1.0-1' }}%
            </span>
          </div>
          <div class="best-deal" *ngIf="stats()!.best && auth.isAuthenticated()" (click)="centrarInmueble(stats()!.best!)">
            <span class="deal-label">🏆 Mejor oportunidad</span>
            <span class="deal-pct" style="color:#16A34A">{{ stats()!.best!.semaforoPct | number:'1.0-1' }}%</span>
          </div>
        </div>

        <!-- Results count -->
        <div class="results-count" *ngIf="!loading()">
          <div class="count-big" *ngIf="auth.isAuthenticated()">{{ resultados().length }}</div>
          <div class="count-label" *ngIf="auth.isAuthenticated()">inmuebles encontrados</div>
          <div class="count-label blind" *ngIf="!auth.isAuthenticated()">
            <span class="blind-icon">👁</span> Mapa ciego · solo colores
          </div>
        </div>
        <div class="results-count" *ngIf="loading()">
          <div class="loading-text">Buscando inmuebles…</div>
        </div>

        <!-- Active filters -->
        <div class="filter-tags" *ngIf="filtros()">
          <span class="ftag" *ngIf="filtros()?.municipio">
            📍 {{ filtros()!.municipio | titlecase }}
          </span>
          <span class="ftag" *ngIf="filtros()?.barrio">{{ filtros()!.barrio }}</span>
          <span class="ftag" *ngIf="filtros()?.precioMaximo">
            Hasta {{ filtros()!.precioMaximo | currency:'EUR':'symbol':'1.0-0' }}
          </span>
          <span class="ftag" *ngIf="filtros()?.habitaciones">
            {{ filtros()!.habitaciones }}+ hab
          </span>
        </div>

        <!-- Modify filters toggle -->
        <button class="edit-filters-btn" (click)="showFiltros.set(!showFiltros())">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/></svg>
          {{ showFiltros() ? 'Cerrar filtros' : 'Modificar búsqueda' }}
        </button>

        <!-- Inline filter panel -->
        <div class="filtros-panel" *ngIf="showFiltros()">
          <div class="fp-field">
            <label class="fp-label">Municipio</label>
            <select [(ngModel)]="tmpFiltros.municipio" class="fp-input">
              <option *ngFor="let m of municipios" [value]="m.toLowerCase()">{{ m }}</option>
            </select>
          </div>
          <div class="fp-field">
            <label class="fp-label">Barrio / Zona</label>
            <input type="text" [(ngModel)]="tmpFiltros.barrio" placeholder="ej. Salamanca…" class="fp-input" />
          </div>
          <div class="fp-field">
            <label class="fp-label">Precio máximo (€)</label>
            <input type="number" [(ngModel)]="tmpFiltros.precioMaximo" placeholder="Sin límite" min="0" class="fp-input" />
          </div>
          <div class="fp-row2">
            <div class="fp-field fp-half">
              <label class="fp-label">m² mínimos</label>
              <input type="number" [(ngModel)]="tmpFiltros.m2Min" placeholder="60" min="0" class="fp-input" />
            </div>
            <div class="fp-field fp-half">
              <label class="fp-label">Habitaciones</label>
              <select [(ngModel)]="tmpFiltros.habitaciones" class="fp-input">
                <option [ngValue]="null">Cualquiera</option>
                <option [ngValue]="1">1+</option>
                <option [ngValue]="2">2+</option>
                <option [ngValue]="3">3+</option>
                <option [ngValue]="4">4+</option>
              </select>
            </div>
          </div>
          <div class="fp-checks">
            <label class="fp-check"><input type="checkbox" [(ngModel)]="tmpFiltros.exterior" /> Exterior</label>
            <label class="fp-check"><input type="checkbox" [(ngModel)]="tmpFiltros.ascensor" /> Ascensor</label>
          </div>
          <button class="fp-submit" (click)="rebuscar()" [disabled]="loading()">
            <span *ngIf="!loading()">🔍 Buscar de nuevo</span>
            <span *ngIf="loading()">Buscando…</span>
          </button>
        </div>

        <!-- Traffic light legend -->
        <div class="tl-section">
          <div class="section-label">Semáforo de precio</div>
          <div class="tl-item tl-green">
            <span class="tl-dot"></span>
            <div class="tl-text">
              <span class="tl-name">Infravalorado</span>
              <span class="tl-range">&gt;5% por debajo</span>
            </div>
          </div>
          <div class="tl-item tl-yellow">
            <span class="tl-dot"></span>
            <div class="tl-text">
              <span class="tl-name">Precio justo</span>
              <span class="tl-range">±5% del mercado</span>
            </div>
          </div>
          <div class="tl-item tl-red">
            <span class="tl-dot"></span>
            <div class="tl-text">
              <span class="tl-name">Caro</span>
              <span class="tl-range">&gt;5% por encima</span>
            </div>
          </div>
        </div>

        <!-- Top listings -->
        <div class="listings-section" *ngIf="auth.isAuthenticated() && resultados().length > 0">
          <div class="section-label">Top oportunidades</div>
          <div
            class="listing-item"
            *ngFor="let item of resultados().slice(0, 6)"
            role="button"
            tabindex="0"
            (click)="centrarInmueble(item)"
            (keydown.enter)="centrarInmueble(item)">
            <div class="listing-main-row">
              <div class="listing-left">
                <span class="listing-dot"
                  [style.background]="item.semaforoColor === 'verde' ? '#16A34A' : item.semaforoColor === 'amarillo' ? '#F59E0B' : '#DC2626'">
                </span>
                <div class="listing-info">
                  <span class="listing-price">{{ item.precioTotal | currency:'EUR':'symbol':'1.0-0' }}</span>
                  <span class="listing-meta">{{ item.superficieM2 || '?' }} m² · {{ item.habitaciones || '?' }} hab</span>
                </div>
              </div>
              <div class="listing-right">
                <span class="listing-pct"
                  [style.color]="item.semaforoColor === 'verde' ? '#16A34A' : item.semaforoColor === 'amarillo' ? '#D97706' : '#DC2626'">
                  {{ item.semaforoPct > 0 ? '+' : '' }}{{ item.semaforoPct | number:'1.0-1' }}%
                </span>
                <span class="listing-fav" *ngIf="auth.isAuthenticated()" (click)="$event.stopPropagation(); toggleFavorito(item.id)">
                  {{ esFavorito(item.id) ? '♥' : '♡' }}
                </span>
              </div>
            </div>
            <div class="listing-gap-bar">
              <div class="lgb-track">
                <div class="lgb-fill"
                  [style.width.%]="gapBarWidth(item.semaforoPct)"
                  [style.background]="item.semaforoColor === 'verde' ? '#16A34A' : item.semaforoColor === 'amarillo' ? '#F59E0B' : '#DC2626'">
                </div>
              </div>
            </div>
            <div class="listing-actions">
              <a [routerLink]="['/ficha', item.id]" class="lnk-ficha" (click)="$event.stopPropagation()">Ver ficha</a>
              <button
                class="lnk-comparar"
                [class.lnk-comparar-active]="comparar.has(item.id)"
                [disabled]="comparar.count() >= 4 && !comparar.has(item.id)"
                (click)="$event.stopPropagation(); toggleComparar(item.id)">
                {{ comparar.has(item.id) ? '✓ Añadido' : '+ Comparar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- CTA for non-auth -->
        <div class="auth-cta" *ngIf="!auth.isAuthenticated()">
          <div class="cta-lock">🔒</div>
          <p>Regístrate para ver la dirección exacta y los detalles completos</p>
          <a routerLink="/registro" [queryParams]="{returnUrl: '/mapa-resultados'}" class="cta-btn">
            Crear cuenta gratis
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>

        <!-- Auth user info -->
        <div class="user-status" *ngIf="auth.isAuthenticated()">
          <span class="status-dot"></span>
          <div>
            <span class="user-name">{{ auth.currentUser()?.nombre }}</span>
            <span class="user-label">Acceso completo</span>
          </div>
        </div>

      </aside>

      <!-- MAP (center, 70% width) -->
      <div class="map-area">
        <div id="mapa-resultados-map" class="leaflet-map"></div>

        <!-- Loading overlay -->
        <div class="map-overlay" *ngIf="loading()">
          <div class="overlay-card">
            <div class="overlay-spinner"></div>
            <p>Buscando inmuebles en el mapa…</p>
          </div>
        </div>

        <!-- Empty state -->
        <div class="map-overlay" *ngIf="!loading() && resultados().length === 0">
          <div class="overlay-card">
            <div class="empty-icon">🔍</div>
            <h3>Sin resultados</h3>
            <p>Prueba a ampliar el precio máximo o cambiar los filtros</p>
            <button class="overlay-btn" (click)="showFiltros.set(true); scrollToFiltros()">Modificar búsqueda</button>
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL: services -->
      <aside class="panel-right">
        <app-servicios-urbia-panel />
      </aside>

    </div>

    <!-- Floating comparison bar -->
    <div class="compare-bar" *ngIf="comparar.count() > 0">
      <div class="compare-bar-info">
        <span class="compare-dots">
          <span class="cdot" *ngFor="let id of comparar.ids()"></span>
          <span class="cdot cdot-empty" *ngFor="let _ of [].constructor(4 - comparar.count())"></span>
        </span>
        <span class="compare-bar-txt">
          <strong>{{ comparar.count() }}</strong> piso{{ comparar.count() > 1 ? 's' : '' }} seleccionado{{ comparar.count() > 1 ? 's' : '' }}
        </span>
        <span class="compare-bar-hint" *ngIf="comparar.count() < 4">· añade hasta {{ 4 - comparar.count() }} más</span>
      </div>
      <div class="compare-bar-actions">
        <button class="cbar-clear" (click)="comparar.clear()">Limpiar</button>
        <button class="cbar-go" (click)="irAComparar()">Ver comparador →</button>
      </div>
    </div>
  `,
  styles: [`
    /* ── LAYOUT ── */
    .layout {
      display: grid;
      grid-template-columns: 260px 1fr 240px;
      height: 100vh;
      overflow: hidden;
      background: #F7F9FB;
    }

    /* ── LEFT PANEL ── */
    .panel-left {
      background: #fff;
      border-right: 1px solid #F3F4F6;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 16px;
      overflow-y: auto;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600; color: #6B7280;
      text-decoration: none;
      padding: 6px 10px; border-radius: 8px;
      border: 1px solid #F3F4F6;
      transition: background .2s, color .2s;
    }
    .back-btn:hover { background: #F9FAFB; color: #374151; }
    .panel-logo-link { display: flex; align-items: center; text-decoration: none; }
    .panel-logo { height: 28px; width: auto; display: block; }

    /* Results count */
    .results-count { display: flex; flex-direction: column; gap: 2px; }
    .count-big {
      font-size: 40px; font-weight: 800; color: #1A1A1A;
      letter-spacing: -0.04em; line-height: 1;
    }
    .count-label { font-size: 12px; color: #6B7280; }
    .count-label.blind {
      background: #F3F4F6;
      border-radius: 8px; padding: 8px 10px;
      font-size: 11px; display: flex; align-items: center; gap: 6px;
    }
    .blind-icon { font-size: 14px; }
    .loading-text { font-size: 13px; color: #6B7280; font-style: italic; }

    /* Edit filters button */
    .edit-filters-btn {
      display: flex; align-items: center; gap: 6px;
      width: 100%; padding: 8px 12px; border-radius: 8px;
      background: #EFF6FF; border: 1px solid #BFDBFE;
      color: #1D4ED8; font-size: 12px; font-weight: 700;
      cursor: pointer; transition: background .15s;
      text-align: left;
    }
    .edit-filters-btn:hover { background: #DBEAFE; }

    /* Inline filter panel */
    .filtros-panel {
      display: flex; flex-direction: column; gap: 10px;
      background: #F9FAFB; border: 1px solid #F3F4F6;
      border-radius: 10px; padding: 14px;
    }
    .fp-field { display: flex; flex-direction: column; gap: 4px; }
    .fp-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; }
    .fp-input {
      width: 100%; padding: 7px 10px; border-radius: 7px;
      border: 1px solid #E5E7EB; background: #fff;
      font-size: 12px; color: #1A1A1A; outline: none;
      box-sizing: border-box;
    }
    .fp-input:focus { border-color: #93C5FD; box-shadow: 0 0 0 3px #EFF6FF; }
    .fp-row2 { display: flex; gap: 8px; }
    .fp-half { flex: 1; }
    .fp-checks { display: flex; gap: 12px; }
    .fp-check { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #374151; cursor: pointer; }
    .fp-submit {
      width: 100%; padding: 9px; border-radius: 8px;
      background: #2563EB; color: #fff; border: none;
      font-size: 12px; font-weight: 700; cursor: pointer;
      transition: background .15s;
    }
    .fp-submit:hover:not(:disabled) { background: #1D4ED8; }
    .fp-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Filter tags */
    .filter-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .ftag {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 11px; font-weight: 600; color: #1D4ED8;
    }

    /* Traffic light legend */
    .tl-section { display: flex; flex-direction: column; gap: 6px; }
    .section-label {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em;
      color: #9CA3AF; margin-bottom: 2px;
    }
    .tl-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 10px;
      border: 1px solid transparent;
    }
    .tl-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .tl-text { display: flex; flex-direction: column; gap: 1px; }
    .tl-name { font-size: 12px; font-weight: 600; }
    .tl-range { font-size: 10px; }

    .tl-green { background: #F0FDF4; border-color: #BBF7D0; }
    .tl-green .tl-dot { background: #16A34A; }
    .tl-green .tl-name { color: #15803D; }
    .tl-green .tl-range { color: #166534; opacity: 0.7; }

    .tl-yellow { background: #FFFBEB; border-color: #FDE68A; }
    .tl-yellow .tl-dot { background: #F59E0B; }
    .tl-yellow .tl-name { color: #D97706; }
    .tl-yellow .tl-range { color: #92400E; opacity: 0.7; }

    .tl-red { background: #FEF2F2; border-color: #FECACA; }
    .tl-red .tl-dot { background: #DC2626; }
    .tl-red .tl-name { color: #DC2626; }
    .tl-red .tl-range { color: #991B1B; opacity: 0.7; }

    /* Listings */
    .listings-section { display: flex; flex-direction: column; gap: 6px; }
    .listing-item {
      display: flex; flex-direction: column; gap: 0;
      background: #FAFAFA;
      border: 1px solid #F3F4F6;
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer; text-align: left; width: 100%;
      transition: background .15s, border-color .15s, transform .15s;
    }
    .listing-item:hover { background: #F9FAFB; border-color: #E5E7EB; transform: translateX(2px); }
    .listing-main-row { display: flex; align-items: center; justify-content: space-between; width: 100%; }
    .listing-left { display: flex; align-items: center; gap: 10px; }
    .listing-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .listing-info { display: flex; flex-direction: column; gap: 1px; }
    .listing-price { font-size: 13px; font-weight: 700; color: #1A1A1A; }
    .listing-meta { font-size: 11px; color: #9CA3AF; }
    .listing-right { display: flex; align-items: center; gap: 8px; }
    .listing-pct { font-size: 12px; font-weight: 700; }
    .listing-fav { font-size: 16px; color: #F43F5E; line-height: 1; cursor: pointer; }

    /* Listing gap micro-bar */
    .listing-gap-bar { padding: 0 4px; margin-top: 6px; }
    .lgb-track {
      height: 3px; background: #F3F4F6; border-radius: 2px; overflow: hidden;
    }
    .lgb-fill {
      height: 100%; border-radius: 2px;
      transition: width .4s ease;
    }

    /* Listing action row */
    .listing-actions {
      display: flex; gap: 6px; padding: 6px 4px 2px;
    }
    .lnk-ficha, .lnk-comparar {
      flex: 1; text-align: center; text-decoration: none;
      border-radius: 6px; padding: 5px 0; font-size: 11px; font-weight: 700;
      transition: background .15s;
    }
    .lnk-ficha { background: #F3F4F6; color: #374151; border: none; cursor: pointer; }
    .lnk-ficha:hover { background: #E5E7EB; }
    .lnk-comparar {
      background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE;
      cursor: pointer;
    }
    .lnk-comparar:hover:not([disabled]) { background: #DBEAFE; }
    .lnk-comparar[disabled] { opacity: 0.4; cursor: not-allowed; }
    .lnk-comparar-active {
      background: #F0FDF4 !important; color: #15803D !important;
      border-color: #BBF7D0 !important;
    }

    /* Floating compare bar */
    .compare-bar {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px;
      background: #1A1A1A; color: #fff;
      border-radius: 999px; padding: 10px 10px 10px 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      z-index: 9999; min-width: 340px;
      animation: barIn .2s ease;
    }
    @keyframes barIn {
      from { opacity: 0; transform: translateX(-50%) translateY(12px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .compare-bar-info { display: flex; align-items: center; gap: 10px; }
    .compare-dots { display: flex; gap: 5px; }
    .cdot {
      width: 10px; height: 10px; border-radius: 50%;
      background: #2563EB;
    }
    .cdot-empty {
      background: transparent; border: 1.5px solid #4B5563;
    }
    .compare-bar-txt { font-size: 13px; font-weight: 600; }
    .compare-bar-hint { font-size: 11px; color: #9CA3AF; }
    .compare-bar-actions { display: flex; gap: 8px; }
    .cbar-clear {
      background: transparent; border: 1px solid #4B5563; color: #9CA3AF;
      border-radius: 999px; padding: 7px 14px; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: border-color .15s, color .15s;
    }
    .cbar-clear:hover { border-color: #9CA3AF; color: #fff; }
    .cbar-go {
      background: #2563EB; color: #fff; border: none;
      border-radius: 999px; padding: 8px 18px;
      font-size: 13px; font-weight: 700; cursor: pointer;
      transition: background .15s;
    }
    .cbar-go:hover { background: #1D4ED8; }

    /* Market stats pulse */
    .stats-pulse {
      background: #F9FAFB;
      border: 1px solid #F3F4F6;
      border-radius: 12px;
      padding: 12px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .stat-row { display: flex; gap: 6px; }
    .stat-pill {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
      padding: 6px 4px; border-radius: 8px;
      border: 1px solid transparent;
    }
    .stat-pill.stat-green { background: #F0FDF4; border-color: #BBF7D0; }
    .stat-pill.stat-yellow { background: #FFFBEB; border-color: #FDE68A; }
    .stat-pill.stat-red { background: #FEF2F2; border-color: #FECACA; }
    .stat-dot {
      width: 6px; height: 6px; border-radius: 50%;
    }
    .stat-green .stat-dot { background: #16A34A; }
    .stat-yellow .stat-dot { background: #F59E0B; }
    .stat-red .stat-dot { background: #DC2626; }
    .stat-num { font-size: 15px; font-weight: 800; color: #1A1A1A; }
    .stat-lbl { font-size: 9px; color: #9CA3AF; text-transform: uppercase; letter-spacing: .06em; }

    .gap-insight {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0 2px;
    }
    .gap-label { font-size: 11px; color: #9CA3AF; }
    .gap-value { font-size: 14px; font-weight: 800; letter-spacing: -0.03em; }

    .best-deal {
      display: flex; justify-content: space-between; align-items: center;
      background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px;
      padding: 7px 10px; cursor: pointer;
      transition: background .15s;
    }
    .best-deal:hover { background: #DCFCE7; }
    .deal-label { font-size: 11px; font-weight: 600; color: #15803D; }
    .deal-pct { font-size: 13px; font-weight: 800; }

    /* Auth CTA */
    .auth-cta {
      background: linear-gradient(135deg, #EFF6FF, #F5F3FF);
      border: 1px solid #BFDBFE;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      display: flex; flex-direction: column; gap: 10px;
    }
    .cta-lock { font-size: 24px; }
    .auth-cta p { font-size: 12px; color: #6B7280; line-height: 1.5; margin: 0; }
    .cta-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      background: #2563EB; color: #fff; text-decoration: none;
      border-radius: 8px; padding: 9px 14px;
      font-size: 12px; font-weight: 700;
      transition: background .2s;
    }
    .cta-btn:hover { background: #1D4ED8; }

    /* User status */
    .user-status {
      display: flex; align-items: center; gap: 10px;
      padding: 12px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 10px;
      margin-top: auto;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #22C55E;
      box-shadow: 0 0 8px rgba(34,197,94,0.6);
      flex-shrink: 0;
    }
    .user-status div { display: flex; flex-direction: column; gap: 1px; }
    .user-name { font-size: 12px; font-weight: 700; color: #15803D; }
    .user-label { font-size: 10px; color: #16A34A; }

    /* ── MAP AREA ── */
    .map-area {
      position: relative; overflow: hidden;
      background: #E8EDF2;
    }
    .leaflet-map { width: 100%; height: 100%; display: block; }

    /* Map overlays */
    .map-overlay {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(247, 249, 251, 0.9);
      backdrop-filter: blur(4px);
      z-index: 1000;
    }
    .overlay-card {
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 32px 40px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
      display: flex; flex-direction: column;
      align-items: center; gap: 12px;
    }
    .overlay-spinner {
      width: 32px; height: 32px;
      border: 3px solid #E5E7EB;
      border-top-color: #2563EB;
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .overlay-card p { font-size: 13px; color: #6B7280; margin: 0; }
    .overlay-card h3 { font-size: 18px; font-weight: 700; color: #1A1A1A; margin: 0; }
    .empty-icon { font-size: 40px; }
    .overlay-btn {
      background: #2563EB; color: #fff; text-decoration: none;
      border-radius: 10px; padding: 10px 24px;
      font-size: 13px; font-weight: 700;
      transition: background .2s;
    }
    .overlay-btn:hover { background: #1D4ED8; }

    /* ── RIGHT PANEL ── */
    .panel-right { overflow: hidden; }

    /* ── RESPONSIVE ── */
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .panel-left { max-height: 200px; flex-direction: row; flex-wrap: wrap; overflow-x: auto; gap: 12px; }
      .panel-right { display: none; }
    }
  `]
})

export class MapaResultadosComponent implements OnInit, AfterViewInit, OnDestroy {
  private busquedaService = inject(BusquedaService);
  readonly auth = inject(AuthService);
  private favoritosService = inject(FavoritosService);
  private platformId = inject(PLATFORM_ID);
  readonly comparar = inject(CompararService);
  private router = inject(Router);

  readonly resultados = this.busquedaService.resultados;
  readonly loading = this.busquedaService.loading;
  readonly filtros = this.busquedaService.filtrosActivos;

  // Inline filter panel
  readonly showFiltros = signal(false);
  tmpFiltros: BusquedaFiltros = { municipio: 'madrid', precioMaximo: 0 };

  readonly municipios = [
    'Madrid','Barcelona','Valencia','Sevilla','Zaragoza',
    'Málaga','Murcia','Palma','Las Palmas','Bilbao',
    'Alicante','Córdoba','Valladolid','Vigo','Gijón',
  ];

  readonly stats = computed(() => {
    const res = this.resultados();
    if (!res.length) return null;
    const verde = res.filter(r => r.semaforoColor === 'verde').length;
    const amarillo = res.filter(r => r.semaforoColor === 'amarillo').length;
    const rojo = res.filter(r => r.semaforoColor === 'rojo').length;
    const avgGap = res.reduce((a, b) => a + (b.semaforoPct || 0), 0) / res.length;
    const best = res.reduce((a, b) => (b.semaforoPct ?? 0) < (a.semaforoPct ?? 0) ? b : a, res[0]);
    return { verde, amarillo, rojo, avgGap, best };
  });

  private map: any = null;
  private markersLayer: any = null;
  private clusterGroup: any = null;
  private L: any = null;
  private mapReady = false;

  constructor() {
    // Re-renderizar markers cuando lleguen los resultados (la búsqueda puede terminar
    // antes o después de que el mapa esté listo)
    effect(() => {
      const res = this.resultados(); // suscribe al signal
      if (this.mapReady && res !== undefined) {
        this.renderMarkers();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Sync tmpFiltros con los filtros activos si los hay
    const f = this.filtros();
    if (f) {
      this.tmpFiltros = { ...f };
    }
  }

  rebuscar(): void {
    this.showFiltros.set(false);
    this.busquedaService.buscar({ ...this.tmpFiltros });
  }

  toggleComparar(id: number): void {
    if (this.comparar.has(id)) {
      this.comparar.remove(id);
    } else {
      this.comparar.add(id);
    }
  }

  irAComparar(): void {
    this.router.navigate(['/comparar']);
  }

  scrollToFiltros(): void {
    setTimeout(() => {
      const el = document.querySelector('.filtros-panel');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    // Exponer callback global para que el popup Leaflet pueda añadir al comparador sin navegar
    (window as any)['__addComparar'] = (id: number) => this.comparar.add(id);
    await this.initMap();
    this.mapReady = true;
    this.renderMarkers();
  }

  private async initMap(): Promise<void> {
    const leafletModule = await import('leaflet');
    const L = (leafletModule as any).default ?? leafletModule;
    (window as any)['L'] = L; // el plugin necesita window.L
    await import('leaflet.markercluster' as any);
    this.L = L;

    const map = L.map('mapa-resultados-map', { center: [40.4168, -3.7038], zoom: 13, zoomControl: true });

    // Maptiler Streets — estilo claro con metro, bus, POI, transporte completo
    L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=0ONivd6VfHWkfYnnsxcJ', {
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 20,
      tileSize: 256,
    }).addTo(map);

    // Cluster group para agrupar pisos en bolas con número
    if (typeof (L as any).markerClusterGroup === 'function') {
      this.clusterGroup = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        disableClusteringAtZoom: 16,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const size = count >= 20 ? 54 : count >= 8 ? 44 : 36;
          const bg = count >= 20 ? 'rgba(239,68,68,0.9)' : count >= 8 ? 'rgba(234,179,8,0.9)' : 'rgba(34,197,94,0.9)';
          return L.divIcon({
            html: `<div style="
              width:${size}px;height:${size}px;border-radius:50%;
              background:${bg};border:3px solid #fff;
              display:flex;align-items:center;justify-content:center;
              font-family:'DM Sans',sans-serif;font-size:${count>=20?14:13}px;
              font-weight:800;color:#fff;
              box-shadow:0 2px 8px rgba(0,0,0,0.25);
            ">${count}</div>`,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
          });
        }
      });
    } else {
      this.clusterGroup = L.layerGroup();
    }
    this.clusterGroup.addTo(map);
    this.map = map;
    // Forzar recálculo de tamaño por si el DOM no estaba listo
    setTimeout(() => map.invalidateSize(), 100);
  }

  private renderMarkers(): void {
    if (!this.map || !this.L) return;

    if (this.clusterGroup) this.clusterGroup.clearLayers();

    const resultados = this.resultados();
    if (!resultados.length) return;

    const bounds: [number, number][] = [];
    const markers: any[] = [];

    resultados.forEach((r) => {
      const lat = r.latExacta ?? r.latAprox;
      const lon = r.lonExacta ?? r.lonAprox;
      if (!lat || !lon) return;

      const color = this.getColor(r.semaforoColor);
      const borderColor = r.semaforoColor === 'verde' ? '#16A34A'
        : r.semaforoColor === 'amarillo' ? '#D97706' : '#DC2626';
      const bgColor = r.semaforoColor === 'verde' ? '#F0FDF4'
        : r.semaforoColor === 'amarillo' ? '#FFFBEB' : '#FEF2F2';
      const precio = r.precioTotal
        ? (r.precioTotal >= 1000000 ? `${(r.precioTotal/1000000).toFixed(1)}M` : `${Math.round(r.precioTotal/1000)}k`)
        : '?';
      const pctLabel = r.semaforoPct != null
        ? (r.semaforoPct > 0 ? `+${r.semaforoPct.toFixed(0)}%` : `${r.semaforoPct.toFixed(0)}%`)
        : '';

      // Premium pill pin: colored bg + % diff + price
      const icon = this.L.divIcon({
        className: '',
        html: `<div style="
          background:${bgColor};border:2px solid ${borderColor};border-radius:999px;
          padding:5px 11px 5px 8px;font-family:'Inter',sans-serif;
          white-space:nowrap;display:flex;align-items:center;gap:6px;
          box-shadow:0 4px 14px rgba(0,0,0,0.18);cursor:pointer;
          transition:transform .15s;">
          <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block;box-shadow:0 0 0 2px ${borderColor}33"></span>
          <span style="font-size:12px;font-weight:800;color:${borderColor};letter-spacing:-0.02em">${pctLabel}</span>
          <span style="font-size:11px;font-weight:600;color:#374151">${precio}</span>
        </div>`,
        iconAnchor: [48, 18],
        popupAnchor: [0, -22]
      });

      const marker = this.L.marker([lat, lon], { icon });
      marker.bindPopup(this.buildPopup(r), { maxWidth: 280 });
      markers.push(marker);
      bounds.push([lat, lon]);
    });

    if (typeof this.clusterGroup.addLayers === 'function') {
      this.clusterGroup.addLayers(markers);
    } else {
      markers.forEach(m => this.clusterGroup.addLayer(m));
    }

    if (bounds.length > 0) this.map.fitBounds(bounds, { padding: [40, 40] });
  }

  centrarInmueble(item: ResultadoBusqueda): void {
    if (!this.map) return;
    const lat = item.latExacta ?? item.latAprox;
    const lon = item.lonExacta ?? item.lonAprox;
    if (!lat || !lon) return;
    this.map.flyTo([lat, lon], Math.max(this.map.getZoom(), 14), {
      duration: 0.8
    });
  }

  esFavorito(id: number): boolean {
    return this.favoritosService.isFavorito(id);
  }

  toggleFavorito(id: number): void {
    if (!this.auth.isAuthenticated()) return;
    this.favoritosService.toggle(id);
  }

  private buildPopup(r: ResultadoBusqueda): string {
    const isAuth = this.auth.isAuthenticated();
    if (!isAuth) {
      return `<div style="font-family:'Inter',sans-serif;padding:4px;min-width:200px">
        <p style="font-size:13px;font-weight:700;color:#1A1A1A;margin:0 0 6px">Mapa ciego activo</p>
        <p style="font-size:12px;color:#6B7280;margin:0 0 10px;line-height:1.5">Crea una cuenta para ver los detalles, dirección y análisis de cada inmueble.</p>
        <a href="/registro?returnUrl=/mapa-resultados"
          style="display:inline-flex;align-items:center;gap:6px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;">
          Crear cuenta gratis →
        </a>
      </div>`;
    }

    const isGreen = r.semaforoColor === 'verde';
    const isYellow = r.semaforoColor === 'amarillo';
    const verdictBg = isGreen ? '#F0FDF4' : isYellow ? '#FFFBEB' : '#FEF2F2';
    const verdictBorder = isGreen ? '#BBF7D0' : isYellow ? '#FDE68A' : '#FECACA';
    const verdictColor = isGreen ? '#15803D' : isYellow ? '#D97706' : '#B91C1C';
    const verdictDot = isGreen ? '#16A34A' : isYellow ? '#F59E0B' : '#DC2626';
    const verdictText = isGreen ? 'Buen precio' : isYellow ? 'Precio de mercado' : 'Precio elevado';

    const pct = r.semaforoPct != null
      ? (r.semaforoPct > 0 ? `+${r.semaforoPct.toFixed(1)}% sobre el mercado` : `${r.semaforoPct.toFixed(1)}% bajo el mercado`)
      : '';

    const precio = r.precioTotal ? `${r.precioTotal.toLocaleString('es-ES')} €` : 'N/D';
    const m2 = r.superficieM2 ? `${r.superficieM2} m²` : '';
    const hab = r.habitaciones ? `${r.habitaciones} hab.` : '';
    const tipo = r.tipoInmueble || 'Inmueble';
    const detalles = [m2, hab].filter(Boolean).join(' · ');

    return `<div style="font-family:'Inter',sans-serif;padding:4px;min-width:220px">
      <!-- Type + meta -->
      <div style="font-size:13px;font-weight:700;color:#1A1A1A;margin-bottom:2px">${tipo}</div>
      <div style="font-size:11px;color:#9CA3AF;margin-bottom:10px">${detalles}</div>

      <!-- Price hero -->
      <div style="font-size:22px;font-weight:800;color:#1A1A1A;letter-spacing:-0.04em;margin-bottom:6px">${precio}</div>

      <!-- Verdict badge -->
      <div style="display:inline-flex;align-items:center;gap:6px;background:${verdictBg};border:1px solid ${verdictBorder};border-radius:999px;padding:4px 10px;margin-bottom:4px">
        <span style="width:7px;height:7px;border-radius:50%;background:${verdictDot};flex-shrink:0"></span>
        <span style="font-size:12px;font-weight:700;color:${verdictColor}">${verdictText}</span>
      </div>
      <div style="font-size:11px;color:#6B7280;margin-bottom:12px">${pct}</div>

      <!-- CTA -->
      <div style="display:flex;gap:8px">
        <a href="/ficha/${r.id}"
          style="flex:1;display:flex;align-items:center;justify-content:space-between;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:9px 12px;text-decoration:none;">
          <span style="font-size:12px;font-weight:700;color:#1A1A1A">Ver ficha</span>
          <span style="color:#2563EB;font-size:14px">→</span>
        </a>
        <button onclick="window.__addComparar(${r.id}); this.textContent='✓ Añadido'; this.style.background='#D1FAE5'; this.style.borderColor='#6EE7B7'; this.style.color='#065F46'; this.disabled=true"
          style="display:flex;align-items:center;justify-content:center;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:9px 10px;font-size:11px;font-weight:700;color:#2563EB;white-space:nowrap;cursor:pointer">
          + Comparar
        </button>
      </div>
    </div>`;
  }

  private getColor(semaforo: 'rojo' | 'amarillo' | 'verde'): string {
    if (semaforo === 'verde') return '#16A34A';
    if (semaforo === 'amarillo') return '#F59E0B';
    return '#DC2626';
  }

  gapBarWidth(pct: number | null | undefined): number {
    if (pct == null) return 0;
    return Math.min(Math.abs(pct) * 2.5, 100);
  }

  ngOnDestroy(): void {
    delete (window as any)['__addComparar'];
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
