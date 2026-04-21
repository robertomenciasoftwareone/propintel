import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BusquedaService } from '../../../core/services/busqueda.service';
import { BusquedaFiltros } from '../../../core/models/auth.model';

const MUNICIPIOS = [
  'Madrid','Alcalá de Henares','Alcobendas','Alcorcón','Algete','Aranjuez',
  'Arganda del Rey','Boadilla del Monte','Brunete','Collado Villalba','Coslada',
  'El Escorial','Fuenlabrada','Galapagar','Getafe','Las Rozas','Leganés',
  'Majadahonda','Mejorada del Campo','Móstoles','Navalcarnero','Pinto',
  'Pozuelo de Alarcón','Rivas-Vaciamadrid','San Fernando de Henares',
  'San Sebastián de los Reyes','Torrejón de Ardoz','Tres Cantos','Valdemoro',
  'Velilla de San Antonio','Villanueva de la Cañada','Villaviciosa de Odón'
];

@Component({
  selector: 'app-landing-hero',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `

<!-- ═══════ HERO ═══════ -->
<section class="hero">

  <!-- Subtle gradient bg -->
  <div class="hero-bg">
    <div class="blob b1"></div>
    <div class="blob b2"></div>
  </div>

  <div class="hero-body">

    <!-- Badge -->
    <div class="pill" [class.in]="v">
      <span class="live-dot"></span>
      Datos notariales en tiempo real · Madrid
    </div>

    <!-- Headlines -->
    <h1 class="h1" [class.in]="v">
      Descubre si un piso<br>
      <span class="h1-accent">está caro o barato</span><br>
      antes de comprar
    </h1>

    <p class="sub" [class.in]="v">
      Analizamos datos reales del mercado y notaría<br>
      para ayudarte a <strong>decidir mejor</strong>
    </p>

    <!-- ── TRAFFIC LIGHT PREVIEWER ── -->
    <div class="tl-cards" [class.in]="v">
      <div class="tl-card tl-green">
        <span class="tl-dot"></span>
        <div>
          <div class="tl-pct">−22%</div>
          <div class="tl-label">Infravalorado</div>
        </div>
      </div>
      <div class="tl-card tl-yellow">
        <span class="tl-dot"></span>
        <div>
          <div class="tl-pct">±3%</div>
          <div class="tl-label">Precio justo</div>
        </div>
      </div>
      <div class="tl-card tl-red">
        <span class="tl-dot"></span>
        <div>
          <div class="tl-pct">+18%</div>
          <div class="tl-label">Caro</div>
        </div>
      </div>
    </div>

    <!-- ── SEARCH BOX ── -->
    <div class="sbox" [class.in]="v">
      <form [formGroup]="form" (ngSubmit)="buscar()">

        <!-- Row 1: location + price -->
        <div class="srow srow1">
          <div class="sf">
            <label class="slabel">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Municipio
            </label>
            <select formControlName="municipio" class="si">
              @for (m of municipios; track m) {
                <option [value]="m.toLowerCase()">{{ m }}</option>
              }
            </select>
          </div>

          <div class="sdiv"></div>

          <div class="sf">
            <label class="slabel">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              Barrio / Zona
            </label>
            <input type="text" formControlName="barrio" placeholder="ej. Salamanca, Retiro…" class="si" />
          </div>

          <div class="sdiv"></div>

          <div class="sf">
            <label class="slabel">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              Precio máximo
            </label>
            <input type="number" formControlName="precioMaximo" placeholder="Sin límite" min="0" class="si" />
          </div>
        </div>

        <!-- Row 2: filters + CTA -->
        <div class="srow srow2">
          <div class="sf">
            <label class="slabel">m² mínimos</label>
            <input type="number" formControlName="m2Min" placeholder="ej. 60" min="0" class="si" />
          </div>

          <div class="sdiv"></div>

          <div class="sf">
            <label class="slabel">Habitaciones</label>
            <select formControlName="habitaciones" class="si">
              <option [value]="null">Cualquiera</option>
              <option [value]="1">1+</option>
              <option [value]="2">2+</option>
              <option [value]="3">3+</option>
              <option [value]="4">4+</option>
            </select>
          </div>

          <div class="sdiv"></div>

          <div class="sf sf-checks">
            <label class="slabel">Extras</label>
            <div class="checks">
              <label class="ck">
                <input type="checkbox" formControlName="exterior" />
                <span class="ck-box"></span>
                Exterior
              </label>
              <label class="ck">
                <input type="checkbox" formControlName="ascensor" />
                <span class="ck-box"></span>
                Ascensor
              </label>
            </div>
          </div>

          <div class="sdiv"></div>

          <button type="submit" class="sbtn" [disabled]="cargando">
            @if (cargando) {
              <span class="spin"></span>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Ver oportunidades
            }
          </button>
        </div>

      </form>

      @if (errorMsg) {
        <p class="errmsg">{{ errorMsg }}</p>
      }
    </div>

    <!-- Stats -->
    <div class="stats" [class.in]="v">
      <div class="stat"><strong>+50k</strong><span>inmuebles</span></div>
      <div class="sdot"></div>
      <div class="stat"><strong>32</strong><span>municipios</span></div>
      <div class="sdot"></div>
      <div class="stat"><strong>IA</strong><span>Gemini integrado</span></div>
      <div class="sdot"></div>
      <div class="stat"><strong>Gratis</strong><span>para empezar</span></div>
    </div>

  </div>
</section>

<!-- ═══════ TOOLS STRIP ═══════ -->
<section class="tools-strip">
  <div class="tools-inner">
    <div class="tools-label">Todas las herramientas incluidas</div>
    <div class="tools-row">
      @for (tool of tools; track tool.path) {
        <a [routerLink]="tool.path" class="tool-chip">
          <span class="tool-chip-icon">{{ tool.icon }}</span>
          <span>{{ tool.label }}</span>
          @if (tool.badge) { <span class="tool-chip-badge">{{ tool.badge }}</span> }
        </a>
      }
    </div>
  </div>
</section>

<!-- ═══════ HOW IT WORKS ═══════ -->
<section class="how-section" id="como-funciona">
  <div class="container">
    <div class="sec-head">
      <span class="tag">Cómo funciona</span>
      <h2>Toma decisiones con datos reales,<br><em>no con intuición</em></h2>
    </div>

    <div class="steps">
      <div class="step">
        <div class="step-num">01</div>
        <div class="step-icon">🔍</div>
        <h3>Busca en el mapa</h3>
        <p>Filtra por zona, precio y características. Verás los inmuebles con su semáforo de valor en el mapa.</p>
      </div>
      <div class="step-arrow">→</div>
      <div class="step">
        <div class="step-num">02</div>
        <div class="step-icon">📊</div>
        <h3>Analiza el precio</h3>
        <p>Comparamos el precio pedido con transacciones notariales reales de la misma zona y tipología.</p>
      </div>
      <div class="step-arrow">→</div>
      <div class="step">
        <div class="step-num">03</div>
        <div class="step-icon">🚦</div>
        <h3>Decide con confianza</h3>
        <p>Verás si está infravalorado, a precio de mercado o caro. Y cuánto puedes negociar.</p>
      </div>
    </div>
  </div>
</section>

<!-- ═══════ FEATURES ═══════ -->
<section class="sec-features" id="features">
  <div class="container">

    <div class="sec-head">
      <span class="tag">Por qué UrbIA</span>
      <h2>Más inteligente que Idealista.<br><em>Más útil que Fotocasa.</em></h2>
    </div>

    <div class="feat-grid">
      @for (f of feats; track f.t; let i = $index) {
        <div class="fcard" [style.--i]="i">
          <div class="ficon">{{ f.e }}</div>
          <h3>{{ f.t }}</h3>
          <p>{{ f.d }}</p>
        </div>
      }
    </div>

    <!-- Semáforo explainer -->
    <div class="semaforo-card">
      <div class="sem-copy">
        <span class="tag">Exclusivo UrbIA</span>
        <h3>El semáforo que te dice si el precio es justo</h3>
        <p>Cruzamos el precio pedido con datos reales de transacciones notariales de la zona. Sin conjeturas, con datos oficiales.</p>
        <div class="sem-legend">
          <div class="sem-item">
            <span class="sem-dot green"></span>
            <div>
              <strong>Verde — Infravalorado</strong>
              <span>Precio igual o por debajo del mercado real</span>
            </div>
          </div>
          <div class="sem-item">
            <span class="sem-dot yellow"></span>
            <div>
              <strong>Amarillo — Precio justo</strong>
              <span>Dentro del rango ±5% del mercado</span>
            </div>
          </div>
          <div class="sem-item">
            <span class="sem-dot red"></span>
            <div>
              <strong>Rojo — Caro</strong>
              <span>Precio claramente por encima del mercado</span>
            </div>
          </div>
        </div>
      </div>
      <div class="sem-mock">
        <div class="mock-card">
          <div class="mock-label">Análisis de precio</div>
          <div class="mock-header">
            <span class="mock-addr">C/ Serrano 45, Madrid</span>
            <span class="mock-badge green-badge">● Infravalorado</span>
          </div>
          <div class="mock-price">320.000 €</div>
          <div class="mock-meta">3 hab · 82 m² · Planta 4ª · Exterior</div>
          <div class="mock-verdict">
            <p class="verdict-text">Este inmueble está <strong>22% por debajo</strong> de su valor estimado de mercado</p>
          </div>
          <div class="mock-prices">
            <div class="mp-row">
              <span class="mp-label">Precio pedido</span>
              <span class="mp-val asking">320.000€</span>
            </div>
            <div class="mp-row">
              <span class="mp-label">Precio notarial zona</span>
              <span class="mp-val notarial">410.000€</span>
            </div>
            <div class="mp-row">
              <span class="mp-label">Gap</span>
              <span class="mp-val gap-val">−22%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</section>

<!-- GDPR -->
@if (gdpr) {
  <div class="gdpr">
    <span>Usamos cookies para mejorar tu experiencia.</span>
    <button (click)="gdpr=false">Aceptar</button>
  </div>
}
  `,
  styles: [`
/* ════════════════════════════════════════════════════════
   HERO — "The View" — Dubai Luxury × Apple Precision
════════════════════════════════════════════════════════ */

/* ── Design Tokens ── */
:host {
  --brand:        #0052FF;
  --brand-deep:   #0041CC;
  --brand-light:  #EEF4FF;
  --emerald:      #00B5A3;
  --gold:         #C59400;
  --gold-light:   #F0D060;
  --carmine:      #E11D48;
  --ink:          #0F172A;
  --ink-mid:      #64748B;
  --ink-pale:     #94A3B8;
  --shadow-luxury: 0 20px 80px -16px rgba(0,52,255,0.12), 0 6px 24px -6px rgba(0,0,0,0.06);
  --shadow-float:  0 40px 120px -20px rgba(0,52,255,0.14), 0 12px 40px -8px rgba(0,0,0,0.08);
  --radius-card:   24px;
}

/* ── Hero wrapper ── */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(ellipse 120% 60% at 50% -8%, #EEF4FF 0%, #F4F7FF 35%, #FAFBFF 60%, #FFFFFF 80%);
  padding-top: 68px;
}

/* Ambient blobs — imperceptible radial mood */
.hero-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.blob {
  position: absolute; border-radius: 50%;
  filter: blur(110px); opacity: 0.45;
  will-change: transform;
}
.b1 {
  width: 1000px; height: 800px;
  background: radial-gradient(circle, rgba(0,82,255,0.06) 0%, transparent 70%);
  top: -280px; left: -300px;
  animation: blobFloat 16s ease-in-out infinite;
}
.b2 {
  width: 800px; height: 700px;
  background: radial-gradient(circle, rgba(197,148,0,0.04) 0%, transparent 70%);
  top: 60px; right: -250px;
  animation: blobFloat 20s ease-in-out infinite reverse;
}
@keyframes blobFloat {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(28px,-36px) scale(1.03); }
  66%      { transform: translate(-20px,24px) scale(0.97); }
}

/* ── Hero body ── */
.hero-body {
  position: relative; z-index: 1;
  width: 100%; max-width: 880px;
  padding: 96px 24px 96px;
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 0;
}

/* ── Entrance animations ── */
.pill, .h1, .sub, .tl-cards, .sbox, .stats {
  opacity: 0; transform: translateY(24px);
  transition: opacity .7s cubic-bezier(.22,.83,.27,1), transform .7s cubic-bezier(.22,.83,.27,1);
}
.pill.in      { opacity: 1; transform: none; transition-delay: .05s; }
.h1.in        { opacity: 1; transform: none; transition-delay: .16s; }
.sub.in       { opacity: 1; transform: none; transition-delay: .27s; }
.tl-cards.in  { opacity: 1; transform: none; transition-delay: .36s; }
.sbox.in      { opacity: 1; transform: none; transition-delay: .46s; }
.stats.in     { opacity: 1; transform: none; transition-delay: .60s; }

/* ── Pill badge ── */
.pill {
  display: inline-flex; align-items: center; gap: 9px;
  background: linear-gradient(135deg, rgba(0,82,255,0.055) 0%, rgba(0,82,255,0.035) 100%);
  border: 1px solid rgba(0,82,255,0.12);
  border-radius: 999px;
  padding: 7px 20px;
  font-size: 12px; font-weight: 600;
  color: #0052FF;
  letter-spacing: 0.02em;
  margin-bottom: 32px;
  box-shadow: 0 2px 16px rgba(0,82,255,0.09), inset 0 1px 0 rgba(255,255,255,0.7);
  backdrop-filter: blur(8px);
}
.live-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--emerald);
  box-shadow: 0 0 10px rgba(0,181,163,0.95);
  animation: puls 2.6s ease-in-out infinite;
}
@keyframes puls { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(.65)} }

/* ── Headline — "The Declaration" ── */
.h1 {
  font-size: clamp(40px, 5.8vw, 76px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.05em;
  color: var(--ink);
  margin: 0 0 22px;
  text-wrap: balance;
}
.h1-accent {
  background: linear-gradient(145deg, #0052FF 15%, #003ACC 90%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Subtitle ── */
.sub {
  font-size: 17.5px;
  color: var(--ink-mid);
  line-height: 1.68;
  letter-spacing: -0.015em;
  max-width: 500px;
  margin: 0 0 40px;
}
.sub strong { color: var(--ink); font-weight: 600; }

/* ═══════════════════════════════════
   TRAFFIC LIGHT — "Luxury Semáforo"
═══════════════════════════════════ */
.tl-cards {
  display: flex; gap: 14px;
  margin: 0 0 40px;
  flex-wrap: wrap; justify-content: center;
}
.tl-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 22px; border-radius: 16px;
  font-size: 13px; border: 1px solid transparent;
  transition: all 0.42s cubic-bezier(0.4,0,0.2,1);
  backdrop-filter: blur(12px);
}
.tl-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.tl-pct {
  font-size: 18px; font-weight: 800;
  letter-spacing: -0.04em;
  font-family: 'JetBrains Mono', monospace;
}
.tl-label {
  font-size: 10.5px; font-weight: 700; margin-top: 2px;
  opacity: 0.70; text-transform: uppercase; letter-spacing: 0.07em;
}

/* Emerald — infravalorado */
.tl-green {
  background: rgba(0,181,163,0.065);
  border-color: rgba(0,181,163,0.22);
}
.tl-green .tl-dot { background: var(--emerald); box-shadow: 0 0 14px rgba(0,181,163,0.60); }
.tl-green .tl-pct { color: var(--emerald); }
.tl-green .tl-label { color: #007B70; }
.tl-green:hover { background: rgba(0,181,163,0.10); transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,181,163,0.12); }

/* Gold — precio justo */
.tl-yellow {
  background: rgba(197,148,0,0.055);
  border-color: rgba(197,148,0,0.20);
}
.tl-yellow .tl-dot { background: var(--gold); box-shadow: 0 0 14px rgba(197,148,0,0.60); }
.tl-yellow .tl-pct { color: var(--gold); }
.tl-yellow .tl-label { color: #8A6800; }
.tl-yellow:hover { background: rgba(197,148,0,0.09); transform: translateY(-3px); box-shadow: 0 12px 32px rgba(197,148,0,0.10); }

/* Carmine — caro */
.tl-red {
  background: rgba(225,29,72,0.055);
  border-color: rgba(225,29,72,0.18);
}
.tl-red .tl-dot { background: var(--carmine); box-shadow: 0 0 14px rgba(225,29,72,0.60); }
.tl-red .tl-pct { color: var(--carmine); }
.tl-red .tl-label { color: #9F0E30; }
.tl-red:hover { background: rgba(225,29,72,0.09); transform: translateY(-3px); box-shadow: 0 12px 32px rgba(225,29,72,0.10); }

/* ═══════════════════════════════════
   SEARCH BOX — "Crystal Instrument"
   Glassmorphism inmobiliario
═══════════════════════════════════ */
.sbox {
  width: 100%; max-width: 840px;
  background: rgba(255,255,255,0.68);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow:
    0 8px 56px rgba(0,52,255,0.07),
    0 2px 16px rgba(0,0,0,0.035),
    inset 0 1px 0 rgba(255,255,255,0.90),
    inset 0 -1px 0 rgba(0,52,255,0.03);
  overflow: hidden;
  margin-bottom: 40px;
  transition: all 0.50s cubic-bezier(0.4,0,0.2,1);
}
.sbox:focus-within {
  background: rgba(255,255,255,0.88);
  box-shadow:
    0 20px 64px rgba(0,52,255,0.12),
    0 4px 24px rgba(0,0,0,0.05),
    inset 0 1px 0 rgba(255,255,255,0.95);
  transform: translateY(-4px);
  border-color: rgba(0,82,255,0.14);
}

.srow {
  display: flex; align-items: stretch;
}
.srow1 { min-height: 72px; }
.srow2 {
  min-height: 62px;
  border-top: 1px solid rgba(0,52,255,0.045);
  background: rgba(248,250,254,0.55);
}

/* Field — only a bottom-line illuminates on focus */
.sf {
  display: flex; flex-direction: column;
  justify-content: center;
  padding: 11px 22px;
  flex: 1; min-width: 0;
  position: relative;
}
.sf-checks { flex: 1.4; }

/* The illuminating underline */
.sf::after {
  content: '';
  position: absolute;
  bottom: 0; left: 50%; right: 50%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--brand), transparent);
  border-radius: 2px;
  transition: left .45s cubic-bezier(0.4,0,0.2,1), right .45s cubic-bezier(0.4,0,0.2,1), opacity .3s;
  opacity: 0;
}
.sf:focus-within::after {
  left: 0; right: 0; opacity: 1;
}

.slabel {
  display: flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--ink-pale); margin-bottom: 5px;
  white-space: nowrap;
}

.si {
  border: none; outline: none; background: transparent;
  font-size: 14px; font-weight: 600; color: var(--ink);
  font-family: inherit; width: 100%;
  appearance: none; -webkit-appearance: none;
  cursor: pointer; letter-spacing: -0.015em;
}
.si::placeholder { color: #CBD5E1; font-weight: 400; }

/* Divider between fields */
.sdiv {
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(0,52,255,0.07), transparent);
  margin: 12px 0; flex-shrink: 0;
}

/* Custom checkboxes */
.checks { display: flex; gap: 18px; align-items: center; }
.ck {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 500; color: #374151;
  cursor: pointer; user-select: none;
}
.ck input { display: none; }
.ck-box {
  width: 16px; height: 16px;
  border: 1.5px solid #D1D5DB; border-radius: 5px;
  background: #fff; flex-shrink: 0;
  transition: background .18s, border-color .18s;
  position: relative;
}
.ck input:checked ~ .ck-box {
  background: var(--brand); border-color: var(--brand);
}
.ck input:checked ~ .ck-box::after {
  content: '';
  position: absolute;
  left: 3px; top: 1px;
  width: 6px; height: 9px;
  border: 2px solid #fff;
  border-top: none; border-left: none;
  transform: rotate(45deg);
}

/* Search CTA — silk inertia */
.sbtn {
  display: flex; align-items: center; gap: 9px;
  background: var(--brand);
  color: #fff; border: none;
  padding: 0 30px;
  font-size: 14px; font-weight: 700;
  cursor: pointer; letter-spacing: -0.015em;
  white-space: nowrap;
  border-radius: 14px;
  margin: 9px 9px 9px 0;
  transition: transform 0.5s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.5s cubic-bezier(0.2,0.8,0.2,1), background 0.3s;
  box-shadow: 0 8px 30px -6px rgba(0,82,255,0.48);
  min-height: 50px;
  position: relative; overflow: hidden;
}
/* Micro-shimmer on the button */
.sbtn::before {
  content: '';
  position: absolute;
  top: 0; left: -75%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  transform: skewX(-15deg);
  transition: left 0s;
}
.sbtn:hover:not(:disabled)::before {
  animation: btnShimmer .55s ease forwards;
}
@keyframes btnShimmer {
  from { left: -75%; }
  to   { left: 130%; }
}
.sbtn:hover:not(:disabled) {
  transform: scale(1.055);
  box-shadow: 0 14px 40px -6px rgba(0,82,255,0.60);
  background: var(--brand-deep);
}
.sbtn:active:not(:disabled) {
  transform: scale(0.97);
  box-shadow: 0 4px 16px rgba(0,82,255,0.38);
}
.sbtn:disabled { opacity: .50; cursor: not-allowed; }
.spin {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.30);
  border-top-color: #fff; border-radius: 50%;
  animation: sp .75s linear infinite; display: inline-block;
}
@keyframes sp { to { transform: rotate(360deg); } }

.errmsg {
  color: var(--carmine); font-size: 13px;
  padding: 10px 20px 14px; text-align: center;
}

/* ── Stats row ── */
.stats {
  display: flex; align-items: center;
  gap: 0; flex-wrap: wrap; justify-content: center;
}
.stat {
  display: flex; flex-direction: column; align-items: center;
  padding: 0 28px;
}
.stat strong {
  font-family: 'JetBrains Mono', monospace;
  font-size: 23px; font-weight: 800;
  color: var(--ink); letter-spacing: -0.04em; line-height: 1;
}
.stat span {
  font-size: 10px; color: var(--ink-pale);
  margin-top: 5px; letter-spacing: 0.09em; text-transform: uppercase;
  font-variant: small-caps; font-weight: 600;
}
.sdot {
  width: 1px; height: 28px;
  background: rgba(0,52,255,0.07); flex-shrink: 0;
}

/* ════════════════════════════════════════════════════
   HOW IT WORKS — dark panel, refined
════════════════════════════════════════════════════ */
.how-section {
  background: #0A0F1E;
  padding: 112px 24px;
}
.how-section .sec-head .tag {
  background: rgba(0,181,163,0.12);
  border-color: rgba(0,181,163,0.22);
  color: var(--emerald);
}
.how-section .sec-head h2 { color: #F0F4FF; }
.how-section .sec-head h2 em { color: var(--emerald); font-style: normal; }
.container { max-width: 1100px; margin: 0 auto; }

.steps {
  display: flex; align-items: flex-start;
  gap: 0; justify-content: center;
}
.step {
  flex: 1; max-width: 300px;
  text-align: center;
  padding: 44px 28px 40px;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 24px;
  position: relative;
  transition: all 0.48s cubic-bezier(0.4,0,0.2,1);
}
.step::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: 24px;
  background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,82,255,0.08) 0%, transparent 70%);
  opacity: 0; transition: opacity .48s;
}
.step:hover { background: rgba(255,255,255,0.06); border-color: rgba(0,82,255,0.25); transform: translateY(-7px); box-shadow: 0 28px 64px rgba(0,0,0,0.28); }
.step:hover::before { opacity: 1; }
.step-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 800;
  color: rgba(0,181,163,0.65); letter-spacing: 0.15em;
  margin-bottom: 22px; text-transform: uppercase; position: relative; z-index: 1;
}
.step-icon {
  font-size: 28px;
  width: 66px; height: 66px;
  background: rgba(0,82,255,0.13);
  border: 1px solid rgba(0,82,255,0.18);
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 22px; position: relative; z-index: 1;
}
.step h3 { font-size: 16px; font-weight: 700; color: #F0F4FF; letter-spacing: -0.03em; margin: 0 0 10px; position: relative; z-index: 1; }
.step p  { font-size: 13.5px; color: rgba(255,255,255,0.38); line-height: 1.72; margin: 0; position: relative; z-index: 1; }
.step-arrow { font-size: 18px; color: rgba(0,82,255,0.25); flex-shrink: 0; align-self: center; }

/* ════════════════════════════════════════════════════
   FEATURES — Bento Grid "Por qué UrbIA"
════════════════════════════════════════════════════ */
.sec-features {
  background: linear-gradient(180deg, #F5F8FF 0%, #FAFCFF 40%, #FFFFFF 80%);
  padding: 112px 24px;
}

.sec-head { text-align: center; margin-bottom: 72px; }
.tag {
  display: inline-block;
  font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.13em; text-transform: uppercase;
  color: var(--brand); margin-bottom: 16px;
  background: rgba(0,82,255,0.055);
  padding: 5px 14px; border-radius: 999px;
  border: 1px solid rgba(0,82,255,0.13);
}
.sec-head h2 {
  font-size: clamp(32px,5vw,62px);
  font-weight: 800; letter-spacing: -0.05em;
  color: var(--ink); line-height: 1.04; margin: 0;
  text-wrap: balance;
}
.sec-head h2 em { font-style: normal; color: var(--brand); }

/* Bento grid */
.feat-grid {
  display: grid;
  grid-template-columns: repeat(6,1fr);
  gap: 18px; margin-bottom: 72px;
}
.fcard {
  padding: 34px 30px;
  border-radius: 24px;
  border: 1px solid rgba(0,52,255,0.055);
  background: #FFFFFF;
  box-shadow:
    0 10px 48px -16px rgba(0,52,255,0.09),
    0 2px 8px rgba(0,0,0,0.025);
  transition: all 0.48s cubic-bezier(0.4,0,0.2,1);
  animation: fci .55s cubic-bezier(.22,.83,.27,1) calc(var(--i)*65ms) both;
  position: relative; overflow: hidden;
}
.fcard::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 70% 50% at 0% 0%, rgba(0,82,255,0.04) 0%, transparent 70%);
  opacity: 0; transition: opacity .48s;
}
.fcard:hover::before { opacity: 1; }
.fcard:nth-child(1) { grid-column: span 4; }
.fcard:nth-child(2) { grid-column: span 2; }
.fcard:nth-child(3) { grid-column: span 2; }
.fcard:nth-child(4) { grid-column: span 2; }
.fcard:nth-child(5) { grid-column: span 2; }
.fcard:nth-child(6) { grid-column: span 6; display: flex; gap: 32px; align-items: center; }
.fcard:nth-child(6) .ficon { margin-bottom: 0; flex-shrink: 0; }
.fcard:nth-child(6) h3 { margin-bottom: 4px; }
@keyframes fci { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
.fcard:hover {
  transform: translateY(-7px);
  box-shadow:
    0 28px 56px -12px rgba(0,52,255,0.12),
    0 4px 14px rgba(0,0,0,0.035);
  border-color: rgba(0,82,255,0.10);
}
/* Duo-tone icon container */
.ficon {
  font-size: 22px; width: 54px; height: 54px;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(0,82,255,0.08) 0%, rgba(0,82,255,0.14) 100%);
  border: 1px solid rgba(0,82,255,0.10);
  display: grid; place-items: center;
  margin-bottom: 20px; position: relative; z-index: 1;
}
.fcard h3 { font-size: 15px; font-weight: 700; color: var(--ink); letter-spacing: -0.03em; margin: 0 0 9px; position: relative; z-index: 1; }
.fcard p  { font-size: 13px; color: var(--ink-mid); line-height: 1.68; margin: 0; position: relative; z-index: 1; }

/* ════════════════════════════════════════════════════
   SEMÁFORO EXPLAINER — "Masterpiece" frame
════════════════════════════════════════════════════ */
.semaforo-card {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 56px; align-items: center;
  background: #0B1022;
  border-radius: 28px; padding: 60px 60px;
  overflow: visible; position: relative;
  /* Metallic edge glow */
  box-shadow:
    0 0 0 1px rgba(200,210,240,0.15),
    0 40px 100px rgba(0,0,0,0.38),
    inset 0 1px 0 rgba(255,255,255,0.07);
}
/* Ambient blue radial inside the card */
.semaforo-card::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 55% 80% at 82% 50%, rgba(0,82,255,0.18) 0%, transparent 68%);
  border-radius: 28px;
  pointer-events: none;
}
/* Metallic border gradient — the "Masterpiece" frame */
.semaforo-card::after {
  content: '';
  position: absolute; inset: -1px;
  border-radius: 29px;
  background: linear-gradient(
    125deg,
    rgba(200,210,240,0.32) 0%,
    rgba(80,100,160,0.06) 25%,
    rgba(197,148,0,0.22) 52%,
    rgba(240,208,96,0.14) 65%,
    rgba(200,210,240,0.28) 100%
  );
  z-index: -1;
  pointer-events: none;
}
.sem-copy { position: relative; z-index: 1; }
.sem-copy .tag {
  background: rgba(0,82,255,0.14);
  border-color: rgba(0,82,255,0.24);
  color: rgba(0,181,163,0.90);
  margin-bottom: 16px;
}
.sem-copy h3 {
  font-size: clamp(22px,2.8vw,34px); font-weight: 800;
  color: #fff; letter-spacing: -0.038em; margin: 0 0 16px; line-height: 1.18;
}
.sem-copy > p { font-size: 14px; color: rgba(255,255,255,.45); line-height: 1.70; margin: 0 0 32px; }
.sem-legend { display: flex; flex-direction: column; gap: 16px; }
.sem-item { display: flex; align-items: center; gap: 14px; }
.sem-item div { display: flex; flex-direction: column; gap: 2px; }
.sem-item strong { font-size: 13px; color: #fff; font-weight: 600; }
.sem-item span { font-size: 12px; color: rgba(255,255,255,.38); }
.sem-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
/* Luxury semaphore colors */
.sem-dot.green  { background: #00B5A3; box-shadow: 0 0 14px rgba(0,181,163,0.70); }
.sem-dot.yellow { background: #C59400; box-shadow: 0 0 14px rgba(197,148,0,0.70); }
.sem-dot.red    { background: #E11D48; box-shadow: 0 0 14px rgba(225,29,72,0.70); }

/* Mock card — the showcase */
.sem-mock { position: relative; z-index: 1; }
.mock-card {
  background: #fff; border-radius: 20px;
  padding: 26px;
  box-shadow: 0 32px 72px rgba(0,0,0,0.44), 0 0 0 1px rgba(0,0,0,0.04);
}
.mock-label {
  font-size: 9.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: #9CA3AF; margin-bottom: 12px;
}
.mock-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; gap: 8px;
}
.mock-addr {
  font-size: 12px; color: #6B7280; font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
}
.mock-badge {
  font-size: 10.5px; font-weight: 700; border-radius: 9px;
  padding: 4px 11px; white-space: nowrap;
}
.green-badge { background: rgba(0,181,163,0.09); color: #00B5A3; border: 1px solid rgba(0,181,163,0.22); }
.mock-price {
  font-size: 30px; font-weight: 800; color: #1A1A1A;
  letter-spacing: -0.045em; margin-bottom: 4px;
  font-family: 'JetBrains Mono', monospace;
}
.mock-meta { font-size: 12px; color: #9CA3AF; margin-bottom: 18px; }
.mock-verdict {
  background: rgba(0,181,163,0.065);
  border: 1px solid rgba(0,181,163,0.18);
  border-radius: 11px; padding: 11px 15px; margin-bottom: 16px;
}
.verdict-text { font-size: 13px; color: #007B70; line-height: 1.55; margin: 0; }
.verdict-text strong { font-weight: 700; }
.mock-prices { display: flex; flex-direction: column; gap: 7px; }
.mp-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; }
.mp-label { color: #9CA3AF; }
.mp-val { font-weight: 700; }
.asking   { color: var(--ink); font-family: 'JetBrains Mono', monospace; }
.notarial { color: var(--emerald); font-family: 'JetBrains Mono', monospace; }
/* Gap row — the authority number */
.mp-row:last-child {
  display: flex; flex-direction: column;
  align-items: center; gap: 3px;
  margin-top: 14px; padding-top: 14px;
  border-top: 1px solid rgba(0,181,163,0.13);
}
.mp-row:last-child .mp-label {
  font-size: 9px; letter-spacing: 0.14em;
  text-transform: uppercase; font-variant: small-caps;
}
/* The authority figure */
.gap-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 48px; font-weight: 800;
  letter-spacing: -0.05em;
  color: var(--emerald);
  line-height: 1;
  text-shadow: 0 0 32px rgba(0,181,163,0.20);
}

/* ── GDPR toast ── */
.gdpr {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 16px;
  background: rgba(15,23,42,0.96); backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.09); border-radius: 16px;
  padding: 13px 22px; font-size: 13px; color: rgba(255,255,255,.55);
  z-index: 9999; white-space: nowrap;
  box-shadow: 0 8px 36px rgba(0,0,0,.32);
}
.gdpr button {
  background: #fff; color: #1A1A1A; border: none;
  border-radius: 9px; padding: 8px 18px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: opacity .2s;
}
.gdpr button:hover { opacity: .85; }

/* ════════════════════════════════════════
   TOOLS STRIP
════════════════════════════════════════ */
.tools-strip {
  background: #F8FAFF;
  border-top: 1px solid rgba(0,82,255,.07);
  border-bottom: 1px solid rgba(0,82,255,.07);
  padding: 20px 24px;
}
.tools-inner { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.tools-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #94A3B8; }
.tools-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.tool-chip {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: 999px;
  border: 1px solid rgba(0,82,255,.12); background: #fff;
  color: #374151; font-size: 12px; font-weight: 500;
  text-decoration: none; transition: all .2s; cursor: pointer;
}
.tool-chip:hover { border-color: #0052FF; color: #0052FF; background: #EEF4FF; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,82,255,.1); }
.tool-chip-icon { font-size: 14px; }
.tool-chip-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; background: rgba(0,82,255,.1); color: #0052FF; border-radius: 20px; }

/* ════════════════════════════════════════
   RESPONSIVE
════════════════════════════════════════ */
@media (max-width: 960px) {
  .feat-grid { grid-template-columns: repeat(2,1fr); }
  .fcard:nth-child(1), .fcard:nth-child(2),
  .fcard:nth-child(3), .fcard:nth-child(4),
  .fcard:nth-child(5), .fcard:nth-child(6) { grid-column: span 1; }
  .fcard:nth-child(6) { display: block; }
  .fcard:nth-child(6) .ficon { margin-bottom: 20px; }
  .semaforo-card { grid-template-columns: 1fr; padding: 44px 32px; }
  .steps { flex-direction: column; align-items: center; gap: 10px; }
  .step-arrow { transform: rotate(90deg); }
}
@media (max-width: 640px) {
  .srow1, .srow2 { flex-direction: column; min-height: auto; }
  .sdiv { width: calc(100% - 32px); height: 1px; margin: 0 16px; }
  .sbtn { border-radius: 14px; justify-content: center; margin: 8px 12px; }
  .tl-cards { gap: 10px; }
  .feat-grid { grid-template-columns: 1fr; }
  .semaforo-card { padding: 36px 24px; }
}
  `]
})
export class LandingHeroComponent implements OnInit, OnDestroy {
  private fb     = inject(FormBuilder);
  private svc    = inject(BusquedaService);
  private router = inject(Router);

  readonly municipios = MUNICIPIOS;
  cargando = false;
  errorMsg = '';
  gdpr = true;
  v = false; // entrance visible

  form = this.fb.group({
    municipio:    ['madrid', Validators.required],
    barrio:       [''],
    precioMaximo: [null as number | null],
    m2Min:        [null as number | null],
    habitaciones: [null as number | null],
    exterior:     [false],
    ascensor:     [false],
  });

  readonly tools = [
    { icon: '🤖', label: 'Asistente IA', path: '/asistente', badge: 'Nuevo' },
    { icon: '🗺️', label: 'Mapa de pisos', path: '/mapa-resultados', badge: null },
    { icon: '🏘️', label: 'Ranking barrios', path: '/barrios', badge: 'IA' },
    { icon: '🏦', label: 'Hipotecas', path: '/hipotecas', badge: null },
    { icon: '🛡️', label: 'Seguros hogar', path: '/seguros', badge: 'Nuevo' },
    { icon: '🧾', label: 'Gastos compra', path: '/costes-compra', badge: 'Nuevo' },
    { icon: '📊', label: 'Estadísticas', path: '/estadisticas', badge: null },
    { icon: '🏛️', label: 'Catastro', path: '/catastro', badge: null },
  ];

  readonly feats = [
    { e:'🚦', t:'Semáforo de precios',   d:'Compara el precio pedido con la transacción notarial real de la zona. Verde, amarillo o rojo al instante.' },
    { e:'🤖', t:'Asistente IA 24/7',     d:'Pregunta cualquier cosa sobre barrios, hipotecas o precios en lenguaje natural. Respuestas instantáneas.' },
    { e:'🏘️', t:'Ranking de barrios',    d:'Scoring IA de calidad de vida, seguridad, colegios y transporte para cada barrio. Encuentra el tuyo.' },
    { e:'🔔', t:'Alertas de precio',     d:'Configura alertas y recibe notificaciones cuando un inmueble infravalorado aparezca en tu zona.' },
    { e:'🛡️', t:'Seguros de hogar',      d:'Compara las mejores pólizas del mercado. Precios, coberturas y franquicias lado a lado.' },
    { e:'🧾', t:'Calculadora de gastos', d:'ITP, AJD, notaría, registro y gestoría calculados automáticamente por CCAA. Sin sorpresas al firmar.' },
  ];

  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.timer = setTimeout(() => this.v = true, 80);
  }
  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  async buscar(): Promise<void> {
    this.errorMsg = '';
    this.cargando = true;
    const v = this.form.value;
    const filtros: BusquedaFiltros = {
      municipio:    v.municipio!,
      barrio:       v.barrio || undefined,
      precioMaximo: v.precioMaximo ?? 0,
      m2Min:        v.m2Min ?? undefined,
      habitaciones: v.habitaciones ?? undefined,
      exterior:     v.exterior ?? undefined,
      ascensor:     v.ascensor ?? undefined,
    };
    try {
      await this.svc.buscar(filtros);
      this.router.navigate(['/mapa-resultados']);
    } catch {
      this.errorMsg = 'No se pudo conectar. Inténtalo de nuevo.';
    } finally {
      this.cargando = false;
    }
  }
}
