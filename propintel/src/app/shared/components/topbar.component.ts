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
      height: 60px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0, 52, 255, 0.06);
      display: flex;
      align-items: center;
      padding: 0 32px;
      gap: 24px;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .topbar-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 200px;
    }
    .topbar-title {
      font-size: 15px;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.04em;
      line-height: 1.2;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .topbar-sub {
      font-size: 11px;
      color: #94A3B8;
      font-weight: 400;
      letter-spacing: 0;
    }
    .zone-selector { display: flex; align-items: center; gap: 8px; flex: 1; }
    .topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
    .btn-icon {
      background: #F8FAFC;
      border: 1px solid rgba(0, 52, 255, 0.08);
      color: #64748B;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-icon:hover {
      border-color: #0052FF;
      color: #0052FF;
      background: #F0F7FF;
    }
    .btn-accent {
      background: #0052FF;
      color: #FFFFFF;
      border: none;
      padding: 9px 18px;
      border-radius: 12px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 30px -10px rgba(0, 82, 255, 0.35);
      letter-spacing: -0.01em;
    }
    .btn-accent:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 30px -8px rgba(0, 82, 255, 0.45);
    }
    .btn-accent:active {
      transform: scale(0.98);
      box-shadow: 0 4px 12px rgba(0, 82, 255, 0.25);
    }
  `]
})
export class TopbarComponent {
  svc = inject(InmobiliarioService);
}
