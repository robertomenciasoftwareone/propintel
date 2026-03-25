import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { AlertasService } from '../../core/services/alertas.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  template: `
    <nav class="sidebar">
      <div class="logo">PROP<span>INTEL</span></div>

      <div class="nav-section-label">Análisis</div>
      <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="8" width="3" height="7" rx="1" fill="currentColor" opacity=".6"/><rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor" opacity=".8"/><rect x="11" y="2" width="3" height="13" rx="1" fill="currentColor"/></svg>
        Comparativa Precios
      </a>
      <a class="nav-item" routerLink="/historico" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v4l3 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Histórico
      </a>
      <a class="nav-item" routerLink="/mapa" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M1 4l5-2 4 2 5-2v10l-5 2-4-2-5 2V4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 2v10M10 4v10" stroke="currentColor" stroke-width="1.3"/></svg>
        Mapa
      </a>

      <div class="nav-section-label" style="margin-top:16px">Negocio</div>
      <a class="nav-item" routerLink="/alertas" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 014 4v3l1 2H3l1-2V6a4 4 0 014-4z" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 13a1.5 1.5 0 003 0" stroke="currentColor" stroke-width="1.5"/></svg>
        Alertas
        <span class="badge warn" *ngIf="alertas.totalNoLeidos() > 0">
          {{ alertas.totalNoLeidos() }}
        </span>
      </a>
      <a class="nav-item disabled" title="Próximamente">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 100 12A6 6 0 008 2z" stroke="currentColor" stroke-width="1.5"/><path d="M8 6v4M6 8h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Servicios
        <span class="badge new">Pronto</span>
      </a>

      <div class="sidebar-footer">
        <div class="data-live-dot"></div>
        <span>Datos actualizados hoy</span>
      </div>
    </nav>
  `,
  styles: [`
    .sidebar {
      width:220px; background:var(--bg2); border-right:1px solid var(--border);
      padding:24px 14px; display:flex; flex-direction:column; gap:2px; height:100%;
    }
    .logo { font-family:'Bebas Neue',sans-serif; font-size:24px; letter-spacing:3px; color:var(--accent); margin-bottom:20px; padding:0 10px; }
    .logo span { color:var(--text-secondary); }
    .nav-section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-muted); padding:8px 10px 4px; font-weight:500; }
    .nav-item {
      display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px;
      color:var(--text-secondary); cursor:pointer; font-size:13.5px; font-weight:400;
      text-decoration:none; border:1px solid transparent; transition:all .15s;
    }
    .nav-item svg { width:15px; height:15px; flex-shrink:0; opacity:.7; }
    .nav-item:hover:not(.disabled) { background:var(--bg3); color:var(--text-primary); }
    .nav-item.active { background:rgba(232,197,71,0.08); color:var(--accent); border-color:rgba(232,197,71,0.2); }
    .nav-item.active svg { opacity:1; }
    .nav-item.disabled { opacity:.4; cursor:not-allowed; }
    .badge { margin-left:auto; font-size:10px; font-weight:500; padding:2px 6px; border-radius:10px; }
    .badge.new  { background:rgba(79,209,165,0.15); color:var(--notarial); }
    .badge.warn { background:rgba(248,113,113,0.2); color:var(--gap); }
    .badge.soon { background:rgba(255,255,255,0.06); color:var(--text-muted); }
    .sidebar-footer {
      margin-top:auto; padding:12px 10px; display:flex; align-items:center;
      gap:8px; font-size:11px; color:var(--text-muted);
    }
    .data-live-dot { width:6px; height:6px; border-radius:50%; background:var(--notarial); animation:pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  `]
})
export class SidebarComponent {
  alertas = inject(AlertasService);
}
