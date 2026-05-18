import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor } from '@angular/common';

/**
 * UpgradeWallComponent — bloquea contenido Pro con un overlay de upgrade.
 *
 * Uso:
 *   <app-upgrade-wall
 *     titulo="Precio notarial real"
 *     descripcion="Accede al precio real escriturado ante notario para esta zona."
 *     [features]="['Gap% asking vs notarial', 'Semáforo de oportunidad', 'Tasación AVM']"
 *   >
 *     <!-- Contenido que se verá difuminado debajo -->
 *     <div class="mi-contenido-pro">...</div>
 *   </app-upgrade-wall>
 */
@Component({
  selector: 'app-upgrade-wall',
  standalone: true,
  imports: [RouterLink, NgFor],
  template: `
<div class="wall-wrap">
  <!-- Slot de contenido — aparece difuminado -->
  <div class="wall-content">
    <ng-content></ng-content>
  </div>

  <!-- Overlay de bloqueo -->
  <div class="wall-overlay">
    <div class="wall-card">

      <!-- Icono lock con glow dorado -->
      <div class="lock-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>

      <!-- Texto -->
      <div class="wall-text">
        <span class="wall-pro-badge">PRO</span>
        <h3 class="wall-title">{{ titulo }}</h3>
        @if (descripcion) {
          <p class="wall-desc">{{ descripcion }}</p>
        }
      </div>

      <!-- Lista de features que se desbloquean -->
      @if (features && features.length > 0) {
        <ul class="wall-feats">
          @for (f of features; track f) {
            <li>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              {{ f }}
            </li>
          }
        </ul>
      }

      <!-- CTA -->
      <a routerLink="/precios" class="wall-cta">
        Desbloquear con Pro
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>

      <p class="wall-note">7 días gratis · Sin tarjeta · Cancela cuando quieras</p>

    </div>
  </div>
</div>
  `,
  styles: [`
:host {
  display: block;
  --gold:       #C59400;
  --gold-light: #F0D060;
  --brand:      #0052FF;
  --bg-dark:    #070C1C;
  --border:     rgba(255,255,255,0.07);
  --text:       #F0F4FF;
  --muted:      rgba(255,255,255,0.45);
}

/* Wrapper — posicionamiento relativo para el overlay */
.wall-wrap {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  isolation: isolate;
}

/* Contenido difuminado */
.wall-content {
  filter: blur(5px) brightness(0.55) saturate(0.3);
  pointer-events: none;
  user-select: none;
  min-height: 140px;
}

/* Overlay centrado sobre el contenido */
.wall-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 12, 28, 0.60);
  backdrop-filter: blur(2px);
  padding: 20px;
}

/* Card central */
.wall-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  max-width: 360px;
  width: 100%;
  background: rgba(8, 13, 32, 0.94);
  border-radius: 20px;
  padding: 28px 28px 24px;
  border: 1px solid rgba(197, 148, 0, 0.25);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.05),
    0 24px 64px rgba(0,0,0,0.52),
    0 0 40px rgba(197,148,0,0.06);

  /* Gradient border shimmer effect */
  background-image:
    linear-gradient(rgba(8,13,32,0.95), rgba(8,13,32,0.95)),
    linear-gradient(138deg, rgba(197,148,0,0.40) 0%, rgba(240,208,96,0.20) 35%, rgba(197,148,0,0.10) 65%, rgba(197,148,0,0.35) 100%);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  border: 1.5px solid transparent;
}

/* Lock icon */
.lock-icon {
  width: 52px; height: 52px;
  background: rgba(197,148,0,0.12);
  border: 1px solid rgba(197,148,0,0.24);
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  color: var(--gold-light);
  box-shadow: 0 0 20px rgba(197,148,0,0.18);
}

/* Text block */
.wall-text {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.wall-pro-badge {
  display: inline-block;
  background: linear-gradient(138deg, var(--gold), var(--gold-light));
  color: #1A0E00;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase;
  border-radius: 999px; padding: 3px 10px;
  box-shadow: 0 2px 12px rgba(197,148,0,0.28);
}
.wall-title {
  font-size: 17px; font-weight: 700;
  color: var(--text); letter-spacing: -0.03em; margin: 0;
  line-height: 1.25;
}
.wall-desc {
  font-size: 13px; color: var(--muted); line-height: 1.55;
  margin: 0; max-width: 280px;
}

/* Features unlock list */
.wall-feats {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 8px;
  width: 100%;
}
.wall-feats li {
  display: flex; align-items: center; gap: 9px;
  font-size: 12.5px; color: rgba(255,255,255,0.68);
  text-align: left;
}
.wall-feats li svg { color: #00B5A3; flex-shrink: 0; }

/* CTA button */
.wall-cta {
  display: flex; align-items: center; gap: 8px;
  justify-content: center;
  width: 100%;
  padding: 13px 24px;
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
  color: #1A0E00;
  border-radius: 13px;
  font-size: 14px; font-weight: 700;
  text-decoration: none;
  letter-spacing: -0.01em;
  transition: transform .26s cubic-bezier(.2,.8,.2,1), box-shadow .26s;
  box-shadow: 0 6px 22px rgba(197,148,0,0.36);
}
.wall-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(197,148,0,0.50);
}
.wall-cta svg { flex-shrink: 0; }

/* Note under CTA */
.wall-note {
  font-size: 11px; color: rgba(255,255,255,0.22);
  margin: 0; letter-spacing: 0.02em;
}
  `]
})
export class UpgradeWallComponent {
  /** Título del feature bloqueado */
  @Input() titulo = 'Función exclusiva Pro';

  /** Descripción opcional */
  @Input() descripcion = '';

  /** Lista de features que se desbloquean con Pro */
  @Input() features: string[] = [];
}
