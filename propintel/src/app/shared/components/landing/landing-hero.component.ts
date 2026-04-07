import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
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
  imports: [ReactiveFormsModule],
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
      <div class="stat"><strong>3</strong><span>fuentes de datos</span></div>
      <div class="sdot"></div>
      <div class="stat"><strong>Gratis</strong><span>para empezar</span></div>
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
/* ═══════════════════════════════════════════════
   HERO — Light premium (Apple + Airbnb style)
═══════════════════════════════════════════════ */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #ffffff;
  padding-top: 64px; /* navbar height */
}

/* Subtle background blobs */
.hero-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.blob {
  position: absolute; border-radius: 50%;
  filter: blur(80px); opacity: 0.5;
}
.b1 {
  width: 700px; height: 500px;
  background: radial-gradient(circle, rgba(219,234,254,0.8) 0%, transparent 70%);
  top: -100px; left: -150px;
}
.b2 {
  width: 600px; height: 500px;
  background: radial-gradient(circle, rgba(224,231,255,0.6) 0%, transparent 70%);
  top: 100px; right: -150px;
}

/* Hero body */
.hero-body {
  position: relative; z-index: 1;
  width: 100%; max-width: 860px;
  padding: 80px 24px 80px;
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 0;
}

/* Entrance animation */
.pill, .h1, .sub, .tl-cards, .sbox, .stats {
  opacity: 0; transform: translateY(20px);
  transition: opacity .6s ease, transform .6s ease;
}
.pill.in      { opacity: 1; transform: none; transition-delay: .05s; }
.h1.in        { opacity: 1; transform: none; transition-delay: .15s; }
.sub.in       { opacity: 1; transform: none; transition-delay: .25s; }
.tl-cards.in  { opacity: 1; transform: none; transition-delay: .32s; }
.sbox.in      { opacity: 1; transform: none; transition-delay: .42s; }
.stats.in     { opacity: 1; transform: none; transition-delay: .55s; }

/* Pill badge */
.pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 999px;
  padding: 6px 16px;
  font-size: 12px; font-weight: 500;
  color: #1D4ED8;
  letter-spacing: 0.02em;
  margin-bottom: 28px;
}
.live-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #22C55E;
  box-shadow: 0 0 8px rgba(34,197,94,0.8);
  animation: puls 2.4s ease-in-out infinite;
}
@keyframes puls { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }

/* Headline */
.h1 {
  font-size: clamp(38px, 5.5vw, 72px);
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.04em;
  color: #1A1A1A;
  margin: 0 0 20px;
}
.h1-accent {
  color: #2563EB;
}

/* Subtitle */
.sub {
  font-size: 17px;
  color: #6B7280;
  line-height: 1.65;
  letter-spacing: -0.01em;
  max-width: 480px;
  margin: 0 0 36px;
}
.sub strong { color: #374151; font-weight: 600; }

/* ── TRAFFIC LIGHT CARDS ── */
.tl-cards {
  display: flex; gap: 12px;
  margin: 0 0 36px;
  flex-wrap: wrap; justify-content: center;
}
.tl-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px; border-radius: 12px;
  font-size: 13px; border: 1px solid transparent;
}
.tl-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.tl-pct { font-size: 16px; font-weight: 800; letter-spacing: -0.03em; }
.tl-label { font-size: 11px; font-weight: 500; margin-top: 1px; opacity: 0.75; }

.tl-green { background: #F0FDF4; border-color: #BBF7D0; }
.tl-green .tl-dot { background: #16A34A; }
.tl-green .tl-pct { color: #15803D; }
.tl-green .tl-label { color: #166534; }

.tl-yellow { background: #FFFBEB; border-color: #FDE68A; }
.tl-yellow .tl-dot { background: #F59E0B; }
.tl-yellow .tl-pct { color: #D97706; }
.tl-yellow .tl-label { color: #92400E; }

.tl-red { background: #FEF2F2; border-color: #FECACA; }
.tl-red .tl-dot { background: #DC2626; }
.tl-red .tl-pct { color: #DC2626; }
.tl-red .tl-label { color: #991B1B; }

/* ── SEARCH BOX ── */
.sbox {
  width: 100%; max-width: 820px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(37,99,235,0.08), 0 0 0 1px rgba(0,0,0,0.05);
  overflow: hidden;
  margin-bottom: 36px;
  transition: box-shadow .3s, transform .3s;
}
.sbox:focus-within {
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 12px 40px rgba(37,99,235,0.14), 0 0 0 2px #2563EB;
  transform: translateY(-2px);
}

.srow {
  display: flex;
  align-items: stretch;
}
.srow1 { min-height: 68px; }
.srow2 {
  min-height: 60px;
  border-top: 1px solid #F3F4F6;
  background: #FAFAFA;
}

.sf {
  display: flex; flex-direction: column;
  justify-content: center;
  padding: 10px 20px;
  flex: 1; min-width: 0;
}
.sf-checks { flex: 1.4; }

.slabel {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: #9CA3AF; margin-bottom: 4px;
  white-space: nowrap;
}

.si {
  border: none; outline: none; background: transparent;
  font-size: 14px; font-weight: 600; color: #1A1A1A;
  font-family: inherit; width: 100%;
  appearance: none; -webkit-appearance: none;
  cursor: pointer; letter-spacing: -0.01em;
}
.si::placeholder { color: #9CA3AF; font-weight: 400; }

.sdiv {
  width: 1px; background: #F3F4F6;
  margin: 10px 0; flex-shrink: 0;
}

/* Checkboxes */
.checks { display: flex; gap: 16px; align-items: center; }
.ck {
  display: flex; align-items: center; gap: 7px;
  font-size: 13px; font-weight: 500; color: #374151;
  cursor: pointer; user-select: none;
}
.ck input { display: none; }
.ck-box {
  width: 16px; height: 16px;
  border: 1.5px solid #D1D5DB; border-radius: 4px;
  background: #fff; flex-shrink: 0;
  transition: background .15s, border-color .15s;
  position: relative;
}
.ck input:checked ~ .ck-box {
  background: #2563EB; border-color: #2563EB;
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

/* Search button */
.sbtn {
  display: flex; align-items: center; gap: 8px;
  background: #2563EB;
  color: #fff; border: none;
  padding: 0 28px;
  font-size: 14px; font-weight: 700;
  cursor: pointer; letter-spacing: -0.01em;
  white-space: nowrap;
  border-radius: 12px;
  margin: 8px 8px 8px 0;
  transition: background .2s, transform .2s, box-shadow .2s;
  box-shadow: 0 2px 8px rgba(37,99,235,0.25);
  min-height: 44px;
}
.sbtn:hover:not(:disabled) {
  background: #1D4ED8;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(37,99,235,0.35);
}
.sbtn:disabled { opacity: .6; cursor: not-allowed; }
.spin {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.35);
  border-top-color: #fff; border-radius: 50%;
  animation: sp .7s linear infinite; display: inline-block;
}
@keyframes sp { to { transform: rotate(360deg); } }
.errmsg {
  color: #DC2626; font-size: 13px;
  padding: 10px 20px 14px; text-align: center;
}

/* Stats bar */
.stats {
  display: flex; align-items: center;
  gap: 0; flex-wrap: wrap; justify-content: center;
}
.stat {
  display: flex; flex-direction: column; align-items: center;
  padding: 0 24px;
}
.stat strong {
  font-size: 22px; font-weight: 800;
  color: #1A1A1A; letter-spacing: -0.03em; line-height: 1;
}
.stat span {
  font-size: 11px; color: #9CA3AF;
  margin-top: 3px; letter-spacing: 0.04em; text-transform: uppercase;
}
.sdot {
  width: 1px; height: 26px;
  background: #E5E7EB; flex-shrink: 0;
}

/* ═══════════════════════════════════════════════
   HOW IT WORKS SECTION
═══════════════════════════════════════════════ */
.how-section {
  background: #F7F9FB;
  padding: 100px 24px;
  border-top: 1px solid #F3F4F6;
}
.container { max-width: 1100px; margin: 0 auto; }

.steps {
  display: flex;
  align-items: flex-start;
  gap: 0;
  justify-content: center;
}
.step {
  flex: 1; max-width: 280px;
  text-align: center;
  padding: 32px 24px;
}
.step-num {
  font-size: 11px; font-weight: 800;
  color: #2563EB; letter-spacing: 0.1em;
  margin-bottom: 16px;
}
.step-icon {
  font-size: 32px;
  margin-bottom: 16px;
  width: 64px; height: 64px;
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.step h3 {
  font-size: 16px; font-weight: 700; color: #1A1A1A;
  letter-spacing: -0.02em; margin: 0 0 10px;
}
.step p {
  font-size: 14px; color: #6B7280; line-height: 1.6; margin: 0;
}
.step-arrow {
  font-size: 24px; color: #D1D5DB;
  padding-top: 36px; flex-shrink: 0;
  align-self: flex-start;
  margin-top: 32px;
}

/* ═══════════════════════════════════════════════
   FEATURES SECTION
═══════════════════════════════════════════════ */
.sec-features {
  background: #fff;
  padding: 100px 24px;
}

.sec-head {
  text-align: center; margin-bottom: 64px;
}
.tag {
  display: inline-block;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: #2563EB; margin-bottom: 14px;
  background: #EFF6FF;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid #BFDBFE;
}
.sec-head h2 {
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 800; letter-spacing: -0.04em;
  color: #1A1A1A; line-height: 1.1; margin: 0;
}
.sec-head h2 em {
  font-style: normal; color: #2563EB;
}

/* Feature cards */
.feat-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 16px; margin-bottom: 64px;
}
.fcard {
  padding: 28px 24px;
  border-radius: 16px;
  border: 1px solid #F3F4F6;
  background: #FAFAFA;
  transition: transform .3s, box-shadow .3s, border-color .3s;
  animation: fci .5s cubic-bezier(.22,.83,.27,1) calc(var(--i)*60ms) both;
}
@keyframes fci { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
.fcard:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.07);
  border-color: #DBEAFE;
}
.ficon {
  font-size: 22px; width: 48px; height: 48px;
  border-radius: 12px; background: #EFF6FF;
  display: grid; place-items: center;
  margin-bottom: 16px;
}
.fcard h3 {
  font-size: 15px; font-weight: 700; color: #1A1A1A;
  letter-spacing: -0.02em; margin: 0 0 8px;
}
.fcard p {
  font-size: 13px; color: #6B7280; line-height: 1.6; margin: 0;
}

/* ── SEMÁFORO EXPLAINER ── */
.semaforo-card {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 56px; align-items: center;
  background: #1A1A1A;
  border-radius: 24px; padding: 56px 56px;
  overflow: hidden; position: relative;
}
.semaforo-card::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 50% 70% at 85% 50%, rgba(37,99,235,0.2) 0%, transparent 70%);
}
.sem-copy { position: relative; z-index: 1; }
.sem-copy .tag {
  background: rgba(37,99,235,0.2);
  border-color: rgba(37,99,235,0.3);
  color: #93C5FD;
  margin-bottom: 14px;
}
.sem-copy h3 {
  font-size: clamp(22px, 2.8vw, 32px); font-weight: 800;
  color: #fff; letter-spacing: -0.035em; margin: 0 0 14px; line-height: 1.2;
}
.sem-copy > p { font-size: 14px; color: rgba(255,255,255,.5); line-height: 1.65; margin: 0 0 28px; }
.sem-legend { display: flex; flex-direction: column; gap: 14px; }
.sem-item {
  display: flex; align-items: center; gap: 12px;
  font-size: 14px; color: rgba(255,255,255,.7);
}
.sem-item div { display: flex; flex-direction: column; gap: 2px; }
.sem-item strong { font-size: 13px; color: #fff; font-weight: 600; }
.sem-item span { font-size: 12px; color: rgba(255,255,255,.4); }
.sem-dot {
  width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
}
.sem-dot.green  { background: #22C55E; box-shadow: 0 0 10px rgba(34,197,94,0.6); }
.sem-dot.yellow { background: #F59E0B; box-shadow: 0 0 10px rgba(245,158,11,0.6); }
.sem-dot.red    { background: #EF4444; box-shadow: 0 0 10px rgba(239,68,68,0.6); }

/* Mock card */
.sem-mock { position: relative; z-index: 1; }
.mock-card {
  background: #fff; border-radius: 18px;
  padding: 24px; box-shadow: 0 24px 56px rgba(0,0,0,0.4);
}
.mock-label {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: #9CA3AF; margin-bottom: 10px;
}
.mock-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; gap: 8px;
}
.mock-addr { font-size: 12px; color: #6B7280; font-weight: 500; }
.mock-badge {
  font-size: 11px; font-weight: 700; border-radius: 8px;
  padding: 4px 10px; white-space: nowrap;
}
.green-badge { background: #F0FDF4; color: #15803D; }
.mock-price {
  font-size: 28px; font-weight: 800; color: #1A1A1A;
  letter-spacing: -0.04em; margin-bottom: 4px;
}
.mock-meta { font-size: 12px; color: #9CA3AF; margin-bottom: 16px; }

.mock-verdict {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 14px;
}
.verdict-text {
  font-size: 13px; color: #166534; line-height: 1.5; margin: 0;
}
.verdict-text strong { font-weight: 700; }

.mock-prices { display: flex; flex-direction: column; gap: 6px; }
.mp-row {
  display: flex; justify-content: space-between;
  font-size: 12px;
}
.mp-label { color: #9CA3AF; }
.mp-val { font-weight: 700; }
.asking  { color: #1A1A1A; }
.notarial { color: #16A34A; }
.gap-val { color: #16A34A; }

/* GDPR */
.gdpr {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 16px;
  background: rgba(26,26,26,0.95); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,.1); border-radius: 14px;
  padding: 12px 20px; font-size: 13px; color: rgba(255,255,255,.6);
  z-index: 9999; white-space: nowrap;
  box-shadow: 0 8px 32px rgba(0,0,0,.3);
}
.gdpr button {
  background: #fff; color: #1A1A1A; border: none;
  border-radius: 8px; padding: 7px 16px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: opacity .2s;
}
.gdpr button:hover { opacity: .85; }

/* RESPONSIVE */
@media (max-width: 960px) {
  .feat-grid { grid-template-columns: repeat(2,1fr); }
  .semaforo-card { grid-template-columns: 1fr; padding: 40px 28px; }
  .steps { flex-direction: column; align-items: center; gap: 8px; }
  .step-arrow { transform: rotate(90deg); padding: 0; margin: 0; }
}
@media (max-width: 640px) {
  .srow1, .srow2 { flex-direction: column; min-height: auto; }
  .sdiv { width: calc(100% - 32px); height: 1px; margin: 0 16px; }
  .sbtn { border-radius: 12px; justify-content: center; margin: 8px 12px; }
  .tl-cards { gap: 8px; }
  .feat-grid { grid-template-columns: 1fr; }
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

  readonly feats = [
    { e:'🚦', t:'Semáforo de precios',   d:'Compara el precio pedido con la transacción notarial real de la zona. Verde, amarillo o rojo al instante.' },
    { e:'🗺️', t:'Mapa inteligente',      d:'Todos los inmuebles en un mapa con pines de colores que muestran el % de desviación respecto al mercado.' },
    { e:'🏛️', t:'Datos de catastro',     d:'Superficie real, año de construcción, referencia catastral y valor fiscal de cada inmueble.' },
    { e:'🔔', t:'Alertas de precio',     d:'Configura alertas y recibe notificaciones cuando un inmueble infravalorado aparezca en tu zona.' },
    { e:'📊', t:'AVM Valoración',         d:'Modelo de valoración automática que estima el precio real basándose en comparables y datos de mercado.' },
    { e:'🤝', t:'Asesor de compra',      d:'Hipoteca, negociación y firma: te acompañamos en cada paso del proceso de compra.' },
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
