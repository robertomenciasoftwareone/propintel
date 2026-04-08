import { Component, computed, inject, signal } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { UrbiaBackendService, AsistenteAnuncioResumen } from '../../core/services/urbia-backend.service';

@Component({
  selector: 'app-servicios-urbia-panel',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, FormsModule],
  template: `
    <div class="svc-panel">

      <div class="panel-head">
        <span class="panel-icon">✦</span>
        <span class="panel-title">Servicios</span>
      </div>

      <!-- ── FAVORITOS ── -->
      <div class="svc-card">
        <div class="svc-card-header">
          <span class="svc-icon">♥</span>
          <div class="svc-title-wrap">
            <span class="svc-name">Favoritos</span>
            <span class="svc-badge blue" *ngIf="auth.isAuthenticated() && totalFavoritos() > 0">
              {{ totalFavoritos() }}
            </span>
          </div>
        </div>
        <p class="svc-desc" *ngIf="!auth.isAuthenticated()">
          Crea una cuenta para guardar inmuebles y revisarlos cuando quieras.
        </p>
        <a *ngIf="!auth.isAuthenticated()" routerLink="/registro" class="svc-btn svc-btn-primary">
          Crear cuenta gratis
        </a>
        <p class="svc-desc" *ngIf="auth.isAuthenticated() && totalFavoritos() === 0">
          Haz clic en el ♡ de cualquier inmueble para guardarlo aquí.
        </p>
        <p class="svc-desc strong-desc" *ngIf="auth.isAuthenticated() && totalFavoritos() > 0">
          {{ totalFavoritos() }} inmueble(s) guardado(s)
        </p>
      </div>

      <!-- ── NEWSLETTER ── -->
      <div class="svc-card">
        <div class="svc-card-header">
          <span class="svc-icon">✉</span>
          <div class="svc-title-wrap">
            <span class="svc-name">Alertas semanales</span>
          </div>
        </div>
        <p class="svc-desc">Recibe los mejores precios de tu zona cada semana en tu correo.</p>
        <div *ngIf="!newsletterOk" class="svc-form">
          <input
            type="email"
            [(ngModel)]="newsletterEmail"
            placeholder="tu@email.com"
            class="svc-input" />
          <button class="svc-btn svc-btn-outline" (click)="suscribirNewsletter()">
            Suscribirme
          </button>
        </div>
        <div *ngIf="newsletterOk" class="svc-success">✓ Suscripción confirmada</div>
        <p class="svc-desc error-desc" *ngIf="newsletterError">{{ newsletterError }}</p>
      </div>

      <!-- ── HIPOTECA ── -->
      <div class="svc-card">
        <div class="svc-card-header">
          <span class="svc-icon">🏦</span>
          <div class="svc-title-wrap">
            <span class="svc-name">Ayuda hipotecaria</span>
          </div>
        </div>
        <p class="svc-desc">
          Calcula tu capacidad de endeudamiento y encuentra las mejores condiciones del mercado.
        </p>
        <a href="mailto:hipoteca@urbia.es?subject=Ayuda%20con%20hipoteca" class="svc-btn svc-btn-outline">
          Contactar →
        </a>
      </div>

      <!-- ── NEGOCIACIÓN ── -->
      <div class="svc-card svc-card-expandable">
        <button class="svc-card-header svc-expand-btn" (click)="negociacionExpanded = !negociacionExpanded" type="button">
          <span class="svc-icon">🤝</span>
          <div class="svc-title-wrap">
            <span class="svc-name">Negociación</span>
          </div>
          <span class="expand-chevron" [class.open]="negociacionExpanded">›</span>
        </button>
        <div class="svc-expand-body" *ngIf="negociacionExpanded">
          <p class="svc-desc">
            Análisis del precio objetivo, estrategia de oferta, gestión de contraofertas y redacción del contrato de arras.
          </p>
          <a href="mailto:negociacion@urbia.es?subject=Ayuda%20en%20negociaci%C3%B3n" class="svc-btn svc-btn-outline">
            Hablar con un asesor →
          </a>
        </div>
      </div>

      <!-- ── FORMALIZACIÓN ── -->
      <div class="svc-card svc-card-expandable">
        <button class="svc-card-header svc-expand-btn" (click)="formalizacionExpanded = !formalizacionExpanded" type="button">
          <span class="svc-icon">📝</span>
          <div class="svc-title-wrap">
            <span class="svc-name">Formalización</span>
          </div>
          <span class="expand-chevron" [class.open]="formalizacionExpanded">›</span>
        </button>
        <div class="svc-expand-body" *ngIf="formalizacionExpanded">
          <p class="svc-desc">
            Acompañamiento en la firma ante notario, liquidación de ITP/AJD, inscripción en el Registro y gestión de suministros.
          </p>
          <a href="mailto:formalizacion@urbia.es?subject=Ayuda%20en%20formalizaci%C3%B3n" class="svc-btn svc-btn-outline">
            Hablar con un asesor →
          </a>
        </div>
      </div>

      <!-- ── ASISTENTE IA ── -->
      <div class="svc-card svc-card-ia">
        <div class="svc-card-header">
          <span class="svc-icon">🤖</span>
          <div class="svc-title-wrap">
            <span class="svc-name">Asistente IA</span>
            <span class="svc-badge purple">Beta</span>
          </div>
        </div>
        <p class="svc-desc">Pregunta en lenguaje natural y obtén respuestas con datos reales del inventario actual.</p>
        <div class="svc-form">
          <input
            type="text"
            [(ngModel)]="preguntaIA"
            placeholder="Ej: piso 3 hab en Madrid por menos de 350k"
            class="svc-input" />
          <button class="svc-btn svc-btn-ia" [disabled]="iaLoading" (click)="preguntarIA()">
            {{ iaLoading ? 'Consultando…' : 'Preguntar' }}
          </button>
        </div>
        <p class="svc-desc error-desc" *ngIf="iaError">{{ iaError }}</p>
        <p class="svc-desc ia-resp" *ngIf="iaRespuesta">{{ iaRespuesta }}</p>
        <div *ngIf="iaMuestra.length > 0" class="ia-muestra">
          <a
            class="ia-muestra-item"
            *ngFor="let m of iaMuestra"
            [href]="m.url"
            target="_blank"
            rel="noopener noreferrer">
            <span class="ia-m-title">{{ m.titulo || 'Inmueble' }}</span>
            <span class="ia-m-price">{{ m.precioTotal }} €</span>
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* ── PANEL ── */
    .svc-panel {
      background: #fff;
      border-left: 1px solid #F3F4F6;
      padding: 16px 14px;
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: 'Inter', sans-serif;
    }

    /* Panel heading */
    .panel-head {
      display: flex; align-items: center; gap: 7px;
      padding: 0 2px 4px;
    }
    .panel-icon { font-size: 10px; color: #2563EB; }
    .panel-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .12em; color: #9CA3AF;
    }

    /* ── SERVICE CARD ── */
    .svc-card {
      background: #FAFAFA;
      border: 1px solid #F3F4F6;
      border-radius: 12px;
      padding: 14px;
      transition: border-color .2s;
    }
    .svc-card:hover { border-color: #E5E7EB; }
    .svc-card-ia { background: #F5F3FF; border-color: #EDE9FE; }
    .svc-card-expandable { padding: 0; overflow: hidden; }

    .svc-card-header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 8px;
    }
    .svc-card-expandable .svc-card-header { margin-bottom: 0; }
    .svc-expand-btn {
      width: 100%; padding: 14px; background: none; border: none;
      cursor: pointer; text-align: left;
      display: flex; align-items: center; gap: 10px;
    }
    .svc-expand-btn:hover { background: #F9FAFB; }

    .svc-icon { font-size: 16px; flex-shrink: 0; }
    .svc-title-wrap { flex: 1; display: flex; align-items: center; gap: 7px; min-width: 0; }
    .svc-name { font-size: 12px; font-weight: 700; color: #1A1A1A; }

    .svc-badge {
      font-size: 9px; font-weight: 700; padding: 2px 7px;
      border-radius: 999px; text-transform: uppercase; letter-spacing: .06em;
    }
    .svc-badge.blue { background: #EFF6FF; color: #2563EB; }
    .svc-badge.purple { background: #F3E8FF; color: #7C3AED; }

    .expand-chevron {
      font-size: 18px; color: #9CA3AF; line-height: 1;
      transition: transform .2s;
      transform: rotate(90deg);
    }
    .expand-chevron.open { transform: rotate(-90deg); }

    .svc-expand-body { padding: 0 14px 14px; }

    /* Text */
    .svc-desc {
      font-size: 11px; color: #6B7280; line-height: 1.55; margin: 0 0 10px;
    }
    .strong-desc { font-weight: 700; color: #374151; }
    .error-desc { color: #DC2626; }
    .ia-resp { font-style: italic; background: #F9FAFB; padding: 8px; border-radius: 7px; border: 1px solid #F3F4F6; }

    /* Form */
    .svc-form { display: flex; flex-direction: column; gap: 7px; }
    .svc-input {
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11px;
      color: #1A1A1A;
      font-family: 'Inter', sans-serif;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }
    .svc-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }

    /* Buttons */
    .svc-btn {
      display: block; width: 100%; padding: 8px 0;
      border-radius: 8px; font-size: 12px; font-weight: 700;
      text-align: center; text-decoration: none; cursor: pointer;
      border: none; transition: background .15s, color .15s;
    }
    .svc-btn-primary { background: #2563EB; color: #fff; }
    .svc-btn-primary:hover { background: #1D4ED8; }
    .svc-btn-outline { background: #fff; color: #374151; border: 1px solid #E5E7EB; }
    .svc-btn-outline:hover { background: #F9FAFB; }
    .svc-btn-ia { background: #7C3AED; color: #fff; border: none; }
    .svc-btn-ia:hover:not(:disabled) { background: #6D28D9; }
    .svc-btn-ia:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Success */
    .svc-success { font-size: 12px; font-weight: 700; color: #16A34A; }

    /* IA muestra */
    .ia-muestra { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
    .ia-muestra-item {
      display: flex; justify-content: space-between; align-items: center;
      background: #fff; border: 1px solid #EDE9FE; border-radius: 8px;
      padding: 7px 10px; text-decoration: none;
      transition: background .15s;
    }
    .ia-muestra-item:hover { background: #F5F3FF; }
    .ia-m-title { font-size: 11px; font-weight: 600; color: #1A1A1A; }
    .ia-m-price { font-size: 11px; font-weight: 700; color: #7C3AED; }
  `]
})

      <!-- FAVORITOS -->
      <div class="servicio-item">
        <div class="servicio-header">
          <span class="servicio-icon">&#x2665;</span>
          <span class="servicio-nombre">Guardar favoritos</span>
        </div>
        <p class="servicio-desc" *ngIf="!auth.isAuthenticated()">
          Crea una cuenta para guardar inmuebles y acceder a ellos cuando quieras.
        </p>
        <a *ngIf="!auth.isAuthenticated()" routerLink="/registro" class="btn-servicio btn-accent">
          Registrarse gratis
        </a>
        <p class="servicio-desc" *ngIf="auth.isAuthenticated()">
          Haz clic en el &#x2665; de cualquier inmueble del mapa para guardarlo.
        </p>
        <p class="servicio-desc" *ngIf="auth.isAuthenticated() && totalFavoritos() > 0">
          Tienes {{ totalFavoritos() }} inmueble(s) guardado(s).
        </p>
      </div>

      <!-- NEWSLETTER -->
      <div class="servicio-item">
        <div class="servicio-header">
          <span class="servicio-icon">&#x2709;</span>
          <span class="servicio-nombre">Newsletter de oportunidades</span>
        </div>
        <p class="servicio-desc">Recibe semanalmente los inmuebles con mejor precio de la zona que buscas.</p>
        <div *ngIf="!newsletterOk" class="newsletter-form">
          <input
            type="email"
            [(ngModel)]="newsletterEmail"
            placeholder="tu@email.com"
            class="input-small" />
          <button class="btn-servicio btn-outline" (click)="suscribirNewsletter()">
            Suscribirme
          </button>
        </div>
        <div *ngIf="newsletterOk" class="success-msg">
          &#x2713; Suscripción confirmada
        </div>
        <div *ngIf="newsletterError" class="servicio-desc">{{ newsletterError }}</div>
      </div>

      <!-- HIPOTECA -->
      <div class="servicio-item">
        <div class="servicio-header">
          <span class="servicio-icon">&#x1F3E6;</span>
          <span class="servicio-nombre">Ayuda con tu hipoteca</span>
          <span class="badge-beta" *ngIf="false">Próximo</span>
        </div>
        <p class="servicio-desc">
          Te ayudamos a calcular tu capacidad de endeudamiento y a encontrar las mejores condiciones hipotecarias del mercado.
        </p>
        <a href="mailto:hipoteca@urbia.es?subject=Ayuda%20con%20hipoteca" class="btn-servicio btn-outline">
          Contactar
        </a>
      </div>

      <!-- NEGOCIACIÓN -->
      <div class="servicio-item" [class.collapsed]="!negociacionExpanded">
        <div class="servicio-header clickable" (click)="negociacionExpanded = !negociacionExpanded">
          <span class="servicio-icon">&#x1F91D;</span>
          <span class="servicio-nombre">Ayuda en la negociación</span>
          <span class="toggle-icon">{{ negociacionExpanded ? '&#x2212;' : '&#x002B;' }}</span>
        </div>
        <div class="servicio-content" *ngIf="negociacionExpanded">
          <p class="servicio-desc">
            El proceso de negociación incluye: análisis del precio objetivo, estrategia de oferta inicial,
            gestión de contraofertas y redacción del contrato de arras. Nuestros asesores te guían en cada paso.
          </p>
          <a href="mailto:negociacion@urbia.es?subject=Ayuda%20en%20negociaci%C3%B3n" class="btn-servicio btn-outline">
            Hablar con un asesor
          </a>
        </div>
      </div>

      <!-- FORMALIZACIÓN -->
      <div class="servicio-item" [class.collapsed]="!formalizacionExpanded">
        <div class="servicio-header clickable" (click)="formalizacionExpanded = !formalizacionExpanded">
          <span class="servicio-icon">&#x1F4DD;</span>
          <span class="servicio-nombre">Ayuda en la formalización</span>
          <span class="toggle-icon">{{ formalizacionExpanded ? '&#x2212;' : '&#x002B;' }}</span>
        </div>
        <div class="servicio-content" *ngIf="formalizacionExpanded">
          <p class="servicio-desc">
            Te acompañamos en la firma ante notario, liquidación de impuestos (ITP/AJD),
            inscripción en el Registro de la Propiedad y gestión de suministros.
          </p>
          <a href="mailto:formalizacion@urbia.es?subject=Ayuda%20en%20formalizaci%C3%B3n" class="btn-servicio btn-outline">
            Hablar con un asesor
          </a>
        </div>
      </div>

      <!-- ASISTENTE IA -->
      <div class="servicio-item servicio-ia">
        <div class="servicio-header">
          <span class="servicio-icon">&#x1F916;</span>
          <span class="servicio-nombre">Asistente IA</span>
          <span class="badge-beta">Beta</span>
        </div>
        <p class="servicio-desc">Pregunta en lenguaje natural y obtén respuesta con datos reales del inventario actual.</p>
        <div class="newsletter-form">
          <input
            type="text"
            [(ngModel)]="preguntaIA"
            placeholder="Ej: piso 3 hab por menos de 350000 en madrid"
            class="input-small" />
          <button class="btn-servicio btn-outline" [disabled]="iaLoading" (click)="preguntarIA()">
            {{ iaLoading ? 'Consultando...' : 'Preguntar' }}
          </button>
        </div>
        <div *ngIf="iaError" class="servicio-desc">{{ iaError }}</div>
        <div *ngIf="iaRespuesta" class="servicio-desc">{{ iaRespuesta }}</div>
        <div *ngIf="iaMuestra.length > 0" class="servicio-content">
          <a
            class="servicio-desc"
            *ngFor="let m of iaMuestra"
            [href]="m.url"
            target="_blank"
            rel="noopener noreferrer"
            style="display:block;margin-bottom:6px;">
            {{ m.titulo || 'Inmueble' }} · {{ m.precioTotal }} EUR
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .servicios-panel {
      background: var(--bg2);
      border-left: 1px solid var(--border);
      padding: 20px 16px;
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .panel-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    .servicio-item {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      background: var(--bg3);
      transition: border-color 0.2s;
    }
    .servicio-item:hover { border-color: var(--border-bright); }
    .servicio-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .servicio-header.clickable { cursor: pointer; margin-bottom: 0; }
    .collapsed .servicio-header.clickable { margin-bottom: 0; }
    .servicio-icon { font-size: 16px; flex-shrink: 0; }
    .servicio-nombre { font-size: 13px; font-weight: 600; flex: 1; color: var(--text-primary); }
    .toggle-icon { font-size: 16px; color: var(--text-muted); }
    .badge-beta {
      font-size: 10px;
      font-weight: 700;
      background: rgba(30, 111, 184, 0.15);
      color: var(--accent);
      padding: 2px 7px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .servicio-desc {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 10px;
    }
    .servicio-content { margin-top: 10px; }
    .newsletter-form {
      display: flex;
      gap: 8px;
      flex-direction: column;
    }
    .input-small {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 8px 10px;
      font-size: 12px;
      color: var(--text-primary);
      font-family: 'DM Sans', sans-serif;
      outline: none;
      width: 100%;
    }
    .input-small:focus { border-color: var(--accent); }
    .success-msg {
      font-size: 12px;
      color: var(--notarial);
      font-weight: 600;
    }
    .btn-servicio {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      padding: 7px 14px;
      border-radius: 7px;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s;
      width: 100%;
    }
    .btn-accent { background: var(--accent); color: #fff; }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border-bright);
      color: var(--text-primary);
    }
    .btn-outline:hover { background: var(--bg2); }
    .btn-disabled { background: var(--bg3); color: var(--text-muted); cursor: not-allowed; border: 1px solid var(--border); }
    .servicio-ia { opacity: 0.7; }
  `]
})
export class ServiciosUrbiaPanelComponent {
  readonly auth = inject(AuthService);
  private favoritosSvc = inject(FavoritosService);
  private analytics = inject(AnalyticsService);
  private backend = inject(UrbiaBackendService);

  readonly totalFavoritos = computed(() => this.favoritosSvc.favoritos().length);

  newsletterEmail = '';
  newsletterOk = false;
  newsletterError = '';
  negociacionExpanded = false;
  formalizacionExpanded = false;

  preguntaIA = '';
  iaLoading = false;
  iaError = '';
  iaRespuesta = '';
  iaMuestra: AsistenteAnuncioResumen[] = [];

  suscribirNewsletter(): void {
    if (!this.newsletterEmail || !this.newsletterEmail.includes('@')) return;

    this.newsletterError = '';
    this.backend.suscribirNewsletter({ email: this.newsletterEmail.trim() }).subscribe({
      next: () => {
        this.newsletterOk = true;
        this.analytics.trackNewsletterSubscription();
      },
      error: () => {
        this.newsletterError = 'No se pudo confirmar la suscripcion. Intentalo de nuevo.';
      }
    });
  }

  preguntarIA(): void {
    if (!this.preguntaIA.trim()) return;

    this.iaLoading = true;
    this.iaError = '';
    this.iaRespuesta = '';
    this.iaMuestra = [];

    this.backend.preguntarAsistente({ pregunta: this.preguntaIA.trim() }).subscribe({
      next: (resp) => {
        this.iaRespuesta = resp.respuesta;
        this.iaMuestra = resp.muestra ?? [];
        this.iaLoading = false;
      },
      error: () => {
        this.iaError = 'No pude consultar el asistente en este momento.';
        this.iaLoading = false;
      }
    });
  }
}
