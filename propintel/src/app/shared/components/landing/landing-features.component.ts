import { Component } from '@angular/core';

@Component({
  selector: 'app-landing-features',
  standalone: true,
  template: `
    <section class="features" id="features">
      <header>
        <p class="label">¿Qué incluye UrbIA?</p>
        <h2>Todo lo que necesitas para comprar con seguridad</h2>
      </header>
      <div class="grid">
        @for (item of items; track item.title) {
          <article class="card">
            <div class="icon">{{ item.icon }}</div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .features { padding: 34px 0; }
    .label {
      font-size: 12px;
      font-weight: 700;
      color: #2d6fb1;
      text-transform: uppercase;
      letter-spacing: .09em;
      margin: 0 0 6px;
    }
    h2 {
      margin: 0;
      font-size: clamp(26px, 4vw, 38px);
      color: #162c47;
      max-width: 760px;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .grid {
      margin-top: 20px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .card {
      border: 1px solid #d9e7f8;
      border-radius: 16px;
      background: #fff;
      padding: 18px;
      transition: transform .25s ease, box-shadow .25s ease;
      box-shadow: 0 8px 20px rgba(25, 74, 134, 0.08);
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 30px rgba(25, 74, 134, 0.14);
    }
    .icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: #edf5ff;
      display: grid;
      place-items: center;
      font-size: 20px;
    }
    .card h3 { margin: 12px 0 6px; font-size: 16px; color: #1f3658; }
    .card p { margin: 0; color: #587092; line-height: 1.55; font-size: 14px; }
    @media (max-width: 1000px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class LandingFeaturesComponent {
  readonly items = [
    {
      icon: '🚦',
      title: 'Semáforo de precios',
      text: 'Compara el precio pedido con el precio real de transacción notarial. Verde = buena oportunidad. Rojo = sobrevalorado.'
    },
    {
      icon: '🗺️',
      title: 'Mapa interactivo',
      text: 'Todos los inmuebles en un mapa con OpenStreetMap. Metro, autobús y cercanías visibles nativamente.'
    },
    {
      icon: '🏠',
      title: 'Datos de catastro',
      text: 'Superficie real, año de construcción, referencia catastral y valor fiscal de cada inmueble.'
    },
    {
      icon: '🔔',
      title: 'Alertas de precio',
      text: 'Configura alertas y recibe notificaciones cuando un inmueble baje de precio en tu zona de interés.'
    },
    {
      icon: '🤖',
      title: 'Búsqueda con IA',
      text: 'Describe el piso que buscas en lenguaje natural y UrbIA filtra automáticamente los mejores resultados.'
    },
    {
      icon: '🤝',
      title: 'Asesor de compra',
      text: 'Desde la búsqueda hasta la firma: hipoteca, negociación y formalización. Tu asesor en cada paso.'
    }
  ];
}
