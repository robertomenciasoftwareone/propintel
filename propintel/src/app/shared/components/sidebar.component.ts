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

      <!-- AI Assistant CTA -->
      <a class="ai-cta-btn" routerLink="/asistente">
        <div class="ai-cta-icon">🤖</div>
        <div class="ai-cta-text">
          <div class="ai-cta-title">Asistente IA</div>
          <div class="ai-cta-sub">Pregunta lo que quieras</div>
        </div>
        <svg viewBox="0 0 16 16" fill="none" class="ai-cta-arrow"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </a>

      <div class="nav-section-label">Análisis</div>
      <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
        Dashboard
      </a>
      <a class="nav-item" routerLink="/historico" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v4l3 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Histórico de precios
      </a>
      <a class="nav-item" routerLink="/estadisticas" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2 13l3-4 3 2 3-5 3 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Estadísticas INE
      </a>
      <a class="nav-item" routerLink="/barrios" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M1 13L4 7l3 3 3-5 2 2 3-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Ranking barrios
        <span class="badge new">IA</span>
      </a>

      <div class="nav-section-label" style="margin-top:12px">Buscar y comparar</div>
      <a class="nav-item" routerLink="/mapa-resultados" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M8 14s4-3.2 4-7a4 4 0 10-8 0c0 3.8 4 7 4 7z" stroke="currentColor" stroke-width="1.3"/></svg>
        Mapa de pisos
      </a>
      <a class="nav-item" routerLink="/explorador-casas" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2.5 7.5L8 3l5.5 4.5V13a1 1 0 01-1 1h-9a1 1 0 01-1-1V7.5z" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 14v-3h3v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Explorador casas
      </a>
      <a class="nav-item" routerLink="/comparar" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="6" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="4" width="6" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M4 2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Comparar pisos
      </a>
      <a class="nav-item" routerLink="/catastro" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Catastro
      </a>

      <div class="nav-section-label" style="margin-top:12px">Finanzas</div>
      <a class="nav-item" routerLink="/hipotecas" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2 14V8l6-5 6 5v6H2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 14v-4h4v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Hipotecas
      </a>
      <a class="nav-item" routerLink="/seguros" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2l5 2v5c0 3.5-5 6-5 6S3 12.5 3 9V4L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.5 8l2 2 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Seguros hogar
        <span class="badge new">Nuevo</span>
      </a>
      <a class="nav-item" routerLink="/costes-compra" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M8 8v3M6.5 9.5h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Gastos de compra
        <span class="badge new">Nuevo</span>
      </a>
      <a class="nav-item" routerLink="/tasacion" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 5h10M5 3v4M11 3v4M4 8h8v5H4V8z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Valoración AVM
      </a>

      <div class="nav-section-label" style="margin-top:12px">Gestión</div>
      <a class="nav-item" routerLink="/alertas" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 014 4v3l1 2H3l1-2V6a4 4 0 014-4z" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 13a1.5 1.5 0 003 0" stroke="currentColor" stroke-width="1.5"/></svg>
        Alertas precio
        <span class="badge warn" *ngIf="alertas.totalNoLeidos() > 0">
          {{ alertas.totalNoLeidos() }}
        </span>
      </a>
      <a class="nav-item" routerLink="/apis-fuentes" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2 5h12M2 8h12M2 11h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        APIs y fuentes
      </a>
      <a class="nav-item" routerLink="/mapa" routerLinkActive="active">
        <svg viewBox="0 0 16 16" fill="none"><path d="M1 4l5-2 4 2 5-2v10l-5 2-4-2-5 2V4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        Mapa analítico
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
      width: 240px;
      background: #FFFFFF;
      border-right: 1px solid rgba(0, 52, 255, 0.06);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      height: 100%;
      overflow-y: auto;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .logo-img {
      height: 44px;
      width: auto;
      object-fit: contain;
      margin-bottom: 20px;
      padding: 0 4px;
    }
    .nav-section-label {
      font-size: 10px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #94A3B8;
      padding: 10px 12px 4px;
      font-weight: 600;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      border-radius: 10px;
      color: #64748B;
      cursor: pointer;
      font-size: 13.5px;
      font-weight: 500;
      text-decoration: none;
      border: none;
      border-left: 3px solid transparent;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nav-item svg {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      opacity: 0.35;
      transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nav-item:hover:not(.disabled) { background: #F8FAFC; color: #0F172A; }
    .nav-item:hover:not(.disabled) svg { opacity: 1; }
    .nav-item.active {
      background: #EEF4FF;
      color: #0052FF;
      border-left-color: #0052FF;
      font-weight: 600;
    }
    .nav-item.active svg { opacity: 1; color: #0052FF; }
    .nav-item.disabled { opacity: .4; cursor: not-allowed; }
    .badge {
      margin-left: auto;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
    }
    .badge.new  { background: rgba(0, 181, 163, 0.10); color: #00B5A3; }
    .badge.warn { background: rgba(245, 158, 11, 0.10); color: #F59E0B; }
    .badge.soon { background: rgba(148, 163, 184, 0.10); color: #94A3B8; }
    .sidebar-footer {
      margin-top: auto;
      padding: 14px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #94A3B8;
    }
    .data-live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #00B5A3;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    /* AI CTA button */
    .ai-cta-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 12px; margin-bottom: 12px;
      background: linear-gradient(135deg, #EEF4FF, #F0E8FF);
      border: 1px solid rgba(124,58,237,.15);
      text-decoration: none; cursor: pointer;
      transition: all 0.3s; color: inherit;
    }
    .ai-cta-btn:hover { background: linear-gradient(135deg, #DDE8FF, #E4D8FF); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,.15); }
    .ai-cta-icon { font-size: 20px; flex-shrink: 0; }
    .ai-cta-text { flex: 1; }
    .ai-cta-title { font-size: 12px; font-weight: 700; color: #4C1D95; }
    .ai-cta-sub { font-size: 10px; color: #7C3AED; opacity: .8; }
    .ai-cta-arrow { width: 12px; height: 12px; color: #7C3AED; opacity: .6; flex-shrink: 0; }
    .user-section {
      padding: 12px;
      border-top: 1px solid rgba(0, 52, 255, 0.06);
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .user-email {
      font-size: 11px;
      color: #64748B;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .btn-logout {
      background: transparent;
      border: 1px solid rgba(0, 52, 255, 0.08);
      color: #94A3B8;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 11px;
      cursor: pointer;
      text-align: left;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
    }
    .btn-logout:hover { border-color: #F59E0B; color: #F59E0B; }
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
