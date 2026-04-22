import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Review {
  id: string;
  autor: string;
  avatar: string;
  fecha: string;
  estrellas: number;
  texto: string;
  inmueble: string;
  util: number;
}

interface Agente {
  id: string;
  nombre: string;
  agencia: string;
  ciudad: string;
  especialidad: string[];
  foto: string;
  telefono: string;
  email: string;
  añosExperiencia: number;
  operaciones: number;
  valoracion: number;
  reviews: Review[];
  verificado: boolean;
}

const AGENTES: Agente[] = [
  {
    id: '1',
    nombre: 'María González',
    agencia: 'Engel & Völkers Madrid',
    ciudad: 'Madrid',
    especialidad: ['Lujo', 'Salamanca', 'Retiro'],
    foto: '',
    telefono: '+34 610 234 567',
    email: 'maria.gonzalez@engelvoelkers.com',
    añosExperiencia: 12,
    operaciones: 284,
    valoracion: 4.8,
    verificado: true,
    reviews: [
      { id: 'r1', autor: 'Carlos M.', avatar: 'CM', fecha: '2024-11-20', estrellas: 5, texto: 'Increíble profesional. Encontró exactamente lo que buscábamos en tiempo récord. Totalmente recomendable.', inmueble: 'Piso en Salamanca', util: 12 },
      { id: 'r2', autor: 'Ana P.', avatar: 'AP', fecha: '2024-10-08', estrellas: 5, texto: 'María conoce el barrio de Salamanca al dedillo. Muy honesta y transparente en todo el proceso.', inmueble: 'Ático en Retiro', util: 8 },
      { id: 'r3', autor: 'Luis R.', avatar: 'LR', fecha: '2024-09-15', estrellas: 4, texto: 'Buena agente, aunque tardó un poco en responder los primeros días. El resultado final fue excelente.', inmueble: 'Piso en Chamberí', util: 3 },
    ]
  },
  {
    id: '2',
    nombre: 'Javier Martínez',
    agencia: 'RE/MAX Barcelona',
    ciudad: 'Barcelona',
    especialidad: ['Eixample', 'Inversión', 'Obra nueva'],
    foto: '',
    telefono: '+34 622 345 678',
    email: 'javier.martinez@remax.es',
    añosExperiencia: 8,
    operaciones: 156,
    valoracion: 4.6,
    verificado: true,
    reviews: [
      { id: 'r4', autor: 'Marta S.', avatar: 'MS', fecha: '2024-11-10', estrellas: 5, texto: 'Excelente conocimiento del mercado de Barcelona. Nos ahorró mucho tiempo y dinero.', inmueble: 'Piso en Eixample', util: 9 },
      { id: 'r5', autor: 'Pedro L.', avatar: 'PL', fecha: '2024-10-22', estrellas: 4, texto: 'Muy profesional. Proceso fluido y bien comunicado en todo momento.', inmueble: 'Inversión en Gràcia', util: 5 },
    ]
  },
  {
    id: '3',
    nombre: 'Carmen Rodríguez',
    agencia: 'Solvia Servicios Inmobiliarios',
    ciudad: 'Valencia',
    especialidad: ['Familiar', 'Primeras viviendas', 'Zona norte'],
    foto: '',
    telefono: '+34 633 456 789',
    email: 'carmen.rodriguez@solvia.es',
    añosExperiencia: 15,
    operaciones: 412,
    valoracion: 4.9,
    verificado: true,
    reviews: [
      { id: 'r6', autor: 'Jorge F.', avatar: 'JF', fecha: '2024-11-25', estrellas: 5, texto: 'Carmen es la mejor agente con la que hemos trabajado. Paciente, honesta y muy conocedora del mercado valenciano.', inmueble: 'Chalet en Campanar', util: 18 },
      { id: 'r7', autor: 'Elena B.', avatar: 'EB', fecha: '2024-11-01', estrellas: 5, texto: 'Gestionó todo perfectamente, incluyendo la parte legal. Totalmente sin estrés.', inmueble: 'Piso en Rascanya', util: 11 },
      { id: 'r8', autor: 'Raúl C.', avatar: 'RC', fecha: '2024-09-30', estrellas: 5, texto: 'Cerró nuestra operación por debajo del precio de lista. Increíble negociadora.', inmueble: 'Adosado en Benimaclet', util: 7 },
    ]
  },
];

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, DecimalPipe, RouterLink],
  template: `
    <div class="page-wrap">
      <div class="page-header">
        <a routerLink="/dashboard" class="back-link">
          <svg viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Inicio
        </a>
        <h1 class="page-title">Reviews de agentes inmobiliarios</h1>
        <p class="page-sub">62% de los compradores eligen agente por reviews. Lee opiniones verificadas.</p>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <input class="search-inp" [(ngModel)]="searchQ" placeholder="Buscar agente, agencia o ciudad..." />
        <div class="filter-chips">
          <button class="chip" *ngFor="let c of ciudades" [class.active]="filtroCiudad() === c" (click)="toggleCiudad(c)">{{ c }}</button>
        </div>
        <select class="sort-sel" [(ngModel)]="sortBy">
          <option value="valoracion">Mayor valoración</option>
          <option value="operaciones">Más operaciones</option>
          <option value="experiencia">Más experiencia</option>
        </select>
      </div>

      <!-- Lista agentes -->
      <div class="agentes-grid">
        <div class="agente-card" *ngFor="let a of agentesFiltrados()" (click)="seleccionado.set(seleccionado() === a.id ? '' : a.id)">
          <!-- Cabecera -->
          <div class="agente-head">
            <div class="agente-avatar">{{ iniciales(a.nombre) }}</div>
            <div class="agente-info">
              <div class="agente-nombre">
                {{ a.nombre }}
                <span class="verified" *ngIf="a.verificado" title="Agente verificado">✓</span>
              </div>
              <div class="agente-agencia">{{ a.agencia }}</div>
              <div class="agente-ciudad">📍 {{ a.ciudad }}</div>
            </div>
            <div class="agente-score">
              <div class="score-num">{{ a.valoracion | number:'1.1-1' }}</div>
              <div class="stars">{{ estrellas(a.valoracion) }}</div>
              <div class="reviews-count">{{ a.reviews.length }} reviews</div>
            </div>
          </div>

          <!-- Stats -->
          <div class="agente-stats">
            <div class="agente-stat"><span class="s-val">{{ a.añosExperiencia }}</span><span class="s-lbl">años</span></div>
            <div class="agente-stat"><span class="s-val">{{ a.operaciones }}</span><span class="s-lbl">operaciones</span></div>
            <div class="agente-stat">
              <span class="s-val" *ngFor="let e of a.especialidad.slice(0,2)">
                <span class="esp-tag">{{ e }}</span>
              </span>
            </div>
          </div>

          <!-- Contacto -->
          <div class="agente-contact">
            <a [href]="'tel:' + a.telefono" class="contact-btn phone" (click)="$event.stopPropagation()">
              <svg viewBox="0 0 16 16" fill="none"><path d="M3 2h3l1 3-1.5 1.5A10 10 0 009 10l1.5-1.5 3 1V13c0 .5-1 2-4 1C5 13 1 8.5 1 5c0-2.5 1.5-3 2-3z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
              Llamar
            </a>
            <a [href]="'https://wa.me/' + a.telefono.replace(/[^0-9]/g,'')" target="_blank" rel="noopener" class="contact-btn wa" (click)="$event.stopPropagation()">
              <svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5A6.5 6.5 0 1014.5 8c0-3.59-2.91-6.5-6.5-6.5zM2.5 14l.9-2.6A6 6 0 012 8 6 6 0 118 14a6 6 0 01-2.9-.75L2.5 14z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
              WhatsApp
            </a>
            <a [href]="'mailto:' + a.email" class="contact-btn email" (click)="$event.stopPropagation()">Email</a>
          </div>

          <!-- Reviews expandidas -->
          <div class="reviews-section" *ngIf="seleccionado() === a.id">
            <div class="review-item" *ngFor="let r of a.reviews">
              <div class="review-head">
                <div class="review-avatar">{{ r.avatar }}</div>
                <div class="review-meta">
                  <div class="review-autor">{{ r.autor }}</div>
                  <div class="review-fecha">{{ formatFecha(r.fecha) }} · {{ r.inmueble }}</div>
                </div>
                <div class="review-estrellas">{{ estrellas(r.estrellas) }}</div>
              </div>
              <p class="review-texto">"{{ r.texto }}"</p>
              <div class="review-util">
                <button class="util-btn" (click)="marcarUtil(a.id, r.id); $event.stopPropagation()">
                  👍 Útil ({{ r.util }})
                </button>
              </div>
            </div>

            <!-- Formulario nueva review -->
            <div class="new-review" *ngIf="!reviewEnviada()">
              <div class="new-review-title">¿Trabajaste con {{ a.nombre.split(' ')[0] }}?</div>
              <div class="star-picker">
                <span *ngFor="let s of [1,2,3,4,5]" class="star-pick" [class.sel]="nuevaEstrellas() >= s"
                  (click)="nuevaEstrellas.set(s)">★</span>
              </div>
              <textarea class="review-ta" [(ngModel)]="nuevaTexto" placeholder="Comparte tu experiencia..." rows="3"></textarea>
              <button class="btn-enviar" (click)="enviarReview(a.id)">Publicar review</button>
            </div>
            <div class="review-gracias" *ngIf="reviewEnviada()">¡Gracias por tu review! Será verificada en 24h.</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { max-width: 960px; margin: 0 auto; padding: 32px 24px; font-family: 'Plus Jakarta Sans', sans-serif; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #64748B; font-size: 13px; text-decoration: none; margin-bottom: 12px; }
    .back-link svg { width: 14px; height: 14px; }
    .page-title { font-size: 26px; font-weight: 800; color: #0F172A; margin: 0 0 6px; }
    .page-sub { font-size: 14px; color: #64748B; margin: 0 0 24px; }

    .filters-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 20px; }
    .search-inp { padding: 9px 14px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 13px; min-width: 240px; outline: none; }
    .search-inp:focus { border-color: #0052FF; }
    .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 5px 12px; border-radius: 20px; border: 1px solid #E2E8F0; background: #fff; font-size: 12px; cursor: pointer; color: #64748B; }
    .chip.active { background: #EEF4FF; border-color: #0052FF; color: #0052FF; font-weight: 600; }
    .sort-sel { padding: 8px 12px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 12px; color: #475569; outline: none; }

    .agentes-grid { display: flex; flex-direction: column; gap: 16px; }
    .agente-card { background: #fff; border-radius: 16px; border: 1px solid #E2E8F0; padding: 20px; cursor: pointer; transition: box-shadow .2s; }
    .agente-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.07); }

    .agente-head { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
    .agente-avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #0052FF, #7C3AED); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
    .agente-info { flex: 1; }
    .agente-nombre { font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 6px; }
    .verified { background: #EEF4FF; color: #0052FF; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; }
    .agente-agencia { font-size: 12px; color: #64748B; margin: 2px 0; }
    .agente-ciudad { font-size: 12px; color: #94A3B8; }
    .agente-score { text-align: right; flex-shrink: 0; }
    .score-num { font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1; }
    .stars { font-size: 14px; color: #F59E0B; }
    .reviews-count { font-size: 11px; color: #94A3B8; }

    .agente-stats { display: flex; gap: 16px; align-items: center; padding: 12px 0; border-top: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9; margin-bottom: 14px; }
    .agente-stat { display: flex; flex-direction: column; gap: 2px; }
    .s-val { font-size: 15px; font-weight: 700; color: #0F172A; }
    .s-lbl { font-size: 10px; color: #94A3B8; text-transform: uppercase; letter-spacing: .5px; }
    .esp-tag { display: inline-block; background: #F1F5F9; color: #475569; padding: 2px 8px; border-radius: 20px; font-size: 11px; margin-right: 4px; }

    .agente-contact { display: flex; gap: 8px; }
    .contact-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; transition: .2s; }
    .contact-btn svg { width: 13px; height: 13px; }
    .contact-btn.phone { background: #EEF4FF; color: #0052FF; }
    .contact-btn.phone:hover { background: #0052FF; color: #fff; }
    .contact-btn.wa { background: #F0FDF4; color: #16A34A; }
    .contact-btn.wa:hover { background: #16A34A; color: #fff; }
    .contact-btn.email { background: #F8FAFC; color: #64748B; }
    .contact-btn.email:hover { background: #475569; color: #fff; }

    .reviews-section { margin-top: 16px; border-top: 1px solid #F1F5F9; padding-top: 16px; }
    .review-item { background: #F8FAFC; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
    .review-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
    .review-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #E2E8F0, #CBD5E1); color: #475569; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .review-autor { font-size: 13px; font-weight: 600; color: #0F172A; }
    .review-fecha { font-size: 11px; color: #94A3B8; }
    .review-estrellas { margin-left: auto; color: #F59E0B; font-size: 13px; }
    .review-texto { font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 8px; font-style: italic; }
    .review-util { text-align: right; }
    .util-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: #64748B; padding: 4px 8px; border-radius: 6px; }
    .util-btn:hover { background: #F1F5F9; }

    .new-review { background: #F8FAFC; border-radius: 10px; padding: 14px; margin-top: 12px; }
    .new-review-title { font-size: 13px; font-weight: 600; color: #0F172A; margin-bottom: 10px; }
    .star-picker { margin-bottom: 10px; }
    .star-pick { font-size: 24px; cursor: pointer; color: #E2E8F0; transition: color .15s; }
    .star-pick.sel { color: #F59E0B; }
    .review-ta { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 13px; font-family: inherit; resize: vertical; outline: none; box-sizing: border-box; }
    .review-ta:focus { border-color: #0052FF; }
    .btn-enviar { margin-top: 10px; padding: 9px 20px; background: #0052FF; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-enviar:hover { background: #0040CC; }
    .review-gracias { text-align: center; color: #16A34A; font-size: 13px; font-weight: 600; padding: 12px; }
  `]
})
export class ReviewsComponent {
  searchQ = '';
  filtroCiudad = signal('');
  sortBy = 'valoracion';
  seleccionado = signal('');
  nuevaEstrellas = signal(0);
  nuevaTexto = '';
  reviewEnviada = signal(false);

  readonly ciudades = ['Madrid', 'Barcelona', 'Valencia'];

  toggleCiudad(c: string) {
    this.filtroCiudad.set(this.filtroCiudad() === c ? '' : c);
  }

  agentesFiltrados = computed(() => {
    let a = [...AGENTES];
    if (this.filtroCiudad()) a = a.filter(x => x.ciudad === this.filtroCiudad());
    if (this.searchQ.trim()) {
      const q = this.searchQ.toLowerCase();
      a = a.filter(x => x.nombre.toLowerCase().includes(q) || x.agencia.toLowerCase().includes(q) || x.ciudad.toLowerCase().includes(q));
    }
    if (this.sortBy === 'valoracion') a.sort((x, y) => y.valoracion - x.valoracion);
    else if (this.sortBy === 'operaciones') a.sort((x, y) => y.operaciones - x.operaciones);
    else if (this.sortBy === 'experiencia') a.sort((x, y) => y.añosExperiencia - x.añosExperiencia);
    return a;
  });

  iniciales(nombre: string) {
    return nombre.split(' ').slice(0, 2).map(p => p[0]).join('');
  }

  estrellas(n: number) {
    const full = Math.floor(n);
    const half = n - full >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  }

  formatFecha(f: string) {
    return new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  marcarUtil(agenteId: string, reviewId: string) {
    const agente = AGENTES.find(a => a.id === agenteId);
    const review = agente?.reviews.find(r => r.id === reviewId);
    if (review) review.util++;
  }

  enviarReview(agenteId: string) {
    if (!this.nuevaEstrellas() || !this.nuevaTexto.trim()) return;
    this.reviewEnviada.set(true);
    setTimeout(() => {
      this.reviewEnviada.set(false);
      this.nuevaEstrellas.set(0);
      this.nuevaTexto = '';
    }, 4000);
  }
}
