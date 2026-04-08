import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';

interface Servicio {
  icon: string;
  nombre: string;
  desc: string;
  precio: string;
  tag?: string;
  tagColor?: string;
  route?: string;
  href?: string;
}

@Component({
  selector: 'app-servicios-panel',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Servicios añadidos</div>
          <div class="card-sub">Todos basados en el precio notarial real — sin estimaciones infladas</div>
        </div>
      </div>
      <div class="services-grid">
        <div class="service-card" *ngFor="let s of servicios" (click)="onServicioClick(s)">
          <span class="service-tag" *ngIf="s.tag"
            [style.color]="s.tagColor"
            [style.background]="s.tagColor + '1a'">{{ s.tag }}</span>
          <span class="service-icon">{{ s.icon }}</span>
          <div class="service-name">{{ s.nombre }}</div>
          <div class="service-desc">{{ s.desc }}</div>
          <div class="service-price">{{ s.precio }}</div>
          <button class="btn-service">
            {{ (s.route || s.href) ? 'Abrir →' : 'Solicitar →' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: #FFFFFF;
      border: 1px solid rgba(0, 52, 255, 0.06);
      border-radius: 16px;
      padding: 28px 32px;
      box-shadow: 0 10px 30px -10px rgba(0, 52, 255, 0.05);
    }
    .card-header { margin-bottom: 24px; }
    .card-title {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.03em;
    }
    .card-sub {
      font-size: 12px;
      color: #64748B;
      margin-top: 4px;
      font-weight: 400;
    }
    .services-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .service-card {
      background: #F8FAFC;
      border: 1px solid rgba(0, 52, 255, 0.06);
      border-radius: 16px;
      padding: 20px;
      position: relative;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
    }
    .service-card:hover {
      border-color: rgba(0, 82, 255, 0.15);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px -10px rgba(0, 52, 255, 0.08);
      background: #FFFFFF;
    }
    .service-tag {
      position: absolute;
      top: 14px;
      right: 14px;
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 600;
    }
    .service-icon {
      font-size: 20px;
      margin-bottom: 2px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 52, 255, 0.06);
    }
    .service-name {
      font-size: 13.5px;
      font-weight: 600;
      color: #0F172A;
      letter-spacing: -0.01em;
    }
    .service-desc {
      font-size: 12px;
      color: #64748B;
      font-weight: 400;
      line-height: 1.6;
      flex: 1;
    }
    .service-price {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: #00B5A3;
      margin-top: 4px;
      font-weight: 500;
    }
    .btn-service {
      background: none;
      border: none;
      color: #0052FF;
      padding: 4px 0;
      font-size: 12.5px;
      cursor: pointer;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 600;
      margin-top: 6px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      text-align: left;
      letter-spacing: -0.01em;
    }
    .btn-service:hover { color: #0041CC; letter-spacing: 0.01em; }
    @media(max-width:1200px){ .services-grid{grid-template-columns:repeat(2,1fr)} }
    @media(max-width:640px){ .services-grid{grid-template-columns:1fr} }
  `]
})
export class ServiciosPanelComponent {
  private router = inject(Router);

  servicios: Servicio[] = [
    {
      icon: '🏠', nombre: 'Tasación Automática (AVM)',
      desc: 'Estimación de valor basada en comparables reales del vecindario, datos notariales y Catastro.',
      precio: 'Gratis · Resultado inmediato',
      tag: 'Nuevo', tagColor: '#4fd1a5',
      route: '/tasacion',
    },
    {
      icon: '📐', nombre: 'Datos del Catastro',
      desc: 'Superficie real, año de construcción, valor catastral y valor de referencia AEAT por RC.',
      precio: 'Gratis · API oficial',
      tag: 'Oficial', tagColor: '#6ec1e4',
      route: '/catastro',
    },
    {
      icon: '📊', nombre: 'Estadísticas INE / BdE',
      desc: 'Índice de Precios de Vivienda (IPV), hipotecas constituidas y tipos de interés hipotecarios.',
      precio: 'Gratis · Datos oficiales',
      tag: 'INE', tagColor: '#a78bfa',
      route: '/estadisticas',
    },
    {
      icon: '⚖️', nombre: 'Asesoría de negociación',
      desc: 'Te decimos exactamente cuánto negociar con el vendedor según el gap histórico del distrito.',
      precio: 'desde 99€ · Sesión 1h',
    },
    {
      icon: '🔔', nombre: 'Alertas de oportunidad',
      desc: 'Notificación cuando aparezca un piso con asking cerca del precio notarial de su zona.',
      precio: 'Gratis en plan básico',
      route: '/alertas',
    },
    {
      icon: '📋', nombre: 'Due diligence',
      desc: 'Historial completo de transacciones del inmueble, cargas registrales y nota simple.',
      precio: 'desde 75€ · Inmediato',
    },
    {
      icon: '🛡️', nombre: 'Seguro de hogar',
      desc: 'Prima calculada sobre el valor notarial real. Sin sobreprecio por valoraciones del portal.',
      precio: 'desde 18€/mes',
    },
    {
      icon: '💰', nombre: 'Informe de inversión',
      desc: 'ROI real: precio notarial vs alquiler de mercado. Rentabilidad bruta y neta estimada.',
      precio: 'desde 200€ · Completo',
      tag: 'Pro', tagColor: '#e8c547',
    },
  ];

  onServicioClick(s: Servicio): void {
    if (s.route) {
      this.router.navigate([s.route]);
    } else if (s.href) {
      window.open(s.href, '_blank');
    }
  }
}
