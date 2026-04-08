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
      <h2>Empieza gratis.<br>Escala cuando lo necesites.</h2>
      <p>Sin tarjeta de crédito · Cancela cuando quieras</p>
    </div>

    <div class="plans">
      @for (p of plans; track p.name; let i = $index) {
        <div class="plan" [class.pop]="p.pop" [style.--i]="i">
          @if (p.pop) { <div class="pop-badge">Most Exclusive</div> }
          <div class="plan-head">
            <p class="plan-name">{{ p.name }}</p>
            <div class="plan-price">
              <span class="amount">{{ p.price }}</span>
              <span class="period">{{ p.period }}</span>
            </div>
            <p class="plan-desc">{{ p.desc }}</p>
          </div>
          <ul class="plan-feats">
            @for (f of p.feats; track f) {
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ f }}
              </li>
            }
          </ul>
          <a routerLink="/registro" class="plan-cta" [class.cta-pop]="p.pop">{{ p.cta }}</a>
        </div>
      }
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
/* ════════════════════════════════════════════════════════
   PRICING — "Institutional Gold" — Dubai × Stripe
════════════════════════════════════════════════════════ */
:host {
  --brand:      #0052FF;
  --brand-deep: #0041CC;
  --emerald:    #00B5A3;
  --gold:       #C59400;
  --gold-light: #F0D060;
  --carmine:    #E11D48;
}

.pricing {
  background: #070C1C;
  padding: 128px 24px;
  position: relative; overflow: hidden;
}
/* Ambient top glow */
.pricing::before {
  content: '';
  position: absolute;
  top: -160px; left: 50%; transform: translateX(-50%);
  width: 900px; height: 500px;
  background: radial-gradient(ellipse, rgba(0,82,255,0.07) 0%, transparent 65%);
  pointer-events: none;
}

.container { max-width: 1140px; margin: 0 auto; position: relative; }

/* Section header */
.sec-head { text-align: center; margin-bottom: 72px; }
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
  font-size: clamp(30px,4.5vw,54px);
  font-weight: 800; letter-spacing: -0.045em;
  color: #fff; line-height: 1.07; margin: 0 0 14px;
  text-wrap: balance;
}
.sec-head p { font-size: 14px; color: rgba(255,255,255,.30); letter-spacing: 0.02em; }

/* Plans grid */
.plans {
  display: grid; grid-template-columns: repeat(3,1fr);
  gap: 22px; margin-bottom: 52px;
  perspective: 1400px;
}

/* Base plan card */
.plan {
  position: relative;
  background: rgba(255,255,255,.035);
  border: 1px solid rgba(255,255,255,.075);
  border-radius: 26px; padding: 36px 30px;
  display: flex; flex-direction: column;
  transition: transform .48s cubic-bezier(.22,.83,.27,1), box-shadow .48s, border-color .48s;
  animation: pi .65s cubic-bezier(.22,.83,.27,1) calc(var(--i)*95ms) both;
  overflow: hidden;
  /* stacking context so ::before shimmer clips correctly */
  isolation: isolate;
}
@keyframes pi {
  from { opacity:0; transform:translateY(22px) scale(.97); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
/* Inner shimmer on hover */
.plan::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(130deg, rgba(0,82,255,0.065) 0%, transparent 55%);
  opacity: 0; transition: opacity .48s;
  z-index: 0; pointer-events: none;
}
.plan > * { position: relative; z-index: 1; }
.plan:hover { transform: translateY(-9px); border-color: rgba(255,255,255,.14); box-shadow: 0 36px 72px rgba(0,0,0,.50); }
.plan:hover::before { opacity: 1; }

/* ── POPULAR plan — "Most Exclusive" ── */
/* Technique: box-shadow inset ring + outline = no overflow clipping issues */
.plan.pop {
  background: #080D20;
  /* 2px gold-to-silver border via outline */
  outline: 2px solid transparent;
  outline-offset: -2px;
  border-color: transparent;
  transform: translateY(-5px);
  /* Animated gold gradient border using box-shadow is unreliable;
     we use a CSS mask approach instead: gradient on background-clip */
  background-image:
    linear-gradient(#080D20, #080D20),
    linear-gradient(138deg, #C59400 0%, #F0D060 22%, #C8C8D4 45%, #F0D060 68%, #C59400 100%);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  border: 2px solid transparent;
  box-shadow: 0 28px 64px rgba(0,0,0,.50), 0 0 0 0 transparent;
}
.plan.pop:hover {
  transform: translateY(-14px);
  box-shadow: 0 48px 96px rgba(0,0,0,.58);
}
/* Remove the ::after pseudo since we use background-clip for the border */
.plan.pop::after { display: none; }
/* Disable the generic hover shimmer on pop card */
.plan.pop::before { display: none; }

/* Badge "MOST EXCLUSIVE" */
.plan .pop-badge {
  position: absolute; top: 22px; right: 22px;
  z-index: 10;
  background: rgba(6,4,0,0.90);
  color: #F0D060;
  border: 1px solid rgba(240,208,96,0.32);
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.09em; text-transform: uppercase;
  border-radius: 999px; padding: 4px 13px;
  box-shadow: 0 2px 12px rgba(197,148,0,0.22);
  font-family: 'JetBrains Mono', monospace;
}

/* Plan header */
.plan-head { margin-bottom: 26px; }
.plan-name {
  font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: rgba(255,255,255,.45); margin: 0 0 16px;
}
.plan.pop .plan-name { color: var(--gold); padding-right: 114px; }

.plan-price {
  display: flex; align-items: baseline; gap: 7px;
  margin-bottom: 11px;
}
.amount {
  font-size: 46px; font-weight: 800;
  color: #fff; letter-spacing: -0.045em; line-height: 1;
  font-family: 'JetBrains Mono', monospace;
}
.period { font-size: 14px; color: rgba(255,255,255,.32); font-weight: 500; }
.plan-desc { font-size: 13px; color: rgba(255,255,255,.38); line-height: 1.55; margin: 0; }

/* Features list */
.plan-feats {
  list-style: none; padding: 0; margin: 0 0 30px;
  display: flex; flex-direction: column; gap: 11px;
  flex: 1;
  border-top: 1px solid rgba(255,255,255,.065);
  padding-top: 26px;
}
.plan-feats li {
  display: flex; align-items: flex-start; gap: 11px;
  font-size: 13.5px; color: rgba(255,255,255,.62); line-height: 1.45;
}
.plan-feats svg { color: var(--emerald); flex-shrink: 0; margin-top: 2px; }
.plan.pop .plan-feats li { color: rgba(255,255,255,.80); }
.plan.pop .plan-feats svg { filter: drop-shadow(0 0 4px rgba(0,181,163,0.50)); }
.plan.pop .plan-desc { color: rgba(255,255,255,.72); }
.plan.pop .period { color: rgba(255,255,255,.60); }
.plan.pop .amount { color: #fff; }

/* CTA buttons */
.plan-cta {
  display: block; text-align: center; text-decoration: none;
  border-radius: 15px; padding: 14px;
  font-size: 14px; font-weight: 700; letter-spacing: -0.015em;
  background: rgba(255,255,255,.065);
  border: 1px solid rgba(255,255,255,.11);
  color: rgba(255,255,255,.75);
  transition: background .32s, transform .42s cubic-bezier(0.2,0.8,0.2,1), box-shadow .32s;
}
.plan-cta:hover { background: rgba(255,255,255,.11); transform: translateY(-3px); }

/* "Empezar Pro" — 5s shimmer loop */
.cta-pop {
  position: relative; overflow: hidden;
  background: linear-gradient(138deg, #003ACC, #0052FF);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 10px 32px rgba(0,82,255,0.48);
}
.cta-pop::before {
  content: '';
  position: absolute;
  top: 0; left: -70%;
  width: 48%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent);
  transform: skewX(-15deg);
  animation: shimmer-run 5s ease-in-out infinite;
}
@keyframes shimmer-run {
  0%,72%  { left: -70%; opacity: 0; }
  74%     { opacity: 1; }
  88%     { left: 135%; opacity: 1; }
  90%,100%{ left: 135%; opacity: 0; }
}
.cta-pop:hover {
  box-shadow: 0 16px 44px rgba(0,82,255,0.60);
  transform: translateY(-3px);
}

/* Enterprise row */
.enterprise {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 22px; padding: 28px 36px; gap: 20px;
  flex-wrap: wrap;
  position: relative; overflow: hidden;
}
.enterprise::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(197,148,0,0.04) 0%, transparent 50%);
  pointer-events: none;
}
.ent-copy { display: flex; flex-direction: column; gap: 5px; }
.ent-copy strong { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
.ent-copy span { font-size: 13px; color: rgba(255,255,255,.38); }
.ent-btn {
  text-decoration: none; font-size: 14px; font-weight: 700;
  color: var(--gold); white-space: nowrap;
  padding: 11px 26px; border-radius: 13px;
  border: 1px solid rgba(197,148,0,0.30);
  transition: background .28s, border-color .28s, box-shadow .28s;
  letter-spacing: -0.01em;
}
.ent-btn:hover {
  background: rgba(197,148,0,0.08);
  border-color: rgba(197,148,0,0.50);
  box-shadow: 0 4px 20px rgba(197,148,0,0.14);
}

@media (max-width: 900px) {
  .plans { grid-template-columns: 1fr; }
  .plan.pop { transform: none; }
}
@media (max-width: 600px) {
  .pricing { padding: 88px 20px; }
  .enterprise { flex-direction: column; align-items: flex-start; }
}
  `]
})
export class LandingPricingComponent {
  readonly plans = [
    {
      name: 'Gratuito', price: '0€', period: '/ siempre', pop: false,
      desc: 'Para compradores que empiezan a explorar el mercado.',
      cta: 'Crear cuenta gratis',
      feats: ['Mapa interactivo con semáforo','Búsqueda por municipio y filtros','Ver precio y m² de cada inmueble','Hasta 20 resultados por búsqueda']
    },
    {
      name: 'Comprador Pro', price: '9€', period: '/ mes', pop: true,
      desc: 'Para quienes buscan activamente y quieren ventaja real.',
      cta: 'Empezar Pro',
      feats: ['Todo lo del plan Gratuito','Dirección exacta del inmueble','Datos completos de catastro','Alertas de bajada de precio','Favoritos ilimitados','Comparación de hasta 5 pisos']
    },
    {
      name: 'Asesoría', price: '49€', period: '/ proceso', pop: false,
      desc: 'Acompañamiento completo en todo el proceso de compra.',
      cta: 'Hablar con un asesor',
      feats: ['Todo lo del plan Pro','Análisis personalizado de zona','Negociación con el vendedor','Gestión hipoteca y notaría','Soporte hasta escritura firmada']
    },
  ];
}
