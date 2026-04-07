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
          @if (p.pop) { <div class="pop-badge">Más popular</div> }
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
.pricing {
  background: #05080f;
  padding: 120px 24px;
}
.container { max-width: 1140px; margin: 0 auto; }

.sec-head { text-align: center; margin-bottom: 64px; }
.tag {
  display: inline-block;
  font-size: 11px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #60a5fa; margin-bottom: 16px;
}
.sec-head h2 {
  font-size: clamp(30px, 4.5vw, 52px);
  font-weight: 800; letter-spacing: -.04em;
  color: #fff; line-height: 1.08; margin: 0 0 12px;
}
.sec-head p { font-size: 14px; color: rgba(255,255,255,.35); letter-spacing: .02em; }

/* Plans grid */
.plans {
  display: grid; grid-template-columns: repeat(3,1fr);
  gap: 20px; margin-bottom: 48px;
  perspective: 1200px;
}
.plan {
  position: relative;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px; padding: 32px 28px;
  display: flex; flex-direction: column; gap: 0;
  transition: transform .4s cubic-bezier(.22,.83,.27,1), box-shadow .4s, border-color .4s;
  animation: pi .6s cubic-bezier(.22,.83,.27,1) calc(var(--i)*90ms) both;
  overflow: hidden;
}
@keyframes pi { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
.plan::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(120deg, rgba(96,165,250,.08) 0%, transparent 60%);
  opacity: 0; transition: opacity .4s;
}
.plan:hover { transform: translateY(-8px); border-color: rgba(255,255,255,.16); }
.plan:hover::before { opacity: 1; }
.plan:hover { box-shadow: 0 32px 64px rgba(0,0,0,.5); }

.plan.pop {
  background: rgba(29,78,216,.15);
  border-color: rgba(96,165,250,.35);
  transform: translateY(-4px);
  box-shadow: 0 24px 56px rgba(29,78,216,.25);
}
.plan.pop:hover {
  transform: translateY(-12px);
  box-shadow: 0 40px 80px rgba(29,78,216,.35);
  border-color: rgba(96,165,250,.5);
}
.pop-badge {
  position: absolute; top: 20px; right: 20px;
  background: linear-gradient(135deg,#1d4ed8,#3b82f6);
  color: #fff; font-size: 10px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase;
  border-radius: 999px; padding: 4px 12px;
  box-shadow: 0 4px 12px rgba(29,78,216,.4);
}

.plan-head { margin-bottom: 24px; }
.plan-name {
  font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .1em;
  color: rgba(255,255,255,.5); margin: 0 0 14px;
}
.plan.pop .plan-name { color: #93c5fd; }
.plan-price {
  display: flex; align-items: baseline; gap: 6px;
  margin-bottom: 10px;
}
.amount {
  font-size: 44px; font-weight: 800;
  color: #fff; letter-spacing: -.04em; line-height: 1;
}
.period { font-size: 14px; color: rgba(255,255,255,.35); font-weight: 500; }
.plan-desc { font-size: 13px; color: rgba(255,255,255,.4); line-height: 1.5; margin: 0; }

/* Features list */
.plan-feats {
  list-style: none; padding: 0; margin: 0 0 28px;
  display: flex; flex-direction: column; gap: 10px;
  flex: 1;
  border-top: 1px solid rgba(255,255,255,.07);
  padding-top: 24px;
}
.plan-feats li {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 13.5px; color: rgba(255,255,255,.65); line-height: 1.4;
}
.plan-feats svg { color: #4ade80; flex-shrink: 0; margin-top: 2px; }
.plan.pop .plan-feats li { color: rgba(255,255,255,.8); }

/* CTA */
.plan-cta {
  display: block; text-align: center; text-decoration: none;
  border-radius: 14px; padding: 13px;
  font-size: 14px; font-weight: 700; letter-spacing: -.01em;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.8);
  transition: background .25s, transform .25s, box-shadow .25s;
}
.plan-cta:hover { background: rgba(255,255,255,.12); transform: translateY(-1px); }
.cta-pop {
  background: linear-gradient(135deg,#1d4ed8,#2563eb);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 8px 24px rgba(29,78,216,.4);
}
.cta-pop:hover {
  background: linear-gradient(135deg,#2563eb,#3b82f6);
  box-shadow: 0 12px 32px rgba(29,78,216,.5);
}

/* Enterprise */
.enterprise {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 20px; padding: 24px 32px; gap: 20px;
  flex-wrap: wrap;
}
.ent-copy {
  display: flex; flex-direction: column; gap: 4px;
}
.ent-copy strong { font-size: 16px; font-weight: 700; color: #fff; }
.ent-copy span { font-size: 13px; color: rgba(255,255,255,.4); }
.ent-btn {
  text-decoration: none; font-size: 14px; font-weight: 700;
  color: #60a5fa; white-space: nowrap;
  padding: 10px 24px; border-radius: 12px;
  border: 1px solid rgba(96,165,250,.3);
  transition: background .2s, border-color .2s;
}
.ent-btn:hover { background: rgba(96,165,250,.08); border-color: rgba(96,165,250,.5); }

@media (max-width: 900px) { .plans { grid-template-columns: 1fr; } .plan.pop { transform: none; } }
@media (max-width: 600px) { .enterprise { flex-direction: column; align-items: flex-start; } }
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
