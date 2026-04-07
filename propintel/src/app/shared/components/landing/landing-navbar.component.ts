import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="nav" [class.scrolled]="scrolled">
      <div class="nav-inner">
        <a routerLink="/" class="brand">
          <img src="assets/logo_urbia.png" alt="UrbIA" class="nav-logo" />
        </a>
        <nav class="links">
          <a (click)="go('features')" class="link">Producto</a>
          <a (click)="go('como-funciona')" class="link">Cómo funciona</a>
          <a (click)="go('precios')" class="link">Precios</a>
        </nav>
        <div class="actions">
          <a routerLink="/login" class="ghost">Entrar</a>
          <a routerLink="/registro" class="solid">
            Empezar gratis
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; display: block; }

    .nav {
      padding: 0 40px;
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-bottom: 1px solid rgba(0,0,0,0.06);
      transition: box-shadow .3s ease;
    }
    .nav.scrolled {
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }

    .nav-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center;
      justify-content: space-between;
      height: 64px;
    }

    .brand { text-decoration: none; display: flex; align-items: center; }
    .nav-logo { height: 36px; width: auto; display: block; }

    .links { display: flex; gap: 32px; }
    .link {
      font-size: 14px; font-weight: 500;
      color: #6B7280;
      text-decoration: none; cursor: pointer;
      letter-spacing: -0.01em;
      transition: color .2s;
    }
    .link:hover { color: #1A1A1A; }

    .actions { display: flex; align-items: center; gap: 8px; }
    .ghost {
      font-size: 14px; font-weight: 500;
      color: #374151; text-decoration: none;
      padding: 8px 16px; border-radius: 8px;
      transition: background .2s;
    }
    .ghost:hover { background: #F3F4F6; }

    .solid {
      display: flex; align-items: center; gap: 6px;
      font-size: 14px; font-weight: 600;
      color: #fff; text-decoration: none;
      padding: 9px 20px; border-radius: 10px;
      background: #2563EB;
      box-shadow: 0 1px 2px rgba(37,99,235,0.3), 0 4px 12px rgba(37,99,235,0.2);
      transition: all .2s;
      letter-spacing: -0.01em;
    }
    .solid:hover {
      background: #1D4ED8;
      box-shadow: 0 1px 2px rgba(37,99,235,0.4), 0 6px 16px rgba(37,99,235,0.3);
      transform: translateY(-1px);
    }
    .solid:active { transform: translateY(0); }

    @media (max-width: 760px) {
      .nav { padding: 0 20px; }
      .links { display: none; }
    }
  `]
})
export class LandingNavbarComponent {
  scrolled = false;

  @HostListener('window:scroll')
  onScroll() { this.scrolled = window.scrollY > 20; }

  go(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
