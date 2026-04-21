import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

interface SugerenciaRapida {
  icon: string;
  texto: string;
}

@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, DatePipe, FormsModule],
  template: `
<div class="page">

  <!-- Header -->
  <div class="page-header">
    <div class="header-inner">
      <div class="ai-avatar large">
        <span>🤖</span>
        <div class="status-dot"></div>
      </div>
      <div>
        <h1 class="page-title">Asistente IA inmobiliario</h1>
        <p class="page-sub">Pregunta cualquier cosa sobre el mercado, hipotecas, barrios, inversión... en lenguaje natural</p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn-ghost-sm" (click)="limpiarChat()">Nueva conversación</button>
      <a routerLink="/mapa-resultados" class="btn-ghost-sm">← Volver al mapa</a>
    </div>
  </div>

  <div class="chat-layout">

    <!-- Panel izquierdo: capacidades -->
    <aside class="caps-panel">
      <div class="caps-title">Puedo ayudarte con…</div>
      <div class="caps-items">
        <div class="cap-item" *ngFor="let c of capacidades">
          <div class="cap-icon">{{ c.icon }}</div>
          <div>
            <div class="cap-title">{{ c.titulo }}</div>
            <div class="cap-desc">{{ c.desc }}</div>
          </div>
        </div>
      </div>

      <div class="disclaimer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        Los análisis son orientativos y no constituyen asesoramiento financiero o legal.
      </div>
    </aside>

    <!-- Chat principal -->
    <div class="chat-main">

      <!-- Mensajes -->
      <div class="messages-wrap" #scrollContainer>

        <!-- Bienvenida -->
        <div class="welcome-msg" *ngIf="mensajes().length === 0">
          <div class="welcome-icon">🏠</div>
          <h2>Hola, soy tu asistente inmobiliario</h2>
          <p>Estoy aquí para ayudarte a encontrar el piso perfecto, analizar precios, entender hipotecas y todo lo que necesites saber sobre el mercado inmobiliario español.</p>
          <div class="sugerencias-grid">
            <button class="sug-btn" *ngFor="let s of sugerenciasRapidas" (click)="enviarSugerencia(s.texto)">
              <span class="sug-icon">{{ s.icon }}</span>
              <span>{{ s.texto }}</span>
            </button>
          </div>
        </div>

        <!-- Mensajes del chat -->
        <div class="message-wrapper"
          *ngFor="let m of mensajes()"
          [class.user-wrapper]="m.role === 'user'"
          [class.ai-wrapper]="m.role === 'assistant'">

          <div class="ai-avatar sm" *ngIf="m.role === 'assistant'">
            <span>🤖</span>
          </div>

          <div class="message-bubble" [class.user-bubble]="m.role === 'user'" [class.ai-bubble]="m.role === 'assistant'">
            <div class="bubble-content" *ngIf="!m.loading" [innerHTML]="formatMensaje(m.content)"></div>
            <div class="typing-indicator" *ngIf="m.loading">
              <span></span><span></span><span></span>
            </div>
            <div class="bubble-time">{{ m.timestamp | date:'HH:mm' }}</div>
          </div>

          <div class="user-avatar" *ngIf="m.role === 'user'">
            <span>👤</span>
          </div>
        </div>
      </div>

      <!-- Sugerencias contextuales (si hay mensajes) -->
      <div class="context-sugs" *ngIf="mensajes().length > 0 && !cargando()">
        <button class="ctx-sug" *ngFor="let s of sugerenciasContexto()" (click)="enviarSugerencia(s)">
          {{ s }}
        </button>
      </div>

      <!-- Input -->
      <div class="input-area">
        <div class="input-wrap">
          <textarea
            #inputRef
            [(ngModel)]="preguntaActual"
            (keydown.enter)="onEnter($event)"
            placeholder="Pregunta sobre precios, barrios, hipotecas, inversión..."
            class="chat-input"
            rows="1"
            [disabled]="cargando()">
          </textarea>
          <button class="send-btn"
            [disabled]="!preguntaActual.trim() || cargando()"
            (click)="enviar()">
            <svg *ngIf="!cargando()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
            <svg *ngIf="cargando()" class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          </button>
        </div>
        <div class="input-hint">Enter para enviar · Shift+Enter nueva línea</div>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; height: 100%; padding: 24px; font-family: 'Plus Jakarta Sans', sans-serif; gap: 20px; overflow: hidden; }
    .page-header { display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
    .header-inner { display: flex; gap: 14px; align-items: center; }
    .page-title { font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.04em; margin: 0 0 3px; }
    .page-sub { font-size: 12px; color: #64748B; margin: 0; }
    .header-actions { display: flex; gap: 8px; }
    .btn-ghost-sm { font-size: 12px; color: #64748B; text-decoration: none; padding: 7px 13px; border: 1px solid rgba(0,82,255,.1); border-radius: 10px; background: transparent; cursor: pointer; transition: all .2s; }
    .btn-ghost-sm:hover { border-color: #0052FF; color: #0052FF; }

    .ai-avatar { border-radius: 50%; background: linear-gradient(135deg, #0052FF, #7C3AED); display: flex; align-items: center; justify-content: center; position: relative; }
    .ai-avatar.large { width: 48px; height: 48px; font-size: 22px; }
    .ai-avatar.sm { width: 32px; height: 32px; font-size: 15px; flex-shrink: 0; }
    .status-dot { position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; border-radius: 50%; background: #10B981; border: 2px solid #fff; }

    .chat-layout { display: grid; grid-template-columns: 260px 1fr; gap: 20px; flex: 1; overflow: hidden; min-height: 0; }

    /* Caps panel */
    .caps-panel { background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
    .caps-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #94A3B8; }
    .caps-items { display: flex; flex-direction: column; gap: 14px; }
    .cap-item { display: flex; gap: 10px; align-items: flex-start; }
    .cap-icon { font-size: 20px; flex-shrink: 0; }
    .cap-title { font-size: 12px; font-weight: 600; color: #0F172A; }
    .cap-desc { font-size: 11px; color: #64748B; margin-top: 1px; line-height: 1.4; }
    .disclaimer { margin-top: auto; font-size: 10px; color: #94A3B8; display: flex; gap: 6px; align-items: flex-start; line-height: 1.4; }
    .disclaimer svg { flex-shrink: 0; margin-top: 1px; }

    /* Chat main */
    .chat-main { display: flex; flex-direction: column; background: #fff; border: 1px solid rgba(0,82,255,.08); border-radius: 20px; overflow: hidden; }

    .messages-wrap { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; }

    /* Welcome */
    .welcome-msg { text-align: center; padding: 32px 24px; }
    .welcome-icon { font-size: 48px; margin-bottom: 12px; }
    .welcome-msg h2 { font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 8px; }
    .welcome-msg p { font-size: 14px; color: #64748B; line-height: 1.6; margin: 0 0 24px; }
    .sugerencias-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left; }
    .sug-btn { display: flex; gap: 8px; align-items: center; padding: 12px 14px; border: 1px solid rgba(0,82,255,.1); border-radius: 14px; background: #F8FAFF; color: #374151; font-size: 12px; cursor: pointer; transition: all .2s; font-family: inherit; text-align: left; }
    .sug-btn:hover { border-color: #0052FF; background: #EEF4FF; color: #0052FF; }
    .sug-icon { font-size: 16px; }

    /* Messages */
    .message-wrapper { display: flex; gap: 10px; align-items: flex-end; }
    .user-wrapper { flex-direction: row-reverse; }
    .message-bubble { max-width: 72%; padding: 12px 16px; border-radius: 18px; position: relative; }
    .user-bubble { background: #0052FF; color: #fff; border-bottom-right-radius: 4px; }
    .ai-bubble { background: #F8FAFC; color: #0F172A; border: 1px solid rgba(0,82,255,.08); border-bottom-left-radius: 4px; }
    .bubble-content { font-size: 13.5px; line-height: 1.7; }
    .bubble-content :global(strong) { font-weight: 700; }
    .bubble-content :global(ul) { margin: 8px 0; padding-left: 18px; }
    .bubble-content :global(li) { margin-bottom: 4px; }
    .bubble-time { font-size: 10px; opacity: .5; margin-top: 6px; text-align: right; }
    .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #EEF4FF; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }

    /* Typing indicator */
    .typing-indicator { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
    .typing-indicator span { width: 7px; height: 7px; border-radius: 50%; background: #94A3B8; animation: bounce 1.2s infinite; }
    .typing-indicator span:nth-child(2) { animation-delay: .2s; }
    .typing-indicator span:nth-child(3) { animation-delay: .4s; }
    @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

    /* Context suggestions */
    .context-sugs { padding: 8px 16px; display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid rgba(0,82,255,.04); }
    .ctx-sug { padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(0,82,255,.12); background: transparent; color: #0052FF; font-size: 11px; cursor: pointer; transition: all .2s; font-family: inherit; font-weight: 500; }
    .ctx-sug:hover { background: #EEF4FF; }

    /* Input */
    .input-area { padding: 14px 16px; border-top: 1px solid rgba(0,82,255,.06); background: #FAFBFF; }
    .input-wrap { display: flex; gap: 10px; align-items: flex-end; }
    .chat-input { flex: 1; border: 1px solid rgba(0,82,255,.12); border-radius: 14px; padding: 12px 16px; font-family: inherit; font-size: 13.5px; color: #0F172A; resize: none; outline: none; background: #fff; transition: border-color .2s; max-height: 120px; overflow-y: auto; }
    .chat-input:focus { border-color: #0052FF; box-shadow: 0 0 0 3px rgba(0,82,255,.08); }
    .chat-input:disabled { opacity: .6; cursor: not-allowed; }
    .send-btn { width: 44px; height: 44px; border-radius: 12px; background: #0052FF; border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .2s; }
    .send-btn:hover:not(:disabled) { background: #0041CC; transform: scale(1.05); }
    .send-btn:disabled { opacity: .5; cursor: not-allowed; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .input-hint { font-size: 10px; color: #94A3B8; margin-top: 6px; }
  `]
})
export class AsistenteComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private http = inject(HttpClient);

  mensajes = signal<Mensaje[]>([]);
  cargando = signal(false);
  preguntaActual = '';

  capacidades = [
    { icon: '📊', titulo: 'Análisis de precios', desc: 'Precios por zona, GAP asking vs notarial, tendencias.' },
    { icon: '🏘️', titulo: 'Comparación de barrios', desc: 'Calidad de vida, servicios, transporte, seguridad.' },
    { icon: '🏦', titulo: 'Hipotecas y financiación', desc: 'Cálculo de cuotas, TAE, capacidad de endeudamiento.' },
    { icon: '📈', titulo: 'Inversión inmobiliaria', desc: 'ROI, rentabilidad bruta, análisis de oportunidades.' },
    { icon: '⚖️', titulo: 'Aspectos legales', desc: 'ITP, AJD, gastos de compra, normativa básica.' },
    { icon: '🔍', titulo: 'Búsqueda inteligente', desc: 'Filtros avanzados, alertas de precio, notificaciones.' },
  ];

  sugerenciasRapidas: SugerenciaRapida[] = [
    { icon: '💰', texto: '¿Cuál es el precio medio en Madrid en 2026?' },
    { icon: '🏘️', texto: '¿Cuáles son los mejores barrios para vivir en Madrid?' },
    { icon: '📉', texto: '¿En qué zonas hay más oportunidades de inversión?' },
    { icon: '🏦', texto: 'Explícame cómo funciona el Euríbor y las hipotecas' },
    { icon: '⚖️', texto: '¿Cuánto cuesta comprar un piso de 200.000€ con todos los gastos?' },
    { icon: '📊', texto: '¿Qué es el GAP entre precio pedido y precio notarial?' },
  ];

  private _lastMsgCount = 0;

  ngAfterViewChecked(): void {
    if (this.mensajes().length !== this._lastMsgCount) {
      this._lastMsgCount = this.mensajes().length;
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* */ }
  }

  sugerenciasContexto = () => {
    const last = this.mensajes().slice(-1)[0];
    if (!last) return [];
    const t = last.content.toLowerCase();
    if (t.includes('precio') || t.includes('m²')) return ['¿Y en otros distritos?', '¿Ha bajado el precio este año?', '¿Qué zona tiene mejor relación calidad-precio?'];
    if (t.includes('hipoteca') || t.includes('cuota')) return ['¿Qué banco da mejores condiciones?', '¿Cuánto necesito de entrada?', '¿Conviene fija o variable?'];
    if (t.includes('barrio') || t.includes('zona')) return ['¿Qué servicios tiene la zona?', '¿Cómo es la seguridad?', '¿Hay buenas escuelas cerca?'];
    return ['Cuéntame más', '¿Algún ejemplo concreto?', '¿Cómo puedo empezar?'];
  };

  limpiarChat(): void {
    this.mensajes.set([]);
    this._lastMsgCount = 0;
  }

  onEnter(e: KeyboardEvent): void {
    if (!e.shiftKey) {
      e.preventDefault();
      this.enviar();
    }
  }

  enviarSugerencia(texto: string): void {
    this.preguntaActual = texto;
    this.enviar();
  }

  async enviar(): Promise<void> {
    const texto = this.preguntaActual.trim();
    if (!texto || this.cargando()) return;

    this.preguntaActual = '';

    this.mensajes.update(m => [...m, {
      role: 'user',
      content: texto,
      timestamp: new Date(),
    }]);

    const loadingMsg: Mensaje = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };
    this.mensajes.update(m => [...m, loadingMsg]);
    this.cargando.set(true);

    try {
      const respuesta = await this.llamarGemini(texto);
      this.mensajes.update(msgs => {
        const copia = [...msgs];
        let idx = -1;
        for (let i = copia.length - 1; i >= 0; i--) { if ((copia[i] as any).loading) { idx = i; break; } }
        if (idx >= 0) copia[idx] = { role: 'assistant', content: respuesta, timestamp: new Date() };
        return copia;
      });
    } catch {
      this.mensajes.update(msgs => {
        const copia = [...msgs];
        let idx = -1;
        for (let i = copia.length - 1; i >= 0; i--) { if ((copia[i] as any).loading) { idx = i; break; } }
        if (idx >= 0) copia[idx] = {
          role: 'assistant',
          content: 'Lo siento, no he podido conectar con el servicio de IA ahora mismo. Por favor inténtalo de nuevo en unos momentos.',
          timestamp: new Date(),
        };
        return copia;
      });
    } finally {
      this.cargando.set(false);
    }
  }

  private async llamarGemini(pregunta: string): Promise<string> {
    const systemPrompt = `Eres un asistente experto en el mercado inmobiliario español. Tu nombre es UrbIA.
Tienes profundo conocimiento sobre:
- Precios de vivienda por ciudad, distrito y barrio (Madrid, Barcelona, Valencia, Sevilla, etc.)
- El mercado hipotecario español: bancos, Euríbor, TAE, condiciones 2026
- Análisis GAP: diferencia entre precio pedido (Idealista/Fotocasa) y precio real notarial
- Inversión inmobiliaria: rentabilidad, ROI, zonas de oportunidad
- Gastos de compra: ITP (6-10% según CCAA), AJD, notaría, registro, gestoría
- Seguros de hogar: coberturas, franquicias, precios
- Aspectos legales básicos de compraventa en España
- Barrios y calidad de vida en ciudades españolas

Responde siempre en español. Sé conciso pero completo. Usa datos reales de 2025-2026 cuando los tengas.
Usa markdown básico: **negrita**, listas con -, etc. para mejor legibilidad.
Si no tienes datos exactos, da estimaciones razonables indicando que son aproximadas.`;

    const historial = this.mensajes()
      .filter(m => !m.loading)
      .slice(-10)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const contents = [
      ...historial.slice(0, -1),
      { role: 'user', parts: [{ text: pregunta }] },
    ];

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    };

    const apiKey = environment.geminiApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res: any = await this.http.post(url, body).toPromise();
    return res?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No se pudo obtener respuesta.';
  }

  formatMensaje(texto: string): string {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }
}
