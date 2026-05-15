import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Mensaje { role: 'user' | 'assistant'; content: string; timestamp: Date; loading?: boolean; }

@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
<div class="page">

  <!-- Header gradient -->
  <div class="page-header">
    <div class="header-inner">
      <div class="ai-avatar-wrap">
        <div class="ai-avatar">🤖</div>
        <div class="online-dot"></div>
      </div>
      <div>
        <h1 class="page-title">UrbIA · Asistente inmobiliario</h1>
        <p class="page-sub">Powered by Gemini · Experto en mercado español · Responde en segundos</p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn-ghost" (click)="limpiarChat()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9M3 3v6h6"/></svg>
        Nueva conversación
      </button>
      <a routerLink="/dashboard" class="btn-ghost">← Dashboard</a>
    </div>
  </div>

  <div class="chat-layout">

    <!-- Panel izquierdo -->
    <aside class="side-panel">
      <div class="side-section">
        <div class="side-label">Puedo ayudarte con</div>
        <div class="caps-list">
          @for (c of capacidades; track c.titulo) {
            <div class="cap" (click)="enviarSugerencia(c.ejemplo)">
              <div class="cap-icon">{{ c.icon }}</div>
              <div>
                <div class="cap-title">{{ c.titulo }}</div>
                <div class="cap-desc">{{ c.desc }}</div>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="side-section">
        <div class="side-label">Preguntas populares</div>
        <div class="popular-list">
          @for (p of populares; track p) {
            <button class="popular-btn" (click)="enviarSugerencia(p)">{{ p }}</button>
          }
        </div>
      </div>

      <div class="disclaimer">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        Análisis orientativos. No sustituyen asesoramiento legal o financiero.
      </div>
    </aside>

    <!-- Chat principal -->
    <div class="chat-main">

      <!-- Mensajes -->
      <div class="msgs-wrap" #scrollContainer>

        <!-- Bienvenida -->
        @if (mensajes().length === 0) {
          <div class="welcome">
            <div class="welcome-icon">🏠</div>
            <h2 class="welcome-title">Hola, soy UrbIA</h2>
            <p class="welcome-sub">Tu experto personal en el mercado inmobiliario español. Pregúntame sobre precios, hipotecas, inversión o cualquier barrio.</p>
            <div class="cats-grid">
              @for (cat of categorias; track cat.titulo) {
                <div class="cat-card" (click)="enviarSugerencia(cat.ejemplo)">
                  <div class="cat-icon">{{ cat.icon }}</div>
                  <div class="cat-title">{{ cat.titulo }}</div>
                  <div class="cat-sub">{{ cat.sub }}</div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Mensajes -->
        @for (m of mensajes(); track m.timestamp) {
          <div class="msg-row" [class.row-user]="m.role==='user'" [class.row-ai]="m.role==='assistant'">
            @if (m.role === 'assistant') {
              <div class="avatar-ai">🤖</div>
            }
            <div class="bubble" [class.bubble-user]="m.role==='user'" [class.bubble-ai]="m.role==='assistant'">
              @if (!m.loading) {
                <div class="bubble-text" [innerHTML]="fmt(m.content)"></div>
              } @else {
                <div class="typing"><span></span><span></span><span></span></div>
              }
              <div class="bubble-meta">{{ m.timestamp | date:'HH:mm' }}</div>
            </div>
            @if (m.role === 'user') {
              <div class="avatar-user">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
            }
          </div>
        }
      </div>

      <!-- Sugerencias contextuales -->
      @if (mensajes().length > 0 && !cargando()) {
        <div class="ctx-bar">
          @for (s of ctxSugs(); track s) {
            <button class="ctx-chip" (click)="enviarSugerencia(s)">{{ s }}</button>
          }
        </div>
      }

      <!-- Input -->
      <div class="input-area">
        <div class="input-wrap">
          <textarea #inputRef
            [(ngModel)]="preguntaActual"
            (keydown.enter)="onEnter($event)"
            placeholder="Pregunta sobre precios, barrios, hipotecas, inversión..."
            class="chat-input"
            rows="1"
            [disabled]="cargando()">
          </textarea>
          <button class="send-btn" [disabled]="!preguntaActual.trim() || cargando()" (click)="enviar()">
            @if (!cargando()) {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
            } @else {
              <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            }
          </button>
        </div>
        <div class="input-hint">Enter para enviar · Shift+Enter nueva línea</div>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; overflow: hidden; background: #F8FAFC; }

    /* Header */
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 18px 28px; background: linear-gradient(135deg, #0052FF 0%, #7C3AED 100%);
      flex-shrink: 0; gap: 16px; flex-wrap: wrap;
    }
    .header-inner { display: flex; gap: 14px; align-items: center; }
    .ai-avatar-wrap { position: relative; flex-shrink: 0; }
    .ai-avatar {
      width: 46px; height: 46px; border-radius: 50%;
      background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }
    .online-dot {
      position: absolute; bottom: 1px; right: 1px;
      width: 11px; height: 11px; border-radius: 50%;
      background: #10B981; border: 2px solid #fff;
    }
    .page-title { font-size: 18px; font-weight: 800; color: #fff; margin: 0 0 3px; letter-spacing: -.03em; }
    .page-sub { font-size: 11px; color: rgba(255,255,255,.7); margin: 0; }
    .header-actions { display: flex; gap: 8px; }
    .btn-ghost {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: rgba(255,255,255,.85);
      padding: 7px 14px; border: 1px solid rgba(255,255,255,.25);
      border-radius: 10px; background: rgba(255,255,255,.1);
      cursor: pointer; text-decoration: none; transition: all .2s; font-family: inherit;
    }
    .btn-ghost:hover { background: rgba(255,255,255,.2); color: #fff; }

    /* Layout */
    .chat-layout { display: grid; grid-template-columns: 260px 1fr; gap: 0; flex: 1; overflow: hidden; min-height: 0; }

    /* Side panel */
    .side-panel {
      background: #fff; border-right: 1px solid rgba(0,82,255,.07);
      padding: 20px 16px; display: flex; flex-direction: column; gap: 20px;
      overflow-y: auto;
    }
    .side-section { display: flex; flex-direction: column; gap: 10px; }
    .side-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #94A3B8; }

    .caps-list { display: flex; flex-direction: column; gap: 2px; }
    .cap {
      display: flex; gap: 10px; align-items: flex-start;
      padding: 10px; border-radius: 10px; cursor: pointer;
      transition: background .15s;
    }
    .cap:hover { background: #EEF4FF; }
    .cap-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .cap-title { font-size: 12px; font-weight: 600; color: #0F172A; }
    .cap-desc { font-size: 10.5px; color: #64748B; margin-top: 1px; line-height: 1.4; }

    .popular-list { display: flex; flex-direction: column; gap: 4px; }
    .popular-btn {
      text-align: left; padding: 8px 10px; border-radius: 8px;
      border: 1px solid rgba(0,82,255,.08); background: #F8FAFF;
      font-size: 11px; color: #374151; cursor: pointer; font-family: inherit;
      transition: all .15s; line-height: 1.4;
    }
    .popular-btn:hover { border-color: #0052FF; color: #0052FF; background: #EEF4FF; }

    .disclaimer {
      margin-top: auto; font-size: 10px; color: #94A3B8;
      display: flex; gap: 6px; align-items: flex-start; line-height: 1.4; padding: 10px 0;
      border-top: 1px solid rgba(0,82,255,.05);
    }
    .disclaimer svg { flex-shrink: 0; margin-top: 1px; }

    /* Chat main */
    .chat-main { display: flex; flex-direction: column; overflow: hidden; }
    .msgs-wrap { flex: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; gap: 16px; }

    /* Welcome */
    .welcome { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 16px 8px; }
    .welcome-icon { font-size: 52px; margin-bottom: 14px; }
    .welcome-title { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 8px; letter-spacing: -.04em; }
    .welcome-sub { font-size: 13px; color: #64748B; line-height: 1.6; margin: 0 0 28px; max-width: 460px; }

    .cats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; max-width: 520px; text-align: left; }
    .cat-card {
      padding: 16px; border-radius: 14px; border: 1px solid rgba(0,82,255,.09);
      background: #F8FAFF; cursor: pointer; transition: all .2s;
    }
    .cat-card:hover { border-color: #0052FF; background: #EEF4FF; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,82,255,.1); }
    .cat-icon { font-size: 24px; margin-bottom: 8px; }
    .cat-title { font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 3px; }
    .cat-sub { font-size: 11px; color: #64748B; line-height: 1.4; }

    /* Mensajes */
    .msg-row { display: flex; gap: 10px; align-items: flex-end; }
    .row-user { flex-direction: row-reverse; }
    .avatar-ai {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #0052FF, #7C3AED);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .avatar-user {
      width: 30px; height: 30px; border-radius: 50%;
      background: #EEF4FF; display: flex; align-items: center; justify-content: center;
      color: #0052FF; flex-shrink: 0;
    }
    .bubble { max-width: 70%; padding: 13px 17px; border-radius: 18px; }
    .bubble-user { background: #0052FF; color: #fff; border-bottom-right-radius: 4px; }
    .bubble-ai { background: #fff; color: #0F172A; border: 1px solid rgba(0,82,255,.09); border-bottom-left-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
    .bubble-text { font-size: 13.5px; line-height: 1.7; }
    .bubble-text ::ng-deep strong { font-weight: 700; }
    .bubble-text ::ng-deep ul { margin: 8px 0; padding-left: 18px; }
    .bubble-text ::ng-deep li { margin-bottom: 4px; }
    .bubble-meta { font-size: 9.5px; opacity: .4; margin-top: 7px; text-align: right; }

    /* Typing */
    .typing { display: flex; gap: 4px; align-items: center; padding: 3px 0; }
    .typing span { width: 7px; height: 7px; border-radius: 50%; background: #94A3B8; animation: bop 1.2s infinite; }
    .typing span:nth-child(2) { animation-delay: .2s; }
    .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes bop { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

    /* Context chips */
    .ctx-bar { padding: 8px 28px; display: flex; gap: 7px; flex-wrap: wrap; border-top: 1px solid rgba(0,82,255,.05); background: #FAFBFF; }
    .ctx-chip {
      padding: 5px 13px; border-radius: 20px; font-size: 11px; font-weight: 500;
      border: 1px solid rgba(0,82,255,.14); background: #fff; color: #0052FF;
      cursor: pointer; font-family: inherit; transition: all .2s;
    }
    .ctx-chip:hover { background: #EEF4FF; border-color: #0052FF; }

    /* Input */
    .input-area { padding: 14px 20px; border-top: 1px solid rgba(0,82,255,.06); background: #fff; flex-shrink: 0; }
    .input-wrap { display: flex; gap: 10px; align-items: flex-end; }
    .chat-input {
      flex: 1; border: 1.5px solid rgba(0,82,255,.12); border-radius: 14px;
      padding: 13px 17px; font-family: inherit; font-size: 13.5px; color: #0F172A;
      resize: none; outline: none; background: #F8FAFF; max-height: 130px; overflow-y: auto;
      transition: border-color .2s, box-shadow .2s;
    }
    .chat-input:focus { border-color: #0052FF; box-shadow: 0 0 0 3px rgba(0,82,255,.08); background: #fff; }
    .chat-input:disabled { opacity: .6; cursor: not-allowed; }
    .send-btn {
      width: 46px; height: 46px; border-radius: 12px;
      background: linear-gradient(135deg, #0052FF, #7C3AED);
      border: none; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: all .2s; box-shadow: 0 4px 12px rgba(0,82,255,.3);
    }
    .send-btn:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 6px 16px rgba(0,82,255,.4); }
    .send-btn:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .input-hint { font-size: 10px; color: #94A3B8; margin-top: 7px; text-align: center; }

    @media (max-width: 800px) {
      .chat-layout { grid-template-columns: 1fr; }
      .side-panel { display: none; }
      .msgs-wrap { padding: 16px; }
    }
  `]
})
export class AsistenteComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  private http = inject(HttpClient);

  mensajes = signal<Mensaje[]>([]);
  cargando = signal(false);
  preguntaActual = '';
  private _lastCount = 0;

  capacidades = [
    { icon: '📊', titulo: 'Precios de mercado', desc: 'GAP asking vs notarial, tendencias por zona.', ejemplo: '¿Cuál es el precio medio en Madrid por distritos?' },
    { icon: '🏘️', titulo: 'Comparar barrios', desc: 'Calidad, servicios, transporte, seguridad.', ejemplo: '¿Cuál es mejor para vivir: Chamartín o Salamanca?' },
    { icon: '🏦', titulo: 'Hipotecas', desc: 'Cuotas, TAE, capacidad de endeudamiento.', ejemplo: '¿Cuánto pago al mes por una hipoteca de 300.000€ a 30 años?' },
    { icon: '📈', titulo: 'Inversión y ROI', desc: 'Rentabilidad, alquiler, oportunidades.', ejemplo: '¿En qué zonas de Madrid es más rentable invertir?' },
    { icon: '⚖️', titulo: 'Gastos de compra', desc: 'ITP, AJD, notaría, registro por CCAA.', ejemplo: '¿Cuánto me cuesta comprar un piso de 250.000€ en Madrid?' },
    { icon: '🔍', titulo: 'Búsqueda inteligente', desc: 'Filtros, alertas y recomendaciones.', ejemplo: '¿Dónde puedo encontrar pisos de 3 habitaciones por menos de 400.000€ en Madrid?' },
  ];

  populares = [
    '¿Está bajando el precio de la vivienda en 2026?',
    '¿Cuál es el Euríbor actual y cómo me afecta?',
    '¿Qué es el precio notarial y por qué difiere del de Idealista?',
    '¿Conviene comprar o alquilar ahora mismo?',
    '¿Cuánto tiempo tarda en subir de valor un piso en Madrid?',
  ];

  categorias = [
    { icon: '💰', titulo: 'Precios y mercado', sub: 'Asking vs notarial, tendencias', ejemplo: '¿Cuál es el precio medio en Madrid en 2026?' },
    { icon: '🏦', titulo: 'Hipotecas', sub: 'Cuotas, TAE, tipos de interés', ejemplo: 'Calcula la hipoteca para un piso de 300.000€' },
    { icon: '📈', titulo: 'Inversión', sub: 'ROI, rentabilidad, zonas top', ejemplo: '¿Dónde invertir en pisos en España ahora?' },
    { icon: '🏘️', titulo: 'Barrios', sub: 'Calidad de vida, servicios', ejemplo: '¿Cuáles son los mejores barrios de Madrid?' },
  ];

  ngAfterViewChecked() {
    if (this.mensajes().length !== this._lastCount) {
      this._lastCount = this.mensajes().length;
      try { const el = this.scrollContainer?.nativeElement; if (el) el.scrollTop = el.scrollHeight; } catch { /**/ }
    }
  }

  ctxSugs() {
    const last = this.mensajes().slice(-1)[0];
    if (!last) return [];
    const t = last.content.toLowerCase();
    if (t.includes('precio') || t.includes('m²')) return ['¿Y en otros distritos?', '¿Ha bajado el precio este año?', '¿Qué zona tiene mejor relación calidad-precio?'];
    if (t.includes('hipoteca') || t.includes('cuota')) return ['¿Fija o variable?', '¿Cuánto necesito de entrada?', '¿Qué banco da mejores condiciones?'];
    if (t.includes('barrio') || t.includes('zona')) return ['¿Cómo es la seguridad?', '¿Hay buenas escuelas cerca?', '¿Qué servicios tiene?'];
    if (t.includes('invert') || t.includes('rentab')) return ['¿Cuál es la rentabilidad media?', '¿Alquiler turístico o residencial?'];
    return ['Cuéntame más', '¿Algún ejemplo concreto?', '¿Cómo puedo empezar?'];
  }

  limpiarChat() { this.mensajes.set([]); this._lastCount = 0; }

  onEnter(e: Event) {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) { e.preventDefault(); this.enviar(); }
  }

  enviarSugerencia(texto: string) { this.preguntaActual = texto; this.enviar(); }

  async enviar() {
    const texto = this.preguntaActual.trim();
    if (!texto || this.cargando()) return;
    this.preguntaActual = '';
    this.mensajes.update(m => [...m, { role: 'user', content: texto, timestamp: new Date() }]);
    this.mensajes.update(m => [...m, { role: 'assistant', content: '', timestamp: new Date(), loading: true }]);
    this.cargando.set(true);
    try {
      const r = await this.llamarGemini(texto);
      this.mensajes.update(msgs => {
        const c = [...msgs];
        for (let i = c.length - 1; i >= 0; i--) { if ((c[i] as any).loading) { c[i] = { role: 'assistant', content: r, timestamp: new Date() }; break; } }
        return c;
      });
    } catch {
      this.mensajes.update(msgs => {
        const c = [...msgs];
        for (let i = c.length - 1; i >= 0; i--) { if ((c[i] as any).loading) { c[i] = { role: 'assistant', content: 'No pude conectar con el servicio de IA. Inténtalo de nuevo en unos momentos.', timestamp: new Date() }; break; } }
        return c;
      });
    } finally { this.cargando.set(false); }
  }

  private async llamarGemini(pregunta: string): Promise<string> {
    const sys = `Eres UrbIA, un asistente experto en el mercado inmobiliario español.
Conoces en profundidad: precios por ciudad/distrito/barrio, hipotecas y Euríbor, análisis GAP asking vs notarial, inversión inmobiliaria, gastos de compra (ITP 6-10% por CCAA, AJD, notaría, registro), seguros de hogar, aspectos legales de compraventa en España, y calidad de vida por barrios.
Responde siempre en español. Sé conciso pero completo. Usa **negrita** para conceptos clave y listas con - para enumerar. Si no tienes datos exactos, da estimaciones razonables indicándolo claramente.`;

    const prev = this.mensajes().filter(m => !m.loading && m.content).slice(-10);
    const contents = [
      { role: 'user', parts: [{ text: sys }] },
      { role: 'model', parts: [{ text: 'Entendido. Soy UrbIA, tu asistente inmobiliario experto. ¿En qué puedo ayudarte?' }] },
      ...prev.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: pregunta }] },
    ];

    const res: any = await this.http.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${environment.geminiApiKey}`,
      { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } } }
    ).toPromise();
    return res?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No se pudo obtener respuesta del asistente.';
  }

  fmt(texto: string): string {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.+)$/gm, '<h4 style="margin:10px 0 4px;font-size:13px;font-weight:700;color:#0F172A">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="margin:12px 0 6px;font-size:14px;font-weight:800;color:#0052FF">$1</h3>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul style="margin:8px 0;padding-left:18px">${m}</ul>`)
      .replace(/\n\n/g, '</p><p style="margin:8px 0">')
      .replace(/\n/g, '<br>');
  }
}
