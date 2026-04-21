import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './shared/components/sidebar.component';
import { TopbarComponent } from './shared/components/topbar.component';

const PUBLIC_PREFIXES = ['/', '/mapa-resultados', '/login', '/registro', '/hipotecas', '/estadisticas', '/catastro'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    @if (!isPublicRoute()) {
      <div class="app-shell">
        <app-topbar />
        <div class="app-body">
          <app-sidebar />
          <main class="app-main">
            <router-outlet />
          </main>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .app-body  { display: flex; flex: 1; overflow: hidden; }
    .app-main  { flex: 1; overflow-y: auto; }
  `]
})
export class App implements OnInit {
  private router = inject(Router);
  readonly isPublicRoute = signal(true);

  ngOnInit(): void {
    // Detectar ruta inicial
    this.checkRoute(this.router.url);

    // Detectar cambios de ruta
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.checkRoute(e.urlAfterRedirects);
    });
  }

  private checkRoute(url: string): void {
    const isPublic = PUBLIC_PREFIXES.some(p =>
      url === p || url.startsWith(p + '?') || (p !== '/' && url.startsWith(p))
    );
    this.isPublicRoute.set(isPublic);
    document.documentElement.setAttribute('data-theme', isPublic ? 'light' : 'dark');
  }
}
