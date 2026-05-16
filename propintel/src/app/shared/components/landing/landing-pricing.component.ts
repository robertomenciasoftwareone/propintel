import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-pricing',
  standalone: true,
  imports: [RouterLink],
  template: `
<section class="pricing" id="precios">
  <div class="container">

    <div class="sec-head">
      <span class="tag">Precios</span>
      <h2>Empieza gratis.<br>Desbloquea todo cuando lo necesites.</h2>
      <p>Sin tarjeta de crédito · Cancela cuando quieras</p>
    </div>

    <!-- Toggle: mensual / anual -->
    <div class="toggle-row">
      <span [class.active]="!anual" (click)="anual=false">Mensual</span>
      <button class="toggle-btn" (click)="anual=!anual" [class.on]="anual" aria-label="Cambiar periodo">
        <span class="toggle-knob"></span>
      </button>
      <span [class.active]="anual" (click)="anual=true">
        Anual
        <span class="discount-badge">−20%</span>
      </span>
    </div>

    <div class="plans">

      <!-- ── Plan Gratis ── -->
      <div class="plan">
        <div class="plan-head">
          <div class="plan-name-row">
            <span class="plan-name">Gratis</span>
            <span class="plan-pill free-pill">Para siempre</span>
          </div>
          <div class="plan-price">
            <span class="amount">0€</span>
            <span class="period">/ siempre</span>
          </div>
          <p class="plan-desc">Para explorar el mercado y empezar a buscar sin compromisos.</p>
        </div>

        <div class="plan-divider"></div>

        <ul class="plan-feats">
          @for (f of freePlan.feats; track f.text) {
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ f.text }}</span>
            </li>
          }
        </ul>

        <div class="plan-locked">
          <div class="locked-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Solo disponible en Pro
          </div>
          @for (f of lockedFeats; track f) {
            <div class="locked-item">{{ f }}</div>
          }
        </div>

        <a routerLink="/registro" class="plan-cta">Crear cuenta gratis</a>
      </div>

      <!-- ── Plan Pro ── -->
      <div class="plan plan-pro">
        <div class="pop-badge">MÁS POPULAR</div>

        <div class="plan-head">
          <div class="plan-name-row">
            <span class="plan-name">Pro</span>
            <span class="plan-pill pro-pill">Ventaja real</span>
          </div>
          <div class="plan-price">
            <span class="amount">{{ anual ? '7€' : '9€' }}</span>
            <span class="period">/ mes</span>
          </div>
          <p class="plan-desc">
            {{ anual ? 'Facturado anualmente (84€/año).' : 'Facturado mensualmente.' }}
            Todo sin límites.
          </p>
        </div>

        <div class="plan-divider"></div>

        <ul class="plan-feats">
          @for (f of proPlan.feats; track f.text) {
            <li [class.highlight]="f.highlight">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ f.text }}</span>
              @if (f.badge) { <span class="feat-badge">{{ f.badge }}</span> }
            </li>
          }
        </ul>

        <a routerLink="/registro" class="plan-cta cta-pro">Empezar Pro ahora →</a>

        <p class="cta-note">7 días de prueba gratuita · Sin permanencia</p>
      </div>

    </div>

    <!-- Enterprise row -->
    <div class="enterprise">
      <div class="ent-copy">
        <strong>¿Agencia inmobiliaria o inversor profesional?</strong>
        <span>Planes enterprise con API, datos en bruto y soporte dedicado.</span>
      </div>
      <a routerLink="/registro" class="ent-btn">Hablar con el equipo →</a>
    </div>

  </div>
</section>
  `,
  styles: [`
:host {
  --brand:      #0052FF;
  --emerald:    #00B5A3;
  --gold:       #C59400;
  --gold-light: #F0D060;
  --carmine:    #E11D48;
  --bg-dark:    #070C1C;
  --border:     rgba(255,255,255,0.07);
  --text:       #F0F4FF;
  --muted:      rgba(255,255,255,0.45);
}

.pricing {
  background: var(--bg-dark);
  padding: 120px 24px;
  position: relative; overflow: hidden;
}
.pricing::before {
  content: '';
  position: absolute; top: -160px; left: 50%; transform: translateX(-50%);
  width: 900px; height: 500px;
  background: radial-gradient(ellipse, rgba(0,82,255,0.07) 0%, transparent 65%);
  pointer-events: none;
}

.container { max-width: 900px; margin: 0 auto; position: relative; }

/* Section header */
.sec-head { text-align: center; margin-bottom: 48px; }
.tag {
  display: inline-block;
  font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--emerald); margin-bottom: 18px;
  background: rgba(0,181,163,0.10);
  padding: 5px 14px; border-radius: 999px;
  border: 1px solid rgba(0,181,163,0.22);
}
.sec-head h2 {
  font-size: clamp(28px,4vw,52px);
  font-weight: 800; letter-spacing: -0.045em;
  color: var(--text); line-height: 1.07; margin: 0 0 14px;
  text-wrap: balance;
}
.sec-head p { font-size: 14px; color: rgba(255,255,255,.28); letter-spacing: 0.02em; }

/* Annual toggle */
.toggle-row {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; margin-bottom: 48px;
  font-size: 14px; font-weight: 500; color: var(--muted);
  cursor: pointer; user-select: none;
}
.toggle-row span { transition: color .22s; }
.toggle-row span.active { color: var(--text); }
.toggle-btn {
  width: 44px; height: 24px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 999px; position: relative; cursor: pointer;
  transition: background .28s, border-color .28s;
}
.toggle-btn.on { background: var(--brand); border-color: var(--brand); }
.toggle-knob {
  position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(255,255,255,0.55);
  transition: left .28s cubic-bezier(.4,0,.2,1), background .28s;
}
.toggle-btn.on .toggle-knob { left: 22px; background: #fff; }
.discount-badge {
  display: inline-block; margin-left: 6px;
  background: rgba(0,181,163,0.15); color: var(--emerald);
  border: 1px solid rgba(0,181,163,0.22);
  font-size: 10px; font-weight: 700;
  padding: 2px 7px; border-radius: 999px; letter-spacing: 0.04em;
}

/* Plans grid — 2 columns */
.plans {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 22px; margin-bottom: 44px;
}

/* Base plan */
.plan {
  position: relative;
  background: rgba(255,255,255,0.030);
  border: 1px solid var(--border);
  border-radius: 26px; padding: 36px 32px;
  display: flex; flex-direction: column;
  transition: transform .40s, box-shadow .40s, border-color .40s;
}
.plan:hover { transform: translateY(-7px); box-shadow: 0 32px 72px rgba(0,0,0,0.44); border-color: rgba(255,255,255,0.12); }

/* Pro plan — gold gradient border */
.plan-pro {
  background: #080D20;
  background-image:
    linear-gradient(#080D20, #080D20),
    linear-gradient(138deg, #C59400 0%, #F0D060 22%, #C8C8D4 45%, #F0D060 68%, #C59400 100%);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  border: 2px solid transparent;
  box-shadow: 0 24px 56px rgba(0,0,0,0.42);
}
.plan-pro:hover { transform: translateY(-10px); box-shadow: 0 40px 88px rgba(0,0,0,0.52); }

/* Pop badge */
.pop-badge {
  position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
  background: linear-gradient(138deg, #C59400, #F0D060);
  color: #1A0E00;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.10em; text-transform: uppercase;
  border-radius: 0 0 10px 10px; padding: 4px 18px;
  box-shadow: 0 4px 16px rgba(197,148,0,0.30);
}

/* Plan head */
.plan-name-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
}
.plan-name {
  font-size: 13px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.10em; color: var(--muted);
}
.plan-pro .plan-name { color: var(--gold); }
.plan-pill {
  font-size: 10px; font-weight: 700; border-radius: 999px;
  padding: 3px 10px; letter-spacing: 0.04em;
}
.free-pill { background: rgba(0,181,163,0.10); color: var(--emerald); border: 1px solid rgba(0,181,163,0.20); }
.pro-pill  { background: rgba(197,148,0,0.12); color: var(--gold-light); border: 1px solid rgba(197,148,0,0.22); }

.plan-price {
  display: flex; align-items: baseline; gap: 7px; margin-bottom: 11px;
}
.amount {
  font-size: 52px; font-weight: 800; color: var(--text);
  letter-spacing: -0.05em; line-height: 1;
  font-family: 'JetBrains Mono', monospace;
}
.period { font-size: 15px; color: var(--muted); font-weight: 500; }
.plan-desc { font-size: 13px; color: var(--muted); line-height: 1.55; margin: 0; }

.plan-divider {
  height: 1px; background: var(--border);
  margin: 22px 0;
}

/* Features list */
.plan-feats {
  list-style: none; padding: 0; margin: 0 0 16px;
  display: flex; flex-direction: column; gap: 11px;
}
.plan-feats li {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 13.5px; color: rgba(255,255,255,0.58); line-height: 1.45;
}
.plan-feats li svg { color: var(--emerald); flex-shrink: 0; margin-top: 1px; }
.plan-pro .plan-feats li { color: rgba(255,255,255,0.80); }
.plan-feats li.highlight { color: rgba(255,255,255,0.92); }
.plan-feats li.highlight svg { filter: drop-shadow(0 0 4px rgba(0,181,163,0.50)); }
.feat-badge {
  font-size: 9.5px; font-weight: 700; border-radius: 999px;
  padding: 2px 8px; white-space: nowrap; flex-shrink: 0;
  background: rgba(197,148,0,0.12); color: var(--gold-light);
  border: 1px solid rgba(197,148,0,0.20);
  letter-spacing: 0.04em; text-transform: uppercase; margin-left: auto;
}

/* Locked section */
.plan-locked {
  margin-bottom: 22px; flex: 1;
}
.locked-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: rgba(255,255,255,0.20);
  margin-bottom: 10px;
}
.locked-label svg { flex-shrink: 0; }
.locked-item {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: rgba(255,255,255,0.20);
  margin-bottom: 8px; padding-left: 4px;
  position: relative;
}
.locked-item::before {
  content: '—';
  color: rgba(255,255,255,0.12);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

/* CTAs */
.plan-cta {
  display: block; text-align: center; text-decoration: none;
  border-radius: 15px; padding: 14px;
  font-size: 14px; font-weight: 700; letter-spacing: -0.01em;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.70);
  transition: background .28s, transform .36s cubic-bezier(0.2,0.8,0.2,1), box-shadow .28s;
  margin-top: auto;
}
.plan-cta:hover { background: rgba(255,255,255,0.10); transform: translateY(-2px); }

.cta-pro {
  position: relative; overflow: hidden;
  background: linear-gradient(138deg, #003ACC, #0052FF);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 10px 32px rgba(0,82,255,0.44);
}
.cta-pro::before {
  content: '';
  position: absolute; top: 0; left: -70%;
  width: 48%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
  transform: skewX(-15deg);
  animation: shimmer-run 5s ease-in-out infinite;
}
@keyframes shimmer-run {
  0%,72%  { left: -70%; opacity: 0; }
  74%     { opacity: 1; }
  88%     { left: 135%; opacity: 1; }
  90%,100%{ left: 135%; opacity: 0; }
}
.cta-pro:hover { box-shadow: 0 16px 44px rgba(0,82,255,0.58); transform: translateY(-3px); }

.cta-note {
  text-align: center; font-size: 11.5px; color: rgba(255,255,255,0.28);
  margin: 10px 0 0; letter-spacing: 0.02em;
}

/* Enterprise */
.enterprise {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,0.025);
  border: 1px solid var(--border);
  border-radius: 22px; padding: 26px 32px; gap: 20px; flex-wrap: wrap;
}
.ent-copy { display: flex; flex-direction: column; gap: 5px; }
.ent-copy strong { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
.ent-copy span   { font-size: 13px; color: var(--muted); }
.ent-btn {
  text-decoration: none; font-size: 14px; font-weight: 700;
  color: var(--gold); white-space: nowrap;
  padding: 11px 24px; border-radius: 13px;
  border: 1px solid rgba(197,148,0,0.28);
  transition: background .26s, border-color .26s, box-shadow .26s;
}
.ent-btn:hover { background: rgba(197,148,0,0.08); border-color: rgba(197,148,0,0.46); box-shadow: 0 4px 18px rgba(197,148,0,0.12); }

@media (max-width: 700px) {
  .plans { grid-template-columns: 1fr; }
  .enterprise { flex-direction: column; align-items: flex-start; }
  .pricing { padding: 80px 20px; }
}
  `]
})
export class LandingPricingComponent {
  anual = false;

  readonly freePlan = {
    feats: [
      { text: 'Mapa interactivo de inmuebles' },
      { text: 'Búsqueda por municipio y filtros básicos' },
      { text: 'Precio asking (Idealista / Fotocasa)' },
      { text: 'Asistente IA: 5 preguntas al día' },
      { text: 'Estadísticas generales de mercado' },
    ]
  };

  readonly lockedFeats = [
    'Precio notarial real por zona',
    'Gap% asking vs notarial',
    'Semáforo de oportunidad (🟢🟡🔴)',
    'Tasación AVM personalizada',
    'Alertas de precio y semáforo',
    'Favoritos + alertas inteligentes',
    'Asistente IA ilimitado',
  ];

  readonly proPlan = {
    feats: [
      { text: 'Todo lo del plan Gratis', highlight: false, badge: '' },
      { text: 'Precio notarial real por zona',           highlight: true,  badge: 'Clave' },
      { text: 'Gap% asking vs notarial',                 highlight: true,  badge: ''      },
      { text: 'Semáforo de oportunidad (🟢🟡🔴)',        highlight: true,  badge: ''      },
      { text: 'Tasación AVM personalizada',              highlight: false, badge: ''      },
      { text: 'Alertas de precio y semáforo',            highlight: false, badge: ''      },
      { text: 'Favoritos con alertas inteligentes',      highlight: false, badge: ''      },
      { text: 'Asistente IA ilimitado',                  highlight: false, badge: ''      },
      { text: 'Datos catastro completos',                highlight: false, badge: ''      },
      { text: 'Historial de precios por zona',           highlight: false, badge: ''      },
    ]
  };
}
