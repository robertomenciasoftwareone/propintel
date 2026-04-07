import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { AlertasService } from '../../core/services/alertas.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  template: `
    <nav class="sidebar">
      <img src="assets/logo_urbia.png" alt="UrbIA" class="logo-img" />

      <div class="nav-section-label">Análisis</div>
      <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
        Dashboard
      </a>
      <a class="nav-item" routerLink="/historico" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v4l3 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Histórico
      </a>
      <a class="nav-item" routerLink="/mapa" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M1 4l5-2 4 2 5-2v10l-5 2-4-2-5 2V4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 2v10M10 4v10" stroke="currentColor" stroke-width="1.3"/></svg>
        Mapa
      </a>
      <a class="nav-item" routerLink="/explorador-casas" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2.5 7.5L8 3l5.5 4.5V13a1 1 0 01-1 1h-9a1 1 0 01-1-1V7.5z" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 14v-3h3v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Explorador Casas
      </a>

      <div class="nav-section-label" style="margin-top:16px">Plataforma</div>
      <a class="nav-item" routerLink="/apis-fuentes" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2 5h12M2 8h12M2 11h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        APIs y Fuentes
      </a>
      <a class="nav-item" routerLink="/admin-validacion" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 10l2-2 2 1 2-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Admin Validación
      </a>
      <a class="nav-item" routerLink="/tasacion" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 5h10M5 3v4M11 3v4M4 8h8v5H4V8z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Tasación AVM
      </a>

      <div class="nav-section-label" style="margin-top:16px">Negocio</div>
      <a class="nav-item" routerLink="/alertas" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 014 4v3l1 2H3l1-2V6a4 4 0 014-4z" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 13a1.5 1.5 0 003 0" stroke="currentColor" stroke-width="1.5"/></svg>
        Alertas
        <span class="badge warn" *ngIf="alertas.totalNoLeidos() > 0">
          {{ alertas.totalNoLeidos() }}
        </span>
      </a>
      <a class="nav-item" routerLink="/mapa-resultados" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M8 14s4-3.2 4-7a4 4 0 10-8 0c0 3.8 4 7 4 7z" stroke="currentColor" stroke-width="1.3"/></svg>
        Mapa UrbIA
      </a>
      <a class="nav-item" routerLink="/comparar" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="6" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="4" width="6" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M4 2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Comparar pisos
      </a>
      <a class="nav-item" routerLink="/hipotecas" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2 14V8l6-5 6 5v6H2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 14v-4h4v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M8 3V1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Hipotecas
      </a>

      <div class="sidebar-footer">
        <div class="data-live-dot"></div>
        <span>Datos actualizados hoy</span>
      </div>

      <div class="user-section" *ngIf="auth.isAuthenticated()">
        <div class="user-email">{{ auth.currentUser()?.nombre }}</div>
        <button class="btn-logout" (click)="logout()">Cerrar sesión</button>
      </div>
    </nav>
  `,
  styles: [`
    .sidebar {
      width:220px; background:var(--bg2); border-right:1px solid var(--border);
      padding:24px 14px; display:flex; flex-direction:column; gap:2px; height:100%;
    }
    .logo-img { height:44px; width:auto; object-fit:contain; margin-bottom:16px; padding:0 4px; }
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
    .user-section { padding: 10px; border-top: 1px solid var(--border); margin-top: 4px; display: flex; flex-direction: column; gap: 6px; }
    .user-email { font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-logout { background: transparent; border: 1px solid var(--border); color: var(--text-muted); border-radius: 6px; padding: 5px 10px; font-size: 11px; cursor: pointer; text-align: left; transition: all .15s; }
    .btn-logout:hover { border-color: var(--gap); color: var(--gap); }
  `]
})
export class SidebarComponent {
  alertas = inject(AlertasService);
  auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
