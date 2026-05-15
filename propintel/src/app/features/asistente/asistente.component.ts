import {
  Component, inject, signal, computed, ElementRef,
  ViewChild, AfterViewChecked, NgZone
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface PropCard {
  id: number;
  titulo: string | null;
  precioTotal: number;
  precioM2: number | null;
  superficieM2: number | null;
  habitaciones: number | null;
  distrito: string | null;
  url: string;
  fuente: string;
  fotoPrincipal: string | null;
  fotoBase64?: string | null;
  fotoLoading: boolean;
}

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
  propiedades?: PropCard[];
  totalResultados?: number;
  tipo?: 'busqueda' | 'chat' | 'error';
}

@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, DecimalPipe, FormsModule],
  template: `
<div class="asis-shell">

  <!-- ── SIDEBAR ── -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-orb">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="logo-name">UrbIA</span>
      <span class="logo-badge">IA</span>
    </div>

    <div class="sidebar-section">
      <div class="section-label">Explorar</div>
      <div class="nav-items">
        <button class="nav-item" *ngFor="let c of capacidades" (click)="enviarSugerencia(c.ejemplo)">
          <span class="ni-icon">{{ c.icon }}</span>
          <span class="ni-text">{{ c.titulo }}</span>
        </button>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="section-label">Preguntas frecuentes</div>
      <div class="pop-list">
        <button class="pop-btn" *ngFor="let p of populares" (click)="enviarSugerencia(p)">
          {{ p }}
        </button>
      </div>
    </div>

    <div class="sidebar-footer">
      <a routerLink="/dashboard" class="nav-back">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Dashboard
      </a>
      <div class="disclaimer">Análisis orientativos. No sustituyen asesoramiento legal o financiero.</div>
    </div>
  </aside>

  <!-- ── CHAT MAIN ── -->
  <div class="chat-wrap">

    <!-- Top bar -->
    <div class="chat-topbar">
      <div class="topbar-left">
        <div class="ai-orb">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="online-pulse"></div>
        </div>
        <div>
          <div class="topbar-name">UrbIA Copilot</div>
          <div class="topbar-status">
            <div class="status-dot"></div>
            <span>Online · Gemini 2.0 Flash + datos notariales en tiempo real</span>
          </div>
        </div>
      </div>
      <button class="topbar-btn" (click)="limpiarChat()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9M3 3v6h6"/></svg>
        Nueva sesión
      </button>
    </div>

    <!-- Messages -->
    <div class="msgs-scroll" #scrollRef>

      <!-- WELCOME STATE -->
      <div class="welcome" *ngIf="mensajes().length === 0">
        <div class="welcome-hero">
          <div class="welcome-orb">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 class="welcome-title">Hola, soy UrbIA</h2>
          <p class="welcome-sub">Tu copiloto inmobiliario. Busco pisos reales, analizo precios notariales, calculo hipotecas y te doy el veredicto de compra — todo desde el chat.</p>
        </div>

        <div class="welcome-cats">
          <button class="wcat" *ngFor="let cat of categorias" (click)="enviarSugerencia(cat.ejemplo)">
            <div class="wcat-icon">{{ cat.icon }}</div>
            <div class="wcat-title">{{ cat.titulo }}</div>
            <div class="wcat-sub">{{ cat.sub }}</div>
            <div class="wcat-arrow">→</div>
          </button>
        </div>

        <div class="welcome-example">
          <div class="ex-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            Prueba a preguntar
          </div>
          <div class="ex-chips">
            <button class="ex-chip" *ngFor="let p of populares.slice(0,3)" (click)="enviarSugerencia(p)">{{ p }}</button>
          </div>
        </div>
      </div>

      <!-- MESSAGES LIST -->
      <div class="msg-group" *ngFor="let m of mensajes()">

        <!-- USER bubble -->
        <div class="msg-row row-user" *ngIf="m.role === 'user'">
          <div class="bubble bubble-user">
            <div class="bubble-text">{{ m.content }}</div>
            <div class="bubble-time">{{ m.timestamp | date:'HH:mm' }}</div>
          </div>
          <div class="avatar avatar-user">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </div>
        </div>

        <!-- ASSISTANT bubble -->
        <div class="msg-row row-ai" *ngIf="m.role === 'assistant'">
          <div class="avatar avatar-ai">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

          <div class="ai-content">
            <!-- Loading dots -->
            <div class="bubble bubble-ai" *ngIf="m.loading">
              <div class="typing"><span></span><span></span><span></span></div>
            </div>

            <!-- Text response -->
            <div class="bubble bubble-ai" *ngIf="!m.loading">
              <div class="bubble-text" [innerHTML]="fmt(m.content)"></div>
              <div class="bubble-time">{{ m.timestamp | date:'HH:mm' }}</div>
            </div>

            <!-- Property cards -->
            <div class="prop-cards" *ngIf="!m.loading && m.propiedades && m.propiedades.length > 0">
              <div class="props-header">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
                {{ m.totalResultados }} resultado{{ m.totalResultados !== 1 ? 's' : '' }} encontrado{{ m.totalResultados !== 1 ? 's' : '' }}
                <span class="props-hint" *ngIf="m.totalResultados && m.totalResultados > m.propiedades.length">· mostrando {{ m.propiedades.length }}</span>
              </div>
              <div class="cards-scroll">
                <div class="prop-card" *ngFor="let p of m.propiedades">
                  <!-- Photo -->
                  <div class="card-photo">
                    <div class="photo-skeleton" *ngIf="p.fotoLoading && !p.fotoBase64"></div>
                    <img *ngIf="p.fotoBase64"
                      [src]="'data:image/jpeg;base64,' + p.fotoBase64"
                      [alt]="p.titulo || 'Propiedad'"
                      class="photo-img"
                      loading="lazy">
                    <div class="photo-placeholder" *ngIf="!p.fotoLoading && !p.fotoBase64">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".3"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
                    </div>
                    <div class="card-fuente-badge">{{ p.fuente }}</div>
                  </div>
                  <!-- Info -->
                  <div class="card-info">
                    <div class="card-titulo">{{ p.titulo || 'Piso en ' + (p.distrito || 'Madrid') }}</div>
                    <div class="card-precio">
                      {{ p.precioTotal | number:'1.0-0':'es' }} €
                      <span class="card-m2" *ngIf="p.precioM2">· {{ p.precioM2 | number:'1.0-0':'es' }} €/m²</span>
                    </div>
                    <div class="card-meta">
                      <span class="card-tag" *ngIf="p.habitaciones">🛏 {{ p.habitaciones }}h</span>
                      <span class="card-tag" *ngIf="p.superficieM2">📐 {{ p.superficieM2 | number:'1.0-0':'es' }} m²</span>
                      <span class="card-tag distrito" *ngIf="p.distrito">📍 {{ p.distrito }}</span>
                    </div>
                    <div class="card-actions">
                      <a [routerLink]="['/ficha', p.id]" class="card-btn card-btn-primary">Ver ficha</a>
                      <a [href]="p.url" target="_blank" rel="noopener" class="card-btn card-btn-ghost">Portal ↗</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div><!-- /msgs-scroll -->

    <!-- Context suggestions -->
    <div class="ctx-bar" *ngIf="mensajes().length > 0 && !cargando()">
      <button class="ctx-chip" *ngFor="let s of ctxSugs()" (click)="enviarSugerencia(s)">{{ s }}</button>
    </div>

    <!-- Input bar -->
    <div class="input-bar">
      <div class="input-inner">
        <textarea #inputRef
          class="chat-input"
          [(ngModel)]="preguntaActual"
          (keydown.enter)="onEnter($event)"
          placeholder="Pregunta sobre precios, busca pisos, calcula hipoteca..."
          rows="1"
          [disabled]="cargando()">
        </textarea>
        <button class="send-btn" [disabled]="!preguntaActual.trim() || cargando()" (click)="enviar()">
          <svg *ngIf="!cargando()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          <svg *ngIf="cargando()" class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        </button>
      </div>
      <div class="input-hint">Enter para enviar · Shift+Enter nueva línea · Powered by Gemini 2.0</div>
    </div>

  </div><!-- /chat-wrap -->
</div>
  `,
  styles: [`
    /* ─── SHELL ─── */
    :host { display:flex; height:100%; overflow:hidden; }
    .asis-shell {
      display:grid; grid-template-columns:260px 1fr;
      width:100%; height:100%; overflow:hidden;
      background:var(--bg);
    }

    /* ─── SIDEBAR ─── */
    .sidebar {
      display:flex; flex-direction:column; gap:0;
      border-right:1px solid var(--border);
      background:var(--bg2); overflow-y:auto;
      padding:0; height:100%;
    }
    .sidebar-logo {
      display:flex; align-items:center; gap:10px;
      padding:20px 18px 16px; border-bottom:1px solid var(--border);
      flex-shrink:0;
    }
    .logo-orb {
      width:32px; height:32px; border-radius:10px;
      background:rgba(232,197,71,0.12); border:1px solid rgba(232,197,71,0.25);
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .logo-name { font-family:'Bebas Neue',sans-serif; font-size:20px; letter-spacing:1.5px; color:var(--text-primary); }
    .logo-badge {
      font-size:9px; font-weight:700; letter-spacing:1px;
      background:rgba(232,197,71,0.2); color:var(--accent);
      border:1px solid rgba(232,197,71,0.3); padding:2px 6px; border-radius:6px;
    }

    .sidebar-section { padding:16px 14px 8px; display:flex; flex-direction:column; gap:8px; }
    .section-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.1em; color:var(--text-muted); padding:0 4px; }

    .nav-items { display:flex; flex-direction:column; gap:2px; }
    .nav-item {
      display:flex; align-items:center; gap:10px; padding:9px 10px;
      border-radius:8px; background:none; border:none; cursor:pointer;
      text-align:left; transition:background .15s; font-family:inherit; width:100%;
    }
    .nav-item:hover { background:rgba(232,197,71,0.06); }
    .ni-icon { font-size:16px; flex-shrink:0; }
    .ni-text { font-size:12.5px; color:var(--text-secondary); }

    .pop-list { display:flex; flex-direction:column; gap:4px; }
    .pop-btn {
      text-align:left; padding:8px 10px; border-radius:8px;
      border:1px solid var(--border); background:var(--bg3);
      font-size:11px; color:var(--text-muted); cursor:pointer; font-family:inherit;
      transition:all .15s; line-height:1.4;
    }
    .pop-btn:hover { border-color:var(--border-bright); color:var(--text-secondary); }

    .sidebar-footer {
      margin-top:auto; padding:14px 14px 18px;
      border-top:1px solid var(--border); display:flex; flex-direction:column; gap:10px;
    }
    .nav-back {
      display:flex; align-items:center; gap:7px; font-size:12px;
      color:var(--text-muted); text-decoration:none; padding:7px 10px;
      border-radius:8px; transition:all .15s;
    }
    .nav-back:hover { background:rgba(255,255,255,0.04); color:var(--text-secondary); }
    .disclaimer { font-size:10px; color:var(--text-muted); line-height:1.5; padding:0 4px; }

    /* ─── CHAT WRAP ─── */
    .chat-wrap { display:flex; flex-direction:column; overflow:hidden; height:100%; background:var(--bg); }

    /* Top bar */
    .chat-topbar {
      display:flex; justify-content:space-between; align-items:center;
      padding:14px 24px; border-bottom:1px solid var(--border);
      background:var(--bg2); flex-shrink:0;
    }
    .topbar-left { display:flex; align-items:center; gap:12px; }
    .ai-orb {
      width:38px; height:38px; border-radius:12px; position:relative;
      background:rgba(232,197,71,0.1); border:1px solid rgba(232,197,71,0.2);
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .online-pulse {
      position:absolute; bottom:2px; right:2px; width:9px; height:9px;
      border-radius:50%; background:#4fd1a5; border:2px solid var(--bg2);
      animation:pulse 2s ease infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
    .topbar-name { font-size:14px; font-weight:600; color:var(--text-primary); }
    .topbar-status { display:flex; align-items:center; gap:6px; font-size:10.5px; color:var(--text-muted); margin-top:2px; }
    .status-dot { width:6px; height:6px; border-radius:50%; background:#4fd1a5; flex-shrink:0; }
    .topbar-btn {
      display:flex; align-items:center; gap:6px; font-size:12px;
      color:var(--text-secondary); background:var(--bg3);
      border:1px solid var(--border); border-radius:8px;
      padding:7px 13px; cursor:pointer; font-family:inherit; transition:all .15s;
    }
    .topbar-btn:hover { border-color:var(--border-bright); color:var(--text-primary); }

    /* Messages scroll */
    .msgs-scroll { flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:6px; }

    /* WELCOME */
    .welcome { display:flex; flex-direction:column; align-items:center; gap:32px; padding:32px 0; animation:fadeUp .5s ease; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
    .welcome-hero { display:flex; flex-direction:column; align-items:center; gap:14px; text-align:center; }
    .welcome-orb {
      width:80px; height:80px; border-radius:24px;
      background:rgba(232,197,71,0.1); border:1px solid rgba(232,197,71,0.2);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 0 40px rgba(232,197,71,0.08);
    }
    .welcome-title { font-family:'Bebas Neue',sans-serif; font-size:42px; letter-spacing:2px; color:var(--text-primary); }
    .welcome-sub { font-size:14px; color:var(--text-secondary); line-height:1.7; max-width:520px; font-weight:300; }

    .welcome-cats { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; width:100%; max-width:600px; }
    .wcat {
      display:flex; flex-direction:column; align-items:flex-start; gap:6px;
      padding:18px 18px 14px; border-radius:14px; border:1px solid var(--border);
      background:var(--bg2); cursor:pointer; font-family:inherit; text-align:left;
      transition:all .2s; position:relative; overflow:hidden;
    }
    .wcat::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(232,197,71,0.04),transparent); opacity:0; transition:opacity .2s; }
    .wcat:hover { border-color:rgba(232,197,71,0.4); transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.15); }
    .wcat:hover::before { opacity:1; }
    .wcat-icon { font-size:24px; }
    .wcat-title { font-size:13.5px; font-weight:600; color:var(--text-primary); }
    .wcat-sub { font-size:11.5px; color:var(--text-muted); line-height:1.4; font-weight:300; }
    .wcat-arrow { position:absolute; bottom:14px; right:16px; font-size:14px; color:var(--text-muted); transition:transform .2s; }
    .wcat:hover .wcat-arrow { transform:translateX(3px); color:var(--accent); }

    .welcome-example { display:flex; flex-direction:column; align-items:center; gap:10px; }
    .ex-label { font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:6px; }
    .ex-chips { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
    .ex-chip {
      padding:7px 14px; border-radius:20px; border:1px solid var(--border);
      background:var(--bg2); font-size:12px; color:var(--text-secondary);
      cursor:pointer; font-family:inherit; transition:all .15s;
    }
    .ex-chip:hover { border-color:rgba(232,197,71,0.4); color:var(--accent); }

    /* MESSAGES */
    .msg-group { display:flex; flex-direction:column; gap:4px; animation:msgIn .25s ease; }
    @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    .msg-row { display:flex; gap:10px; align-items:flex-end; }
    .row-user { flex-direction:row-reverse; justify-content:flex-start; }
    .row-ai { align-items:flex-start; }

    .avatar {
      width:28px; height:28px; border-radius:50%; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
    }
    .avatar-ai { background:rgba(232,197,71,0.1); border:1px solid rgba(232,197,71,0.2); }
    .avatar-user { background:var(--bg3); border:1px solid var(--border); color:var(--text-secondary); }

    .bubble { max-width:72%; padding:12px 16px; border-radius:16px; word-break:break-word; }
    .bubble-user {
      background:rgba(232,197,71,0.12); border:1px solid rgba(232,197,71,0.2);
      color:var(--text-primary); border-bottom-right-radius:4px;
    }
    .bubble-ai {
      background:var(--bg2); border:1px solid var(--border);
      color:var(--text-primary); border-bottom-left-radius:4px;
    }
    .bubble-text { font-size:13.5px; line-height:1.75; }
    .bubble-text ::ng-deep strong { font-weight:600; color:var(--accent); }
    .bubble-text ::ng-deep ul { margin:8px 0; padding-left:18px; }
    .bubble-text ::ng-deep li { margin-bottom:5px; }
    .bubble-text ::ng-deep h3 { font-size:13.5px; font-weight:600; margin:10px 0 4px; }
    .bubble-time { font-size:10px; color:var(--text-muted); margin-top:8px; text-align:right; }

    .typing { display:flex; gap:5px; align-items:center; padding:3px 0; }
    .typing span { width:7px; height:7px; border-radius:50%; background:var(--text-muted); animation:bop 1.2s infinite; }
    .typing span:nth-child(2) { animation-delay:.2s; }
    .typing span:nth-child(3) { animation-delay:.4s; }
    @keyframes bop { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-7px)} }

    /* AI content wrapper (text + cards) */
    .ai-content { display:flex; flex-direction:column; gap:10px; max-width:calc(100% - 40px); }

    /* PROPERTY CARDS */
    .prop-cards { display:flex; flex-direction:column; gap:10px; }
    .props-header {
      display:flex; align-items:center; gap:7px;
      font-size:11.5px; color:var(--text-secondary); font-weight:500;
    }
    .props-hint { color:var(--text-muted); }
    .cards-scroll { display:flex; gap:12px; overflow-x:auto; padding-bottom:4px; }
    .cards-scroll::-webkit-scrollbar { height:4px; }
    .cards-scroll::-webkit-scrollbar-track { background:transparent; }
    .cards-scroll::-webkit-scrollbar-thumb { background:var(--border-bright); border-radius:2px; }

    .prop-card {
      flex-shrink:0; width:220px; border-radius:14px;
      border:1px solid var(--border); background:var(--bg2);
      overflow:hidden; transition:all .2s;
    }
    .prop-card:hover { border-color:rgba(232,197,71,0.35); transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,0,0,0.2); }

    .card-photo { width:100%; height:130px; position:relative; background:var(--bg3); overflow:hidden; }
    .photo-skeleton { width:100%; height:100%; background:linear-gradient(90deg,var(--bg3) 25%,rgba(255,255,255,.05) 50%,var(--bg3) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .photo-img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .3s; }
    .prop-card:hover .photo-img { transform:scale(1.04); }
    .photo-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--bg3); }
    .card-fuente-badge {
      position:absolute; top:8px; left:8px; font-size:9px; font-weight:600;
      letter-spacing:.6px; text-transform:uppercase;
      background:rgba(0,0,0,0.65); color:rgba(255,255,255,0.85);
      padding:3px 7px; border-radius:6px; backdrop-filter:blur(4px);
    }
    .card-info { padding:12px 14px; display:flex; flex-direction:column; gap:7px; }
    .card-titulo { font-size:12px; font-weight:500; color:var(--text-primary); line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .card-precio { font-size:15px; font-weight:700; color:var(--accent); font-family:'DM Mono',monospace; }
    .card-m2 { font-size:11px; color:var(--text-muted); font-family:'DM Mono',monospace; }
    .card-meta { display:flex; flex-wrap:wrap; gap:5px; }
    .card-tag { font-size:10.5px; background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:2px 7px; color:var(--text-muted); }
    .card-tag.distrito { color:var(--asking); border-color:rgba(232,197,71,0.2); background:rgba(232,197,71,0.06); }
    .card-actions { display:flex; gap:6px; margin-top:2px; }
    .card-btn {
      flex:1; text-align:center; padding:7px 0; border-radius:8px;
      font-size:11.5px; font-weight:500; text-decoration:none; cursor:pointer;
      border:none; font-family:inherit; transition:all .15s;
    }
    .card-btn-primary { background:rgba(232,197,71,0.15); color:var(--accent); border:1px solid rgba(232,197,71,0.25); }
    .card-btn-primary:hover { background:rgba(232,197,71,0.25); }
    .card-btn-ghost { background:var(--bg3); color:var(--text-secondary); border:1px solid var(--border); }
    .card-btn-ghost:hover { border-color:var(--border-bright); color:var(--text-primary); }

    /* Context chips */
    .ctx-bar { padding:10px 24px; display:flex; gap:7px; flex-wrap:wrap; border-top:1px solid var(--border); background:var(--bg2); flex-shrink:0; }
    .ctx-chip {
      padding:5px 14px; border-radius:20px; font-size:11.5px;
      border:1px solid var(--border); background:var(--bg3); color:var(--text-secondary);
      cursor:pointer; font-family:inherit; transition:all .15s;
    }
    .ctx-chip:hover { border-color:rgba(232,197,71,0.4); color:var(--accent); }

    /* Input bar */
    .input-bar { padding:16px 20px; border-top:1px solid var(--border); background:var(--bg2); flex-shrink:0; }
    .input-inner { display:flex; gap:10px; align-items:flex-end; }
    .chat-input {
      flex:1; background:var(--bg3); border:1.5px solid var(--border);
      color:var(--text-primary); padding:13px 16px; border-radius:14px;
      font-family:inherit; font-size:14px; resize:none; outline:none;
      max-height:130px; overflow-y:auto; transition:border-color .2s;
      line-height:1.5;
    }
    .chat-input::placeholder { color:var(--text-muted); }
    .chat-input:focus { border-color:rgba(232,197,71,0.5); }
    .chat-input:disabled { opacity:.55; cursor:not-allowed; }
    .send-btn {
      width:48px; height:48px; border-radius:14px; flex-shrink:0;
      background:var(--accent); border:none; color:#0d0f12;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:all .2s;
      box-shadow:0 4px 14px rgba(232,197,71,0.3);
    }
    .send-btn:hover:not(:disabled) { transform:scale(1.06); box-shadow:0 6px 18px rgba(232,197,71,0.4); }
    .send-btn:disabled { opacity:.35; cursor:not-allowed; box-shadow:none; }
    .spin { animation:spin 1s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .input-hint { font-size:10.5px; color:var(--text-muted); margin-top:8px; text-align:center; }

    @media(max-width:800px) {
      .asis-shell { grid-template-columns:1fr; }
      .sidebar { display:none; }
      .msgs-scroll { padding:16px; }
    }
  `]
})
export class AsistenteComponent implements AfterViewChecked {
  @ViewChild('scrollRef') private scrollRef!: ElementRef;
  private http  = inject(HttpClient);
  private zone  = inject(NgZone);
  private api   = environment.apiUrl;

  mensajes  = signal<Mensaje[]>([]);
  cargando  = signal(false);
  preguntaActual = '';
  private _lastCount = 0;

  capacidades = [
    { icon: '🔍', titulo: 'Buscar pisos',      ejemplo: '3 habitaciones en Tetuán por menos de 400.000€' },
    { icon: '💰', titulo: 'Precios y mercado',  ejemplo: '¿Cuál es el precio medio por distritos en Madrid?' },
    { icon: '🏦', titulo: 'Hipotecas',          ejemplo: 'Hipoteca de 280.000€ a 30 años, ¿cuánto pago al mes?' },
    { icon: '📈', titulo: 'Inversión y ROI',    ejemplo: '¿En qué zonas de Madrid es más rentable invertir?' },
    { icon: '⚖️', titulo: 'Gastos de compra',   ejemplo: '¿Cuánto me cuesta comprar un piso de 250.000€ en Madrid?' },
    { icon: '🏘️', titulo: 'Comparar barrios',  ejemplo: '¿Cuál es mejor: Chamartín o Salamanca?' },
  ];

  populares = [
    '¿Está bajando el precio de la vivienda en 2026?',
    '¿Cuál es el Euríbor actual y cómo me afecta?',
    '¿Conviene comprar o alquilar en Madrid ahora mismo?',
    '¿Qué es el precio notarial y por qué difiere de Idealista?',
    '¿Cuánto tiempo tarda en subir de valor un piso en Madrid?',
  ];

  categorias = [
    { icon: '🔍', titulo: 'Buscar propiedades', sub: 'Pisos reales con precio, fotos y análisis',    ejemplo: '¿Hay pisos de 3 habitaciones en Carabanchel por menos de 350.000€?' },
    { icon: '💰', titulo: 'Precios y mercado',   sub: 'Asking vs notarial, tendencias por zona',    ejemplo: '¿Cuál es el precio medio en Madrid en 2026?' },
    { icon: '🏦', titulo: 'Hipotecas',           sub: 'Cuotas, TAE, capacidad de endeudamiento',   ejemplo: 'Calcula la hipoteca para un piso de 300.000€ a 25 años' },
    { icon: '📈', titulo: 'Inversión',           sub: 'ROI, rentabilidad, zonas con más potencial', ejemplo: '¿Dónde invertir en pisos en España ahora mismo?' },
  ];

  ngAfterViewChecked(): void {
    if (this.mensajes().length !== this._lastCount) {
      this._lastCount = this.mensajes().length;
      try {
        const el = this.scrollRef?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      } catch { /* */ }
    }
  }

  ctxSugs(): string[] {
    const last = this.mensajes().filter(m => m.role === 'assistant').slice(-1)[0];
    if (!last || last.loading) return [];
    const t = (last.content ?? '').toLowerCase();
    if (t.includes('precio') || t.includes('m²') || t.includes('zona'))
      return ['¿Y en otros distritos?', '¿Ha bajado el precio este año?', '¿Qué zona tiene mejor relación calidad-precio?'];
    if (t.includes('hipoteca') || t.includes('cuota') || t.includes('euríbor'))
      return ['¿Fija o variable?', '¿Cuánto necesito de entrada?', '¿Qué banco da mejores condiciones?'];
    if (last.propiedades?.length)
      return ['Ver los más baratos', '¿Cuál tiene mejor gap?', '¿Hay alguno con parking?'];
    if (t.includes('invert') || t.includes('rentab'))
      return ['¿Cuál es la rentabilidad media?', '¿Alquiler turístico o residencial?'];
    return ['Cuéntame más', '¿Algún ejemplo concreto?', '¿Cómo puedo empezar?'];
  }

  limpiarChat(): void { this.mensajes.set([]); this._lastCount = 0; }

  onEnter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) { e.preventDefault(); this.enviar(); }
  }

  enviarSugerencia(texto: string): void { this.preguntaActual = texto; this.enviar(); }

  async enviar(): Promise<void> {
    const texto = this.preguntaActual.trim();
    if (!texto || this.cargando()) return;
    this.preguntaActual = '';
    this.mensajes.update(m => [...m, { role: 'user', content: texto, timestamp: new Date() }]);
    const loadingIdx = this.mensajes().length;
    this.mensajes.update(m => [...m, { role: 'assistant', content: '', timestamp: new Date(), loading: true }]);
    this.cargando.set(true);

    try {
      // 1. Call property search endpoint
      const searchResp = await this.buscarPropiedades(texto);

      // 2. Call Gemini for conversational response
      const geminiText = await this.llamarGemini(texto, searchResp);

      // Build prop cards
      const propCards: PropCard[] = (searchResp?.muestra ?? []).map((a: any) => ({
        id: a.id,
        titulo: a.titulo,
        precioTotal: a.precioTotal,
        precioM2: a.precioM2,
        superficieM2: a.superficieM2,
        habitaciones: a.habitaciones,
        distrito: a.distrito,
        url: a.url,
        fuente: a.fuente,
        fotoPrincipal: a.fotoPrincipal ?? null,
        fotoBase64: null,
        fotoLoading: !!(a.fotoPrincipal),
      }));

      // Replace loading message
      this.mensajes.update(msgs => msgs.map((m, i) =>
        i === loadingIdx - 1 + 1
          ? {
              role: 'assistant' as const,
              content: geminiText,
              timestamp: new Date(),
              loading: false,
              propiedades: propCards.length > 0 ? propCards : undefined,
              totalResultados: searchResp?.totalResultados ?? 0,
              tipo: propCards.length > 0 ? 'busqueda' as const : 'chat' as const,
            }
          : m
      ));

      // Lazy load photos
      if (propCards.length > 0) {
        this.cargarFotos(loadingIdx, propCards);
      }

    } catch (err) {
      this.mensajes.update(msgs => msgs.map((m, i) =>
        i === loadingIdx
          ? { role: 'assistant' as const, content: 'Lo siento, ha habido un error al procesar tu consulta. Inténtalo de nuevo.', timestamp: new Date(), loading: false, tipo: 'error' as const }
          : m
      ));
    } finally {
      this.cargando.set(false);
    }
  }

  private async buscarPropiedades(pregunta: string): Promise<any | null> {
    try {
      const resp = await firstValueFrom(
        this.http.post<any>(`${this.api}/asistente/preguntar`, { pregunta })
      );
      return resp;
    } catch {
      return null;
    }
  }

  private async llamarGemini(pregunta: string, searchCtx: any | null): Promise<string> {
    const contextoPropiedades = searchCtx?.totalResultados > 0
      ? `\n\nDatos de la búsqueda: He encontrado ${searchCtx.totalResultados} inmuebles. Los más baratos están en torno a ${searchCtx.muestra?.[0]?.precioTotal?.toLocaleString('es-ES')} €.`
      : '';

    const systemPrompt = `Eres UrbIA, el copiloto inmobiliario español de PropIntel. Eres experto en:
- Mercado inmobiliario español: precios asking (Idealista/Fotocasa) vs precios notariales reales
- Hipotecas, Euríbor, tipos de interés, TAE
- Gastos de compraventa: ITP, AJD, notaría, registro, gestión
- Inversión inmobiliaria y rentabilidad
- Comparación de barrios y zonas
Responde siempre en español, de forma concisa y útil. Usa markdown básico (negrita, listas) cuando aporte claridad. Sé directo y evita rodeos.${contextoPropiedades}`;

    try {
      const body = {
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n---\nPregunta del usuario: ' + pregunta }] }
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
      };
      const resp = await firstValueFrom(
        this.http.post<any>(`${this.api}/gemini/generate`, body)
      );
      return resp?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No he podido generar una respuesta. Inténtalo de nuevo.';
    } catch {
      // Fallback: use search response text or generic message
      if (searchCtx?.respuesta) return searchCtx.respuesta;
      return 'No he podido conectar con el servicio de IA en este momento. Por favor, inténtalo de nuevo en unos segundos.';
    }
  }

  private cargarFotos(msgIdx: number, propCards: PropCard[]): void {
    propCards.forEach((card, ci) => {
      if (!card.fotoPrincipal) { card.fotoLoading = false; return; }
      firstValueFrom(
        this.http.get<{ base64: string }>(`${this.api}/anuncios/${card.id}/foto-base64`)
      ).then(resp => {
        this.zone.run(() => {
          this.mensajes.update(msgs => msgs.map((m, mi) => {
            if (mi !== msgIdx) return m;
            const props = (m.propiedades ?? []).map((p, pi) =>
              pi === ci ? { ...p, fotoBase64: resp.base64, fotoLoading: false } : p
            );
            return { ...m, propiedades: props };
          }));
        });
      }).catch(() => {
        this.zone.run(() => {
          this.mensajes.update(msgs => msgs.map((m, mi) => {
            if (mi !== msgIdx) return m;
            const props = (m.propiedades ?? []).map((p, pi) =>
              pi === ci ? { ...p, fotoLoading: false } : p
            );
            return { ...m, propiedades: props };
          }));
        });
      });
    });
  }

  fmt(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`)
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }
}
