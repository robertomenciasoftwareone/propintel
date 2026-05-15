import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './shared/components/sidebar.component';
import { TopbarComponent } from './shared/components/topbar.component';
import { ChatFlotanteComponent } from './shared/components/chat-flotante.component';

const PUBLIC_PREFIXES = ['/', '/mapa-resultados', '/login', '/registro'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, ChatFlotanteComponent],
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
        <!-- Chat flotante global (excepto en /asistente) -->
        @if (!isAsistenteRoute()) {
          <app-chat-flotante />
        }
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
  readonly isAsistenteRoute = signal(false);

  ngOnInit(): void {
    this.checkRoute(this.router.url);
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
    this.isAsistenteRoute.set(url.startsWith('/asistente'));
    document.documentElement.setAttribute('data-theme', isPublic ? 'light' : 'dark');
  }
}
