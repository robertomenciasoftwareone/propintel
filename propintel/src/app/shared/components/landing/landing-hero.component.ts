import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-landing-hero',
  standalone: true,
  imports: [RouterLink, FormsModule, NgClass],
  template: `

<!-- ═══════ HERO ═══════ -->
<section class="hero">

  <div class="hero-bg">
    <div class="blob b1"></div>
    <div class="blob b2"></div>
    <div class="blob b3"></div>
  </div>

  <div class="hero-wrap">

    <!-- ── LEFT: Identity + Chat ── -->
    <div class="hero-left" [class.in]="v">

      <div class="pill">
        <span class="live-dot"></span>
        IA inmobiliaria · Madrid
      </div>

      <h1 class="h1">
        Hola, soy <span class="h1-brand">UrbIA</span><br>
        <span class="h1-accent">Tu copiloto</span><br>
        para comprar piso
      </h1>

      <p class="sub">
        Pregúntame sobre precios, barrios o hipotecas.<br>
        Analizo datos reales del mercado y notaría.
      </p>

      <!-- Chat Input -->
      <div class="chat-wrap" [class.focused]="chatFocused">
        <div class="chat-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </div>
        <input
          type="text"
          [(ngModel)]="chatQuery"
          (keydown.enter)="enviarChat()"
          (focus)="chatFocused = true"
          (blur)="chatFocused = false"
          placeholder="Busco piso de 3 hab en Salamanca hasta 400k…"
          class="chat-input"
          autocomplete="off"
        />
        <button class="chat-send" (click)="enviarChat()" [disabled]="!chatQuery.trim()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <!-- Free stripe -->
      <div class="free-stripe">
        <span class="fs-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Gratis para siempre
        </span>
        <span class="fs-dot">·</span>
        <span class="fs-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Sin tarjeta
        </span>
        <span class="fs-dot">·</span>
        <span class="fs-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Madrid y área metropolitana
        </span>
      </div>

      <!-- Quick actions -->
      <div class="quick-actions">
        <a routerLink="/mapa-resultados" class="qa">
          <span class="qa-icon">🗺️</span>
          <span>Mapa de pisos</span>
        </a>
        <a routerLink="/catastro" class="qa">
          <span class="qa-icon">🏛️</span>
          <span>Tasación AVM</span>
        </a>
        <a routerLink="/hipotecas" class="qa">
          <span class="qa-icon">💰</span>
          <span>Hipoteca</span>
        </a>
        <a routerLink="/estadisticas" class="qa">
          <span class="qa-icon">📊</span>
          <span>Estadísticas</span>
        </a>
      </div>

    </div>

    <!-- ── RIGHT: Ideas + Tendencias ── -->
    <div class="hero-right" [class.in]="v">

      <!-- Ideas para empezar -->
      <div class="r-panel">
        <div class="r-panel-header">
          <span class="r-tag">IDEAS PARA EMPEZAR</span>
        </div>
        <div class="ideas-grid">
          @for (idea of ideas; track idea.texto) {
            <button class="idea-card" (click)="usarSugerencia(idea.texto)">
              <span class="idea-icon">{{ idea.icon }}</span>
              <span class="idea-body">
                <span class="idea-cat">{{ idea.cat }}</span>
                <span class="idea-text">{{ idea.texto }}</span>
              </span>
              <svg class="idea-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          }
        </div>
      </div>

      <!-- Tendencias -->
      <div class="r-panel">
        <div class="r-panel-header">
          <span class="r-tag">TENDENCIAS</span>
        </div>
        <div class="tend-list">
          @for (t of tendencias; track t.texto; let i = $index) {
            <button class="tend-row" (click)="usarSugerencia(t.texto)">
              <span class="tend-num">{{ (i + 1).toString().padStart(2, '0') }}</span>
              <span class="tend-text">{{ t.texto }}</span>
              <span class="tend-badge" [ngClass]="t.clase">{{ t.badge }}</span>
            </button>
          }
        </div>
      </div>

    </div>

  </div>

  <!-- Stats -->
  <div class="stats" [class.in]="v">
    <div class="stat"><strong>+50k</strong><span>inmuebles</span></div>
    <div class="sdot"></div>
    <div class="stat"><strong>32</strong><span>municipios</span></div>
    <div class="sdot"></div>
    <div class="stat"><strong>Gemini</strong><span>IA integrada</span></div>
    <div class="sdot"></div>
    <div class="stat"><strong>Gratis</strong><span>para empezar</span></div>
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
      <span class="tag tag-blue">Por qué UrbIA</span>
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
        <span class="tag tag-blue">Exclusivo UrbIA</span>
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
   LANDING HERO — Chat-First · Dark · UrbIA
════════════════════════════════════════════════════════ */

:host {
  --brand:        #0052FF;
  --brand-deep:   #0041CC;
  --emerald:      #00B5A3;
  --gold:         #C59400;
  --gold-light:   #F0D060;
  --carmine:      #E11D48;
  --ink:          #0F172A;
  --bg-dark:      #070C1C;
  --bg-card:      rgba(255,255,255,0.04);
  --border-subtle: rgba(255,255,255,0.07);
  --text-primary: #F0F4FF;
  --text-muted:   rgba(255,255,255,0.50);
  --text-dim:     rgba(255,255,255,0.28);
}

/* ── Hero wrapper ── */
.hero {
  position: relative;
  background: var(--bg-dark);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding-top: 72px;
}

/* Ambient blobs */
.hero-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.blob {
  position: absolute; border-radius: 50%;
  filter: blur(120px); opacity: 0.5;
}
.b1 {
  width: 900px; height: 700px;
  background: radial-gradient(circle, rgba(0,82,255,0.14) 0%, transparent 70%);
  top: -200px; left: -300px;
  animation: blobFloat 18s ease-in-out infinite;
}
.b2 {
  width: 700px; height: 600px;
  background: radial-gradient(circle, rgba(197,148,0,0.08) 0%, transparent 70%);
  top: 100px; right: -200px;
  animation: blobFloat 22s ease-in-out infinite reverse;
}
.b3 {
  width: 600px; height: 500px;
  background: radial-gradient(circle, rgba(0,181,163,0.07) 0%, transparent 70%);
  bottom: -100px; left: 40%;
  animation: blobFloat 26s ease-in-out infinite;
}
@keyframes blobFloat {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(30px,-40px) scale(1.04); }
  66%      { transform: translate(-22px,26px) scale(0.96); }
}

/* ── Main grid ── */
.hero-wrap {
  position: relative; z-index: 1;
  width: 100%; max-width: 1200px;
  padding: 80px 32px 60px;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 56px;
  align-items: center;
}

/* Entrance animations */
.hero-left, .hero-right, .stats {
  opacity: 0; transform: translateY(28px);
  transition: opacity .75s cubic-bezier(.22,.83,.27,1),
              transform .75s cubic-bezier(.22,.83,.27,1);
}
.hero-left.in  { opacity: 1; transform: none; transition-delay: .08s; }
.hero-right.in { opacity: 1; transform: none; transition-delay: .22s; }
.stats.in      { opacity: 1; transform: none; transition-delay: .40s; }

/* ── Pill badge ── */
.pill {
  display: inline-flex; align-items: center; gap: 9px;
  background: rgba(0,82,255,0.12);
  border: 1px solid rgba(0,82,255,0.22);
  border-radius: 999px;
  padding: 7px 18px;
  font-size: 12px; font-weight: 600;
  color: #7BA8FF;
  letter-spacing: 0.04em;
  margin-bottom: 28px;
}
.live-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--emerald);
  box-shadow: 0 0 10px rgba(0,181,163,0.90);
  animation: puls 2.6s ease-in-out infinite;
}
@keyframes puls { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.6)} }

/* ── Headline ── */
.h1 {
  font-size: clamp(38px, 4.8vw, 68px);
  font-weight: 800;
  line-height: 1.07;
  letter-spacing: -0.045em;
  color: var(--text-primary);
  margin: 0 0 20px;
  text-wrap: balance;
}
.h1-brand {
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 50%, var(--gold) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.h1-accent {
  background: linear-gradient(135deg, #7BA8FF 0%, #0052FF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Subtitle ── */
.sub {
  font-size: 16px;
  color: var(--text-muted);
  line-height: 1.72;
  letter-spacing: -0.01em;
  max-width: 480px;
  margin: 0 0 32px;
}

/* ── Chat input ── */
.chat-wrap {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.07);
  border: 1.5px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 5px 6px 5px 18px;
  gap: 10px;
  margin-bottom: 18px;
  transition: background .3s, border-color .3s, box-shadow .3s;
  backdrop-filter: blur(10px);
}
.chat-wrap.focused {
  background: rgba(255,255,255,0.10);
  border-color: rgba(197,148,0,0.50);
  box-shadow:
    0 0 0 3px rgba(197,148,0,0.08),
    0 8px 32px rgba(0,0,0,0.30);
}
.chat-icon {
  color: var(--text-dim); flex-shrink: 0;
  display: flex; align-items: center;
}
.chat-input {
  flex: 1; border: none; outline: none;
  background: transparent;
  font-size: 15px; font-weight: 400;
  color: var(--text-primary);
  font-family: inherit;
  padding: 14px 0;
  letter-spacing: -0.01em;
  min-width: 0;
}
.chat-input::placeholder { color: rgba(255,255,255,0.28); font-weight: 400; }
.chat-send {
  flex-shrink: 0;
  width: 44px; height: 44px;
  border-radius: 13px;
  border: none;
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
  color: #1A0E00;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s, opacity .2s;
  box-shadow: 0 4px 16px rgba(197,148,0,0.35);
}
.chat-send:hover:not(:disabled) {
  transform: scale(1.08);
  box-shadow: 0 6px 22px rgba(197,148,0,0.50);
}
.chat-send:active:not(:disabled) { transform: scale(0.95); }
.chat-send:disabled { opacity: .35; cursor: not-allowed; }

/* ── Free stripe ── */
.free-stripe {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}
.fs-item {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11.5px; font-weight: 500;
  color: rgba(0,181,163,0.85);
  letter-spacing: 0.01em;
}
.fs-item svg { flex-shrink: 0; }
.fs-dot { color: var(--text-dim); font-size: 12px; }

/* ── Quick actions ── */
.quick-actions {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.qa {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; border-radius: 999px;
  background: rgba(255,255,255,0.055);
  border: 1px solid rgba(255,255,255,0.10);
  color: var(--text-muted);
  font-size: 13px; font-weight: 500;
  text-decoration: none;
  letter-spacing: -0.01em;
  transition: background .22s, border-color .22s, color .22s, transform .22s;
}
.qa:hover {
  background: rgba(197,148,0,0.10);
  border-color: rgba(197,148,0,0.30);
  color: var(--gold-light);
  transform: translateY(-2px);
}
.qa-icon { font-size: 14px; }

/* ═══════════════════════════════════
   RIGHT PANEL
═══════════════════════════════════ */
.hero-right { display: flex; flex-direction: column; gap: 16px; }

.r-panel {
  background: rgba(255,255,255,0.035);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.r-panel-header { margin-bottom: 14px; }
.r-tag {
  font-size: 9.5px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--text-dim);
}

/* Ideas grid — 2x2 */
.ideas-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.idea-card {
  display: flex; align-items: flex-start;
  gap: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 14px 12px;
  cursor: pointer; text-align: left;
  transition: background .22s, border-color .22s, transform .22s;
  position: relative; overflow: hidden;
}
.idea-card::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(197,148,0,0.05) 0%, transparent 60%);
  opacity: 0; transition: opacity .22s;
  border-radius: 14px;
}
.idea-card:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(197,148,0,0.28);
  transform: translateY(-2px);
}
.idea-card:hover::before { opacity: 1; }
.idea-card:hover .idea-arrow { opacity: 1; color: var(--gold-light); }
.idea-icon { font-size: 18px; flex-shrink: 0; line-height: 1; }
.idea-body {
  display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0;
}
.idea-cat {
  font-size: 9px; font-weight: 700; letter-spacing: 0.10em;
  text-transform: uppercase; color: var(--text-dim);
}
.idea-text {
  font-size: 12px; font-weight: 500;
  color: rgba(255,255,255,0.75); line-height: 1.45;
}
.idea-arrow {
  flex-shrink: 0; opacity: 0.25; color: var(--text-muted);
  transition: opacity .22s, color .22s;
  align-self: center;
}

/* Tendencias list */
.tend-list { display: flex; flex-direction: column; gap: 1px; }
.tend-row {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 6px; border-radius: 10px;
  cursor: pointer; text-align: left;
  border: none; background: transparent;
  transition: background .18s;
  width: 100%;
}
.tend-row:hover { background: rgba(255,255,255,0.05); }
.tend-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 700;
  color: var(--text-dim); flex-shrink: 0; width: 22px;
}
.tend-text {
  flex: 1; font-size: 12.5px; font-weight: 500;
  color: rgba(255,255,255,0.68); line-height: 1.4;
  text-align: left;
}
.tend-badge {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; border-radius: 999px;
  padding: 3px 8px; white-space: nowrap; flex-shrink: 0;
}
.tend-badge.hot     { background: rgba(225,29,72,0.14); color: #FF6688; border: 1px solid rgba(225,29,72,0.22); }
.tend-badge.pop     { background: rgba(0,82,255,0.12); color: #7BA8FF; border: 1px solid rgba(0,82,255,0.20); }
.tend-badge.new-b   { background: rgba(0,181,163,0.10); color: #00B5A3; border: 1px solid rgba(0,181,163,0.20); }
.tend-badge.trend   { background: rgba(197,148,0,0.10); color: var(--gold-light); border: 1px solid rgba(197,148,0,0.20); }
.tend-badge.exc     { background: rgba(240,208,96,0.10); color: var(--gold-light); border: 1px solid rgba(240,208,96,0.20); }
.tend-badge.util    { background: rgba(255,255,255,0.07); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.10); }

/* ── Stats strip ── */
.stats {
  position: relative; z-index: 1;
  display: flex; align-items: center;
  gap: 0; flex-wrap: wrap; justify-content: center;
  width: 100%;
  padding: 0 32px 60px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 32px;
  margin-top: 8px;
}
.stat {
  display: flex; flex-direction: column; align-items: center;
  padding: 0 28px;
}
.stat strong {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px; font-weight: 800;
  color: var(--text-primary); letter-spacing: -0.04em; line-height: 1;
}
.stat span {
  font-size: 10px; color: var(--text-dim);
  margin-top: 5px; letter-spacing: 0.09em;
  text-transform: uppercase; font-weight: 600;
}
.sdot {
  width: 1px; height: 26px;
  background: var(--border-subtle); flex-shrink: 0;
}

/* ════════════════════════════════════════════════════
   TOOLS STRIP
════════════════════════════════════════════════════ */
.tools-strip {
  background: #0A0F1E;
  border-top: 1px solid rgba(0,82,255,.08);
  border-bottom: 1px solid rgba(0,82,255,.08);
  padding: 22px 24px;
}
.tools-inner { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.tools-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: rgba(255,255,255,0.22); }
.tools-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.tool-chip {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.55); font-size: 12px; font-weight: 500;
  text-decoration: none; transition: all .2s; cursor: pointer;
}
.tool-chip:hover {
  border-color: rgba(197,148,0,0.30);
  color: var(--gold-light);
  background: rgba(197,148,0,0.07);
  transform: translateY(-1px);
}
.tool-chip-icon { font-size: 14px; }
.tool-chip-badge {
  font-size: 9px; font-weight: 700; padding: 2px 7px;
  background: rgba(197,148,0,0.14); color: var(--gold-light); border-radius: 20px;
}

/* ════════════════════════════════════════════════════
   HOW IT WORKS
════════════════════════════════════════════════════ */
.how-section {
  background: #0A0F1E;
  padding: 112px 24px;
}
.container { max-width: 1100px; margin: 0 auto; }

.sec-head { text-align: center; margin-bottom: 72px; }
.tag {
  display: inline-block;
  font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.13em; text-transform: uppercase;
  color: var(--emerald); margin-bottom: 16px;
  background: rgba(0,181,163,0.10);
  padding: 5px 14px; border-radius: 999px;
  border: 1px solid rgba(0,181,163,0.20);
}
.tag.tag-blue {
  color: #7BA8FF;
  background: rgba(0,82,255,0.10);
  border-color: rgba(0,82,255,0.20);
}
.sec-head h2 {
  font-size: clamp(30px,4.5vw,56px);
  font-weight: 800; letter-spacing: -0.045em;
  color: var(--text-primary); line-height: 1.06; margin: 0;
  text-wrap: balance;
}
.sec-head h2 em { font-style: normal; color: var(--emerald); }

.steps {
  display: flex; align-items: flex-start;
  gap: 0; justify-content: center;
}
.step {
  flex: 1; max-width: 300px;
  text-align: center;
  padding: 44px 28px 40px;
  background: rgba(255,255,255,0.030);
  border: 1px solid var(--border-subtle);
  border-radius: 24px;
  position: relative;
  transition: all 0.45s cubic-bezier(0.4,0,0.2,1);
}
.step::before {
  content: '';
  position: absolute; inset: 0; border-radius: 24px;
  background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,82,255,0.08) 0%, transparent 70%);
  opacity: 0; transition: opacity .45s;
}
.step:hover { background: rgba(255,255,255,0.055); border-color: rgba(0,82,255,0.22); transform: translateY(-7px); box-shadow: 0 28px 64px rgba(0,0,0,0.26); }
.step:hover::before { opacity: 1; }
.step-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 800;
  color: rgba(0,181,163,0.60); letter-spacing: 0.15em;
  margin-bottom: 22px; text-transform: uppercase; position: relative; z-index: 1;
}
.step-icon {
  font-size: 28px; width: 64px; height: 64px;
  background: rgba(0,82,255,0.12);
  border: 1px solid rgba(0,82,255,0.18);
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 22px; position: relative; z-index: 1;
}
.step h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.03em; margin: 0 0 10px; position: relative; z-index: 1; }
.step p  { font-size: 13.5px; color: var(--text-muted); line-height: 1.72; margin: 0; position: relative; z-index: 1; }
.step-arrow { font-size: 18px; color: rgba(0,82,255,0.22); flex-shrink: 0; align-self: center; }

/* ════════════════════════════════════════════════════
   FEATURES — Bento Grid
════════════════════════════════════════════════════ */
.sec-features {
  background: #070C1C;
  padding: 112px 24px;
}

.feat-grid {
  display: grid;
  grid-template-columns: repeat(6,1fr);
  gap: 16px; margin-bottom: 72px;
}
.fcard {
  padding: 32px 28px;
  border-radius: 22px;
  border: 1px solid var(--border-subtle);
  background: rgba(255,255,255,0.030);
  transition: all 0.45s cubic-bezier(0.4,0,0.2,1);
  animation: fci .55s cubic-bezier(.22,.83,.27,1) calc(var(--i)*60ms) both;
  position: relative; overflow: hidden;
}
.fcard::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 70% 50% at 0% 0%, rgba(197,148,0,0.06) 0%, transparent 70%);
  opacity: 0; transition: opacity .45s;
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
  transform: translateY(-6px);
  box-shadow: 0 24px 52px -12px rgba(0,0,0,0.36);
  border-color: rgba(197,148,0,0.18);
  background: rgba(255,255,255,0.050);
}
.ficon {
  font-size: 22px; width: 52px; height: 52px;
  border-radius: 16px;
  background: rgba(197,148,0,0.10);
  border: 1px solid rgba(197,148,0,0.16);
  display: grid; place-items: center;
  margin-bottom: 18px; position: relative; z-index: 1;
}
.fcard h3 { font-size: 15px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.03em; margin: 0 0 9px; position: relative; z-index: 1; }
.fcard p  { font-size: 13px; color: var(--text-muted); line-height: 1.68; margin: 0; position: relative; z-index: 1; }

/* ════════════════════════════════════════════════════
   SEMÁFORO EXPLAINER
════════════════════════════════════════════════════ */
.semaforo-card {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 56px; align-items: center;
  background: #0B1022;
  border-radius: 28px; padding: 60px;
  overflow: visible; position: relative;
  box-shadow:
    0 0 0 1px rgba(200,210,240,0.12),
    0 40px 100px rgba(0,0,0,0.36);
}
.semaforo-card::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 55% 80% at 82% 50%, rgba(0,82,255,0.14) 0%, transparent 68%);
  border-radius: 28px; pointer-events: none;
}
.semaforo-card::after {
  content: '';
  position: absolute; inset: -1px; border-radius: 29px;
  background: linear-gradient(125deg, rgba(200,210,240,0.24) 0%, rgba(80,100,160,0.06) 25%, rgba(197,148,0,0.18) 52%, rgba(240,208,96,0.12) 65%, rgba(200,210,240,0.22) 100%);
  z-index: -1; pointer-events: none;
}
.sem-copy { position: relative; z-index: 1; }
.sem-copy h3 {
  font-size: clamp(22px,2.8vw,32px); font-weight: 800;
  color: var(--text-primary); letter-spacing: -0.038em; margin: 12px 0 16px; line-height: 1.18;
}
.sem-copy > p { font-size: 14px; color: var(--text-muted); line-height: 1.70; margin: 0 0 32px; }
.sem-legend { display: flex; flex-direction: column; gap: 16px; }
.sem-item { display: flex; align-items: center; gap: 14px; }
.sem-item div { display: flex; flex-direction: column; gap: 2px; }
.sem-item strong { font-size: 13px; color: var(--text-primary); font-weight: 600; }
.sem-item span { font-size: 12px; color: var(--text-muted); }
.sem-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.sem-dot.green  { background: #00B5A3; box-shadow: 0 0 14px rgba(0,181,163,0.70); }
.sem-dot.yellow { background: #C59400; box-shadow: 0 0 14px rgba(197,148,0,0.70); }
.sem-dot.red    { background: #E11D48; box-shadow: 0 0 14px rgba(225,29,72,0.70); }

.sem-mock { position: relative; z-index: 1; }
.mock-card {
  background: #fff; border-radius: 20px; padding: 26px;
  box-shadow: 0 32px 72px rgba(0,0,0,0.44), 0 0 0 1px rgba(0,0,0,0.04);
}
.mock-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #9CA3AF; margin-bottom: 12px; }
.mock-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
.mock-addr { font-size: 12px; color: #6B7280; font-weight: 500; font-family: 'JetBrains Mono', monospace; }
.mock-badge { font-size: 10.5px; font-weight: 700; border-radius: 9px; padding: 4px 11px; white-space: nowrap; }
.green-badge { background: rgba(0,181,163,0.09); color: #00B5A3; border: 1px solid rgba(0,181,163,0.22); }
.mock-price { font-size: 30px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.045em; margin-bottom: 4px; font-family: 'JetBrains Mono', monospace; }
.mock-meta { font-size: 12px; color: #9CA3AF; margin-bottom: 18px; }
.mock-verdict { background: rgba(0,181,163,0.065); border: 1px solid rgba(0,181,163,0.18); border-radius: 11px; padding: 11px 15px; margin-bottom: 16px; }
.verdict-text { font-size: 13px; color: #007B70; line-height: 1.55; margin: 0; }
.verdict-text strong { font-weight: 700; }
.mock-prices { display: flex; flex-direction: column; gap: 7px; }
.mp-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; }
.mp-label { color: #9CA3AF; }
.mp-val { font-weight: 700; }
.asking   { color: #1A1A1A; font-family: 'JetBrains Mono', monospace; }
.notarial { color: #00B5A3; font-family: 'JetBrains Mono', monospace; }
.mp-row:last-child {
  display: flex; flex-direction: column; align-items: center;
  gap: 3px; margin-top: 14px; padding-top: 14px;
  border-top: 1px solid rgba(0,181,163,0.13);
}
.mp-row:last-child .mp-label { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; }
.gap-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 48px; font-weight: 800;
  letter-spacing: -0.05em; color: #00B5A3; line-height: 1;
  text-shadow: 0 0 32px rgba(0,181,163,0.20);
}

/* ── GDPR ── */
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
   RESPONSIVE
════════════════════════════════════════ */
@media (max-width: 1024px) {
  .hero-wrap { grid-template-columns: 1fr; gap: 40px; padding: 72px 24px 48px; }
  .hero-right { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
}
@media (max-width: 800px) {
  .feat-grid { grid-template-columns: repeat(2,1fr); }
  .fcard:nth-child(1), .fcard:nth-child(2), .fcard:nth-child(3),
  .fcard:nth-child(4), .fcard:nth-child(5), .fcard:nth-child(6) { grid-column: span 1; }
  .fcard:nth-child(6) { display: block; }
  .fcard:nth-child(6) .ficon { margin-bottom: 18px; }
  .semaforo-card { grid-template-columns: 1fr; padding: 40px 28px; }
  .steps { flex-direction: column; align-items: center; gap: 10px; }
  .step-arrow { transform: rotate(90deg); }
}
@media (max-width: 640px) {
  .hero-right { grid-template-columns: 1fr; }
  .ideas-grid { grid-template-columns: 1fr; }
  .quick-actions { gap: 6px; }
  .feat-grid { grid-template-columns: 1fr; }
  .semaforo-card { padding: 32px 20px; }
  .stats { gap: 0; }
  .stat { padding: 0 16px; }
  .tools-strip { padding: 16px; }
}
  `]
})
export class LandingHeroComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  chatQuery = '';
  chatFocused = false;
  v = false;
  gdpr = true;

  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly ideas = [
    { icon: '🔍', cat: 'Búsqueda', texto: 'Pisos baratos con semáforo verde en Madrid' },
    { icon: '📊', cat: 'Análisis', texto: '¿Cuánto vale realmente un piso en Salamanca?' },
    { icon: '🏘️', cat: 'Barrios', texto: '¿Cuál es el mejor barrio para vivir en Madrid?' },
    { icon: '💰', cat: 'Hipoteca', texto: 'Cuánto pagaré de hipoteca por 300.000€' },
  ];

  readonly tendencias = [
    { texto: 'Precio medio m² Chamartín 2025',      badge: '↑ caliente', clase: 'hot'   },
    { texto: 'Mejores barrios para familias Madrid', badge: 'popular',    clase: 'pop'   },
    { texto: 'Pisos infravalorados en Retiro',       badge: 'nuevo',      clase: 'new-b' },
    { texto: 'Hipoteca variable vs fija 2025',       badge: 'trending',   clase: 'trend' },
    { texto: 'Gap de negociación por zona Madrid',   badge: 'exclusivo',  clase: 'exc'   },
    { texto: 'Coste real de comprar piso en Madrid', badge: 'útil',       clase: 'util'  },
  ];

  readonly tools = [
    { icon: '🤖', label: 'Asistente IA',   path: '/asistente',       badge: 'Nuevo' },
    { icon: '🗺️', label: 'Mapa de pisos',  path: '/mapa-resultados', badge: null    },
    { icon: '🏘️', label: 'Ranking barrios',path: '/barrios',         badge: 'IA'    },
    { icon: '🏦', label: 'Hipotecas',       path: '/hipotecas',       badge: null    },
    { icon: '🛡️', label: 'Seguros hogar',  path: '/seguros',         badge: 'Nuevo' },
    { icon: '🧾', label: 'Gastos compra',  path: '/costes-compra',   badge: 'Nuevo' },
    { icon: '📊', label: 'Estadísticas',   path: '/estadisticas',    badge: null    },
    { icon: '🏛️', label: 'Catastro',       path: '/catastro',        badge: null    },
  ];

  readonly feats = [
    { e: '🚦', t: 'Semáforo de precios',   d: 'Compara el precio pedido con la transacción notarial real de la zona. Verde, amarillo o rojo al instante.' },
    { e: '🤖', t: 'Asistente IA 24/7',     d: 'Pregunta cualquier cosa sobre barrios, hipotecas o precios en lenguaje natural. Respuestas instantáneas.' },
    { e: '🏘️', t: 'Ranking de barrios',    d: 'Scoring IA de calidad de vida, seguridad, colegios y transporte para cada barrio. Encuentra el tuyo.' },
    { e: '🔔', t: 'Alertas de precio',     d: 'Configura alertas y recibe notificaciones cuando un inmueble infravalorado aparezca en tu zona.' },
    { e: '🛡️', t: 'Seguros de hogar',      d: 'Compara las mejores pólizas del mercado. Precios, coberturas y franquicias lado a lado.' },
    { e: '🧾', t: 'Calculadora de gastos', d: 'ITP, AJD, notaría, registro y gestoría calculados automáticamente por CCAA. Sin sorpresas al firmar.' },
  ];

  ngOnInit(): void {
    this.timer = setTimeout(() => this.v = true, 80);
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  enviarChat(): void {
    if (!this.chatQuery.trim()) return;
    this.router.navigate(['/asistente'], { queryParams: { q: this.chatQuery.trim() } });
  }

  usarSugerencia(texto: string): void {
    this.chatQuery = texto;
    this.enviarChat();
  }
}
