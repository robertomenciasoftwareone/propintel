import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
<footer class="footer">
  <div class="container">
    <div class="top">
      <div class="brand-col">
        <img src="assets/logo_urbia.png" alt="UrbIA" class="logo" />
        <p>Tu asesor inmobiliario inteligente.<br>Comunidad de Madrid.</p>
        <div class="socials">
          <a href="#" class="social" aria-label="X">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="#" class="social" aria-label="LinkedIn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
        </div>
      </div>
      <div class="links-col">
        <p class="col-title">Producto</p>
        <a (click)="scroll('features')">Cómo funciona</a>
        <a (click)="scroll('precios')">Precios</a>
        <a routerLink="/mapa-resultados">Ver mapa</a>
        <a routerLink="/registro">Crear cuenta</a>
      </div>
      <div class="links-col">
        <p class="col-title">Datos</p>
        <a href="#">Fuentes notariales</a>
        <a href="#">Catastro</a>
        <a href="#">Fotocasa</a>
        <a href="#">Cobertura geográfica</a>
      </div>
      <div class="links-col">
        <p class="col-title">Legal</p>
        <a href="#">Privacidad</a>
        <a href="#">Términos de uso</a>
        <a href="#">Cookies</a>
        <a href="#">Contacto</a>
      </div>
    </div>
    <div class="bottom">
      <span>© 2026 UrbIA · Todos los derechos reservados</span>
      <span>Hecho en Madrid 🇪🇸</span>
    </div>
  </div>
</footer>
  `,
  styles: [`
.footer {
  background: #03050c;
  border-top: 1px solid rgba(255,255,255,.06);
  padding: 80px 24px 40px;
}
.container { max-width: 1140px; margin: 0 auto; }
.top {
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr 1fr;
  gap: 48px; margin-bottom: 64px;
}
.brand-col .logo {
  height: 32px; width: auto; object-fit: contain;
  margin-bottom: 16px; filter: brightness(1.1);
}
.brand-col p {
  font-size: 13px; line-height: 1.7;
  color: rgba(255,255,255,.3); margin: 0 0 20px;
}
.socials { display: flex; gap: 8px; }
.social {
  width: 34px; height: 34px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,.1);
  display: grid; place-items: center;
  color: rgba(255,255,255,.35); text-decoration: none;
  transition: background .2s, color .2s, border-color .2s;
}
.social:hover { background: rgba(255,255,255,.07); color: #fff; border-color: rgba(255,255,255,.2); }
.col-title {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .12em;
  color: rgba(255,255,255,.55); margin: 0 0 16px;
}
.links-col { display: flex; flex-direction: column; gap: 10px; }
.links-col a {
  font-size: 13px; color: rgba(255,255,255,.32);
  text-decoration: none; cursor: pointer;
  transition: color .2s;
}
.links-col a:hover { color: rgba(255,255,255,.8); }
.bottom {
  display: flex; align-items: center; justify-content: space-between;
  border-top: 1px solid rgba(255,255,255,.06);
  padding-top: 28px;
  font-size: 12px; color: rgba(255,255,255,.2);
  flex-wrap: wrap; gap: 8px;
}
@media (max-width: 900px) { .top { grid-template-columns: 1fr 1fr; } }
@media (max-width: 500px) { .top { grid-template-columns: 1fr; gap: 32px; } }
  `]
})
export class LandingFooterComponent {
  scroll(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
