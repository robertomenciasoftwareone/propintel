import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface Msg { role: 'user' | 'assistant'; content: string; timestamp: Date; loading?: boolean; }

@Component({
  selector: 'app-chat-flotante',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, FormsModule],
  template: `
    <!-- Botón flotante -->
    <button class="fab" (click)="toggle()" [class.fab-open]="abierto()" aria-label="Asistente IA">
      <span class="fab-icon" *ngIf="!abierto()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span class="fab-badge" *ngIf="mensajes().length > 0">{{ mensajes().length }}</span>
      </span>
      <span class="fab-icon" *ngIf="abierto()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </span>
    </button>

    <!-- Panel del chat -->
    <div class="chat-panel" [class.panel-open]="abierto()">
      <!-- Header -->
      <div class="panel-header">
        <div class="header-left">
          <div class="ai-dot"></div>
          <div>
            <div class="panel-title">UrbIA</div>
            <div class="panel-sub">Asistente inmobiliario · en línea</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="hdr-btn" (click)="limpiar()" title="Nueva conversación">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9M3 3v6h6"/></svg>
          </button>
          <button class="hdr-btn" (click)="irAsistente()" title="Abrir en pantalla completa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          </button>
        </div>
      </div>

      <!-- Mensajes -->
      <div class="msgs-wrap" #scrollEl>
        <!-- Bienvenida -->
        <div class="welcome" *ngIf="mensajes().length === 0">
          <div class="welcome-emoji">🏠</div>
          <p class="welcome-title">Hola, soy UrbIA</p>
          <p class="welcome-sub">Pregúntame sobre precios, hipotecas, barrios o inversión.</p>
          <div class="sugs-grid">
            <button class="sug" *ngFor="let s of sugerencias" (click)="enviarSug(s.t)">
              <span>{{ s.i }}</span> {{ s.t }}
            </button>
          </div>
        </div>

        <!-- Mensajes -->
        <div *ngFor="let m of mensajes()" class="msg-row" [class.row-user]="m.role==='user'" [class.row-ai]="m.role==='assistant'">
          <div class="avatar-sm" *ngIf="m.role==='assistant'">🤖</div>
          <div class="bubble" [class.bubble-user]="m.role==='user'" [class.bubble-ai]="m.role==='assistant'">
            <div *ngIf="!m.loading" class="bubble-text" [innerHTML]="fmt(m.content)"></div>
            <div *ngIf="m.loading" class="dots"><span></span><span></span><span></span></div>
            <div class="bubble-time">{{ m.timestamp | date:'HH:mm' }}</div>
          </div>
        </div>

        <!-- Sugerencias contextuales -->
        <div class="ctx-wrap" *ngIf="mensajes().length > 0 && !cargando()">
          <button class="ctx-sug" *ngFor="let s of ctxSugs()" (click)="enviarSug(s)">{{ s }}</button>
        </div>
      </div>

      <!-- Input -->
      <div class="input-area">
        <textarea #inputEl
          [(ngModel)]="texto"
          (keydown.enter)="onEnter($event)"
          [disabled]="cargando()"
          placeholder="Pregunta algo..."
          rows="1"
          class="inp">
        </textarea>
        <button class="send" [disabled]="!texto.trim() || cargando()" (click)="enviar()">
          <svg *ngIf="!cargando()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          <svg *ngIf="cargando()" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { position: fixed; bottom: 28px; right: 28px; z-index: 1000; font-family: 'Plus Jakarta Sans', sans-serif; }

    /* FAB */
    .fab {
      position: absolute; bottom: 0; right: 0;
      width: 52px; height: 52px; border-radius: 50%;
      background: linear-gradient(135deg, #0052FF, #7C3AED);
      border: none; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(0,82,255,.35);
      transition: all .3s cubic-bezier(.4,0,.2,1);
    }
    .fab:hover { transform: scale(1.08); box-shadow: 0 12px 32px rgba(0,82,255,.45); }
    .fab-open { background: #64748B; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
    .fab-icon { position: relative; display: flex; align-items: center; justify-content: center; }
    .fab-badge {
      position: absolute; top: -8px; right: -8px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #F59E0B; color: #fff; font-size: 9px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    /* Panel */
    .chat-panel {
      position: absolute; bottom: 64px; right: 0;
      width: 360px; height: 520px;
      background: #fff; border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0,0,0,.15), 0 8px 24px rgba(0,82,255,.1);
      border: 1px solid rgba(0,82,255,.08);
      display: flex; flex-direction: column; overflow: hidden;
      transform: scale(.92) translateY(12px);
      opacity: 0; pointer-events: none;
      transition: all .25s cubic-bezier(.4,0,.2,1);
      transform-origin: bottom right;
    }
    .panel-open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

    /* Header */
    .panel-header {
      padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #0052FF 0%, #7C3AED 100%);
      flex-shrink: 0;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .ai-dot {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center;
      font-size: 18px; position: relative;
    }
    .ai-dot::after {
      content: '🤖'; font-size: 18px;
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    }
    .panel-title { font-size: 14px; font-weight: 700; color: #fff; }
    .panel-sub { font-size: 10px; color: rgba(255,255,255,.7); margin-top: 1px; }
    .header-actions { display: flex; gap: 6px; }
    .hdr-btn {
      width: 28px; height: 28px; border-radius: 8px; border: none;
      background: rgba(255,255,255,.15); color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s;
    }
    .hdr-btn:hover { background: rgba(255,255,255,.25); }

    /* Mensajes */
    .msgs-wrap { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }

    /* Welcome */
    .welcome { text-align: center; padding: 16px 8px; }
    .welcome-emoji { font-size: 36px; margin-bottom: 8px; }
    .welcome-title { font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
    .welcome-sub { font-size: 12px; color: #64748B; margin: 0 0 16px; line-height: 1.5; }
    .sugs-grid { display: flex; flex-direction: column; gap: 6px; text-align: left; }
    .sug {
      display: flex; gap: 8px; align-items: center;
      padding: 9px 12px; border-radius: 12px;
      border: 1px solid rgba(0,82,255,.1); background: #F8FAFF;
      color: #374151; font-size: 11.5px; cursor: pointer;
      transition: all .2s; font-family: inherit; text-align: left;
    }
    .sug:hover { border-color: #0052FF; background: #EEF4FF; color: #0052FF; }

    /* Bubbles */
    .msg-row { display: flex; gap: 8px; align-items: flex-end; }
    .row-user { flex-direction: row-reverse; }
    .avatar-sm { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg,#0052FF,#7C3AED); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
    .bubble { max-width: 78%; padding: 10px 13px; border-radius: 16px; }
    .bubble-user { background: #0052FF; color: #fff; border-bottom-right-radius: 4px; }
    .bubble-ai { background: #F8FAFC; color: #0F172A; border: 1px solid rgba(0,82,255,.08); border-bottom-left-radius: 4px; }
    .bubble-text { font-size: 12.5px; line-height: 1.65; }
    .bubble-text ::ng-deep strong { font-weight: 700; }
    .bubble-text ::ng-deep ul { margin: 6px 0; padding-left: 16px; }
    .bubble-text ::ng-deep li { margin-bottom: 3px; }
    .bubble-time { font-size: 9px; opacity: .45; margin-top: 5px; text-align: right; }

    /* Typing */
    .dots { display: flex; gap: 4px; align-items: center; padding: 2px 0; }
    .dots span { width: 6px; height: 6px; border-radius: 50%; background: #94A3B8; animation: bop 1.2s infinite; }
    .dots span:nth-child(2) { animation-delay: .2s; }
    .dots span:nth-child(3) { animation-delay: .4s; }
    @keyframes bop { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

    /* Context sugs */
    .ctx-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .ctx-sug {
      padding: 4px 10px; border-radius: 20px; font-size: 10.5px; font-weight: 500;
      border: 1px solid rgba(0,82,255,.15); background: transparent; color: #0052FF;
      cursor: pointer; font-family: inherit; transition: all .2s;
    }
    .ctx-sug:hover { background: #EEF4FF; }

    /* Input */
    .input-area {
      padding: 10px 12px; border-top: 1px solid rgba(0,82,255,.06);
      background: #FAFBFF; display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0;
    }
    .inp {
      flex: 1; border: 1px solid rgba(0,82,255,.12); border-radius: 12px;
      padding: 9px 12px; font-family: inherit; font-size: 12.5px; color: #0F172A;
      resize: none; outline: none; background: #fff; max-height: 90px; overflow-y: auto;
      transition: border-color .2s;
    }
    .inp:focus { border-color: #0052FF; box-shadow: 0 0 0 3px rgba(0,82,255,.07); }
    .inp:disabled { opacity: .6; }
    .send {
      width: 38px; height: 38px; border-radius: 10px;
      background: #0052FF; border: none; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: all .2s;
    }
    .send:hover:not(:disabled) { background: #0041CC; }
    .send:disabled { opacity: .45; cursor: not-allowed; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ChatFlotanteComponent implements AfterViewChecked {
  @ViewChild('scrollEl') private scrollEl!: ElementRef;

  private http = inject(HttpClient);
  private router = inject(Router);

  abierto = signal(false);
  mensajes = signal<Msg[]>([]);
  cargando = signal(false);
  texto = '';
  private _prevCount = 0;

  sugerencias = [
    { i: '💰', t: '¿Cuál es el precio medio en Madrid?' },
    { i: '🏘️', t: '¿Qué barrios son buena inversión?' },
    { i: '🏦', t: '¿Cuánto pago de hipoteca por 200.000€?' },
  ];

  ngAfterViewChecked() {
    if (this.mensajes().length !== this._prevCount) {
      this._prevCount = this.mensajes().length;
      try { const el = this.scrollEl?.nativeElement; if (el) el.scrollTop = el.scrollHeight; } catch { /**/ }
    }
  }

  toggle() { this.abierto.update(v => !v); }
  limpiar() { this.mensajes.set([]); this._prevCount = 0; }
  irAsistente() { this.abierto.set(false); this.router.navigate(['/asistente']); }

  ctxSugs() {
    const last = this.mensajes().slice(-1)[0];
    if (!last) return [];
    const t = last.content.toLowerCase();
    if (t.includes('precio') || t.includes('m²')) return ['¿Y en otros distritos?', '¿Ha bajado este año?'];
    if (t.includes('hipoteca') || t.includes('cuota')) return ['¿Fija o variable?', '¿Cuánto necesito de entrada?'];
    if (t.includes('barrio') || t.includes('zona')) return ['¿Cómo es la seguridad?', '¿Hay buenas escuelas?'];
    return ['Cuéntame más', '¿Algún ejemplo?'];
  }

  onEnter(e: Event) {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) { e.preventDefault(); this.enviar(); }
  }

  enviarSug(t: string) { this.texto = t; this.enviar(); }

  async enviar() {
    const t = this.texto.trim();
    if (!t || this.cargando()) return;
    this.texto = '';
    this.mensajes.update(m => [...m, { role: 'user', content: t, timestamp: new Date() }]);
    this.mensajes.update(m => [...m, { role: 'assistant', content: '', timestamp: new Date(), loading: true }]);
    this.cargando.set(true);
    try {
      const r = await this.callGemini(t);
      this.mensajes.update(msgs => {
        const c = [...msgs];
        for (let i = c.length - 1; i >= 0; i--) { if ((c[i] as any).loading) { c[i] = { role: 'assistant', content: r, timestamp: new Date() }; break; } }
        return c;
      });
    } catch {
      this.mensajes.update(msgs => {
        const c = [...msgs];
        for (let i = c.length - 1; i >= 0; i--) { if ((c[i] as any).loading) { c[i] = { role: 'assistant', content: 'No pude conectar con el servicio de IA. Inténtalo de nuevo.', timestamp: new Date() }; break; } }
        return c;
      });
    } finally { this.cargando.set(false); }
  }

  private async callGemini(pregunta: string): Promise<string> {
    const sys = `Eres UrbIA, asistente experto en el mercado inmobiliario español. Responde en español, de forma concisa. Usa **negrita** y listas con - para legibilidad. Si no tienes datos exactos, da estimaciones indicándolo.`;
    const prev = this.mensajes().filter(m => !m.loading && m.content).slice(-6);
    const contents = [
      { role: 'user', parts: [{ text: sys }] },
      { role: 'model', parts: [{ text: 'Entendido. Soy UrbIA.' }] },
      ...prev.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: pregunta }] },
    ];
    const res: any = await this.http.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${environment.geminiApiKey}`,
      { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } } }
    ).toPromise();
    return res?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sin respuesta.';
  }

  fmt(t: string): string {
    return t
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }
}
