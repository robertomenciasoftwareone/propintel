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
    .card { background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:22px 24px; }
    .card-header { margin-bottom:20px; }
    .card-title  { font-size:13.5px; font-weight:500; color:var(--text-primary); }
    .card-sub    { font-size:11.5px; color:var(--text-secondary); margin-top:3px; font-weight:300; }
    .services-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
    .service-card {
      background:var(--bg3); border:1px solid var(--border); border-radius:10px;
      padding:18px; position:relative; transition:all .2s;
      display:flex; flex-direction:column; gap:6px; cursor:pointer;
    }
    .service-card:hover { border-color:rgba(167,139,250,0.35); transform:translateY(-2px); }
    .service-tag {
      position:absolute; top:12px; right:12px; font-size:9px;
      letter-spacing:1px; text-transform:uppercase; padding:2px 7px;
      border-radius:10px; font-weight:500;
    }
    .service-icon { font-size:24px; margin-bottom:4px; }
    .service-name { font-size:13px; font-weight:500; color:var(--text-primary); }
    .service-desc { font-size:11.5px; color:var(--text-secondary); font-weight:300; line-height:1.5; flex:1; }
    .service-price { font-family:'DM Mono',monospace; font-size:12px; color:#a78bfa; margin-top:4px; }
    .btn-service {
      background:none; border:1px solid rgba(167,139,250,0.25); color:#a78bfa;
      padding:6px 10px; border-radius:6px; font-size:11.5px; cursor:pointer;
      font-family:inherit; margin-top:8px; transition:all .15s;
    }
    .btn-service:hover { background:rgba(167,139,250,0.1); border-color:#a78bfa; }
    @media(max-width:1200px){ .services-grid{grid-template-columns:repeat(2,1fr)} }
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
      route: '/tasacion',
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
