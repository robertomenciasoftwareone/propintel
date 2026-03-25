import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar.component';
import { TopbarComponent } from './shared/components/topbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="app-shell">
      <app-topbar />
      <div class="app-body">
        <app-sidebar />
        <main class="app-main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .app-body  { display: flex; flex: 1; overflow: hidden; }
    .app-main  { flex: 1; overflow-y: auto; }
  `]
})
export class App {}
