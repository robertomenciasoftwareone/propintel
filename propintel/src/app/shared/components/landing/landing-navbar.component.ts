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
      background: rgba(255,255,255,0.82);
      backdrop-filter: blur(24px) saturate(200%);
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      border-bottom: 1px solid rgba(0,0,0,0.055);
      transition: box-shadow .4s ease, background .4s ease;
    }
    .nav.scrolled {
      background: rgba(255,255,255,0.92);
      box-shadow: 0 1px 0 rgba(0,0,0,0.05), 0 8px 32px rgba(0,52,255,0.07);
    }

    .nav-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center;
      justify-content: space-between;
      height: 68px;
    }

    .brand { text-decoration: none; display: flex; align-items: center; }
    .nav-logo { height: 34px; width: auto; display: block; }

    .links { display: flex; gap: 36px; }
    .link {
      font-size: 13.5px; font-weight: 500;
      color: #64748B;
      text-decoration: none; cursor: pointer;
      letter-spacing: -0.01em;
      transition: color .25s;
      position: relative;
    }
    .link::after {
      content: '';
      position: absolute; bottom: -2px; left: 0; right: 0;
      height: 1px; background: #0052FF;
      transform: scaleX(0); transform-origin: left;
      transition: transform .3s cubic-bezier(0.4,0,0.2,1);
    }
    .link:hover { color: #0052FF; }
    .link:hover::after { transform: scaleX(1); }

    .actions { display: flex; align-items: center; gap: 8px; }
    .ghost {
      font-size: 13.5px; font-weight: 500;
      color: #0F172A; text-decoration: none;
      padding: 8px 18px; border-radius: 10px;
      transition: all 0.3s;
      letter-spacing: -0.01em;
    }
    .ghost:hover { background: rgba(0,82,255,0.05); color: #0052FF; }

    .solid {
      display: flex; align-items: center; gap: 6px;
      font-size: 13.5px; font-weight: 700;
      color: #fff; text-decoration: none;
      padding: 9px 22px; border-radius: 11px;
      background: #0052FF;
      box-shadow: 0 2px 10px rgba(0,82,255,0.32), 0 6px 24px rgba(0,82,255,0.16);
      transition: all 0.4s cubic-bezier(0.2,0.8,0.2,1);
      letter-spacing: -0.02em;
    }
    .solid:hover {
      background: #0041CC;
      box-shadow: 0 4px 14px rgba(0,82,255,0.42), 0 12px 32px rgba(0,82,255,0.22);
      transform: scale(1.05);
    }
    .solid:active { transform: scale(0.97); }

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
