import { Component, inject } from '@angular/core';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import { MunicipioSelectorComponent } from './municipio-selector.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [MunicipioSelectorComponent],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <span class="topbar-title">Dashboard de Precios</span>
        <span class="topbar-sub">Asking (Idealista/Fotocasa) vs Precio Real Notarial</span>
      </div>

      <div class="zone-selector">
        <app-municipio-selector />
      </div>

      <div class="topbar-actions">
        <button class="btn-icon" title="Exportar informe">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8M5 7l3 3 3-3M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="btn-accent">+ Crear alerta</button>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 56px;
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 28px;
      gap: 24px;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .topbar-left { display: flex; flex-direction: column; gap: 2px; min-width: 200px; }
    .topbar-title { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .topbar-sub { font-size: 11px; color: var(--text-muted); }
    .zone-selector { display: flex; align-items: center; gap: 8px; flex: 1; }
    .topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
    .btn-icon {
      background: var(--bg3);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      width: 34px; height: 34px;
      border-radius: 8px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .15s;
    }
    .btn-icon:hover { border-color: var(--accent); color: var(--accent); }
    .btn-accent {
      background: var(--accent);
      color: #0d0f12;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background .15s;
    }
    .btn-accent:hover { background: #f0d060; }
  `]
})
export class TopbarComponent {
  svc = inject(InmobiliarioService);
}
