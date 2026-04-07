import { Component } from '@angular/core';

@Component({
  selector: 'app-landing-trust',
  standalone: true,
  template: `
    <section id="clientes" class="trust">
      <p class="title">Datos reales de transacciones notariales de la Comunidad de Madrid</p>
      <div class="stats">
        <div class="stat">
          <strong>+50.000</strong>
          <span>inmuebles analizados</span>
        </div>
        <div class="stat">
          <strong>32</strong>
          <span>municipios cubiertos</span>
        </div>
        <div class="stat">
          <strong>3 fuentes</strong>
          <span>Fotocasa · Idealista · Notarial</span>
        </div>
        <div class="stat">
          <strong>Gratis</strong>
          <span>para empezar hoy</span>
        </div>
      </div>
      <div class="testimonials">
        @for (t of testimonials; track t.name) {
          <article>
            <p class="quote">"{{ t.quote }}"</p>
            <div class="author">{{ t.name }} · {{ t.role }}</div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .trust { padding: 38px 0 20px; }
    .title {
      margin: 0 0 20px;
      color: #6b819f;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-weight: 700;
      text-align: center;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat {
      border: 1px solid #dae8f9;
      border-radius: 14px;
      background: #fff;
      padding: 16px 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat strong {
      font-size: 24px;
      font-weight: 700;
      color: #1a3d6b;
      letter-spacing: -0.02em;
    }
    .stat span { color: #6b809e; font-size: 12px; }
    .testimonials {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .testimonials article {
      border: 1px solid #dbe9f9;
      border-radius: 14px;
      background: #ffffff;
      padding: 16px;
      box-shadow: 0 8px 18px rgba(22, 72, 130, 0.08);
    }
    .quote { margin: 0; color: #314d70; line-height: 1.6; font-size: 14px; }
    .author { margin-top: 12px; color: #6c83a0; font-size: 12px; font-weight: 600; }
    @media (max-width: 980px) {
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .testimonials { grid-template-columns: 1fr; }
    }
  `]
})
export class LandingTrustComponent {
  readonly testimonials = [
    {
      quote: 'Llevaba meses mirando pisos sin saber si el precio era razonable. UrbIA me mostró en segundos que el piso que quería estaba un 18% por encima del mercado. Negocié y ahorré 40.000€.',
      name: 'Carlos M.',
      role: 'Comprador primera vivienda, Madrid'
    },
    {
      quote: 'El mapa con el semáforo es brutal. Por fin puedo ver de un vistazo qué pisos merecen la pena sin perder tiempo llamando a agencias.',
      name: 'Laura P.',
      role: 'Compradora, Pozuelo de Alarcón'
    },
    {
      quote: 'Herramienta imprescindible para cualquiera que esté buscando piso en Madrid. Los datos notariales son el diferencial clave.',
      name: 'Miguel A.',
      role: 'Inversor inmobiliario, Getafe'
    }
  ];
}
