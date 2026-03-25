import { Component, inject, signal, computed } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertasService } from '../../core/services/alertas.service';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import { Alerta } from '../../core/models/inmobiliario.model';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, FormsModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">ALERTAS</h1>
          <p class="page-sub">Recibe una notificación cuando el asking de una zona se acerque al precio notarial</p>
        </div>
        <button class="btn-accent" (click)="mostrarForm.set(true)">
          + Nueva alerta
        </button>
      </div>

      <!-- Notificaciones disparadas -->
      <div class="card" *ngIf="svc.disparos().length > 0">
        <div class="card-header">
          <div>
            <div class="card-title">
              Disparos recientes
              <span class="badge-count" *ngIf="svc.totalNoLeidos() > 0">
                {{ svc.totalNoLeidos() }} nuevos
              </span>
            </div>
            <div class="card-sub">Alertas que se han activado con transacciones reales</div>
          </div>
          <button class="btn-ghost" (click)="svc.marcarTodosLeidos()">
            Marcar todos leídos
          </button>
        </div>

        <div class="disparos-list">
          <div
            class="disparo-row"
            *ngFor="let d of svc.disparos(); let i = index"
            [class.no-leido]="!d.leida"
            (click)="svc.marcarLeidoDisparo(i)">

            <div class="disparo-dot" [class.active]="!d.leida"></div>

            <div class="disparo-main">
              <div class="disparo-titulo">
                <span class="zona-pill">{{ d.zona }}</span>
                Asking <strong style="color:var(--asking)">{{ d.askingActual.toLocaleString('es-ES') }} €/m²</strong>
                vs Notarial <strong style="color:var(--notarial)">{{ d.notarialReferencia.toLocaleString('es-ES') }} €/m²</strong>
              </div>
              <div class="disparo-desc">{{ d.descripcion }}</div>
            </div>

            <div class="disparo-meta">
              <span class="gap-badge" [class]="getGapClass(d.gapActual)">+{{ d.gapActual.toFixed(1) }}% gap</span>
              <span class="disparo-time">{{ svc.tiempoRelativo(d.fecha) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de alertas configuradas -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Alertas configuradas</div>
            <div class="card-sub">{{ svc.alertasActivas().length }} activas · {{ svc.alertas().length }} total</div>
          </div>
        </div>

        <div class="alertas-list">
          <div class="alerta-row" *ngFor="let a of svc.alertas()" [class.inactiva]="!a.activa">
            <!-- Toggle activa -->
            <div class="toggle-wrap" (click)="svc.toggleAlerta(a.id)">
              <div class="toggle" [class.on]="a.activa">
                <div class="toggle-thumb"></div>
              </div>
            </div>

            <!-- Info principal -->
            <div class="alerta-info">
              <div class="alerta-nombre">
                <span class="zona-pill">{{ a.zona }}</span>
                <span class="ciudad-tag">{{ a.ciudad }}</span>
                <span class="alerta-desc" *ngIf="a.descripcion">— {{ a.descripcion }}</span>
              </div>
              <div class="alerta-criterios">
                <span class="criterio">
                  <span class="crit-label">Asking máx:</span>
                  <span class="crit-value" style="color:var(--asking)">{{ a.precioMaxAsking.toLocaleString('es-ES') }} €/m²</span>
                </span>
                <span class="criterio-sep">·</span>
                <span class="criterio">
                  <span class="crit-label">Gap mínimo:</span>
                  <span class="crit-value" style="color:var(--notarial)">{{ a.gapMinimo }}%</span>
                </span>
                <span class="criterio-sep">·</span>
                <span class="criterio">
                  <span class="crit-label">Creada:</span>
                  <span class="crit-value">{{ a.creadaEn | date:'dd/MM/yy' }}</span>
                </span>
              </div>
            </div>

            <!-- Estado -->
            <div class="alerta-estado">
              <span class="estado-pill" [class.activa]="a.activa" [class.pausada]="!a.activa">
                {{ a.activa ? 'Activa' : 'Pausada' }}
              </span>
            </div>

            <!-- Acciones -->
            <div class="alerta-actions">
              <button class="btn-ghost-sm" (click)="editarAlerta(a)">Editar</button>
              <button class="btn-danger-sm" (click)="svc.eliminarAlerta(a.id)">✕</button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="svc.alertas().length === 0">
          <div class="empty-icon">🔔</div>
          <div class="empty-titulo">Sin alertas configuradas</div>
          <div class="empty-sub">Crea una alerta para recibir notificaciones cuando aparezca una oportunidad</div>
          <button class="btn-accent" (click)="mostrarForm.set(true)">+ Crear primera alerta</button>
        </div>
      </div>

      <!-- Cómo funciona -->
      <div class="card how-it-works">
        <div class="card-title" style="margin-bottom:16px">Cómo funcionan las alertas</div>
        <div class="steps-row">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-titulo">Configuras los criterios</div>
            <div class="step-desc">Zona, precio máximo de asking y gap mínimo que te interesa. Por ejemplo: Tetuán, asking &lt; 4.000€/m², gap &gt; 10%.</div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-titulo">El scraper monitoriza</div>
            <div class="step-desc">Cada día se recogen nuevos anuncios de Idealista y Fotocasa. Se cruzan con el precio notarial real de la zona.</div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-titulo">Recibes la notificación</div>
            <div class="step-desc">Cuando un piso cumple tus criterios, te llega un email (o Teams) con el enlace directo al anuncio y el gap calculado.</div>
          </div>
        </div>
      </div>

    </div>

    <!-- MODAL NUEVA ALERTA -->
    <div class="modal-overlay" *ngIf="mostrarForm()" (click)="cerrarForm()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-titulo">{{ editando() ? 'Editar alerta' : 'Nueva alerta' }}</div>
          <button class="btn-ghost-sm" (click)="cerrarForm()">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Descripción (opcional)</label>
          <input class="form-input" type="text" [(ngModel)]="form.descripcion" placeholder="Ej: Piso para invertir en Tetuán">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Ciudad</label>
            <input class="form-input" type="text" [(ngModel)]="form.ciudad" placeholder="Ej: Madrid">
          </div>
          <div class="form-group">
            <label class="form-label">Zona / Distrito</label>
            <select class="form-select" [(ngModel)]="form.zona">
              <option *ngFor="let z of zonasDisponibles()" [value]="z">{{ z }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Asking máximo (€/m²)</label>
            <input class="form-input" type="number" [(ngModel)]="form.precioMaxAsking"
              placeholder="Ej: 4000" min="500" max="20000" step="100">
            <span class="form-hint">Precio máximo que estás dispuesto a pagar según el portal</span>
          </div>
          <div class="form-group">
            <label class="form-label">Gap mínimo (%)</label>
            <input class="form-input" type="number" [(ngModel)]="form.gapMinimo"
              placeholder="Ej: 10" min="0" max="50" step="1">
            <span class="form-hint">Gap mínimo entre asking y notarial para que se dispare</span>
          </div>
        </div>

        <!-- Preview -->
        <div class="form-preview" *ngIf="form.zona && form.precioMaxAsking">
          <div class="preview-label">Vista previa de la alerta</div>
          <div class="preview-text">
            Se disparará cuando en <strong style="color:var(--asking)">{{ form.zona }}</strong>
            aparezca un piso con asking ≤ <strong style="color:var(--asking)">{{ form.precioMaxAsking.toLocaleString('es-ES') }} €/m²</strong>
            y el gap sobre el precio notarial sea ≥ <strong style="color:var(--notarial)">{{ form.gapMinimo }}%</strong>.
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" (click)="cerrarForm()">Cancelar</button>
          <button class="btn-accent" (click)="guardarAlerta()" [disabled]="!formValido()">
            {{ editando() ? 'Guardar cambios' : 'Crear alerta' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding:28px 32px; display:flex; flex-direction:column; gap:24px; animation:fadeIn .4s ease; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

    .page-header { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px; }
    .page-title  { font-family:'Bebas Neue',sans-serif; font-size:48px; letter-spacing:2px; line-height:1; }
    .page-sub    { font-size:13px; color:var(--text-secondary); margin-top:6px; font-weight:300; }

    .card { background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:22px 24px; }
    .card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
    .card-title  { font-size:13.5px; font-weight:500; color:var(--text-primary); display:flex; align-items:center; gap:10px; }
    .card-sub    { font-size:11.5px; color:var(--text-secondary); margin-top:3px; font-weight:300; }

    .badge-count { background:rgba(248,113,113,0.2); color:var(--gap); font-size:11px; padding:2px 8px; border-radius:10px; font-weight:500; }

    /* DISPAROS */
    .disparos-list { display:flex; flex-direction:column; gap:2px; }
    .disparo-row {
      display:grid; grid-template-columns:14px 1fr auto;
      align-items:center; gap:14px; padding:12px 10px; border-radius:8px;
      cursor:pointer; transition:background .15s; border:1px solid transparent;
    }
    .disparo-row:hover { background:rgba(255,255,255,0.02); }
    .disparo-row.no-leido { background:rgba(232,197,71,0.04); border-color:rgba(232,197,71,0.1); }

    .disparo-dot { width:8px; height:8px; border-radius:50%; background:var(--border-bright); flex-shrink:0; }
    .disparo-dot.active { background:var(--asking); box-shadow:0 0 6px rgba(232,197,71,0.5); }

    .disparo-titulo { font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .disparo-desc   { font-size:11.5px; color:var(--text-muted); margin-top:3px; }

    .disparo-meta { display:flex; flex-direction:column; align-items:flex-end; gap:5px; }
    .disparo-time { font-size:11px; color:var(--text-muted); white-space:nowrap; }

    /* ALERTAS LIST */
    .alertas-list { display:flex; flex-direction:column; gap:10px; }
    .alerta-row {
      display:grid; grid-template-columns:44px 1fr auto auto;
      align-items:center; gap:16px; padding:14px 16px;
      background:var(--bg3); border:1px solid var(--border);
      border-radius:10px; transition:all .2s;
    }
    .alerta-row:hover { border-color:var(--border-bright); }
    .alerta-row.inactiva { opacity:.55; }

    .toggle-wrap { cursor:pointer; }
    .toggle {
      width:34px; height:20px; border-radius:10px; background:var(--bg);
      border:1px solid var(--border-bright); position:relative; transition:background .2s;
    }
    .toggle.on { background:rgba(79,209,165,0.3); border-color:var(--notarial); }
    .toggle-thumb {
      position:absolute; top:3px; left:3px; width:12px; height:12px;
      border-radius:50%; background:var(--text-muted); transition:all .2s;
    }
    .toggle.on .toggle-thumb { left:17px; background:var(--notarial); }

    .alerta-nombre { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:5px; }
    .alerta-desc   { font-size:12px; color:var(--text-muted); }
    .alerta-criterios { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .criterio { display:flex; align-items:center; gap:5px; font-size:12px; }
    .crit-label { color:var(--text-muted); }
    .crit-value { font-family:'DM Mono',monospace; font-size:12px; }
    .criterio-sep { color:var(--text-muted); }

    .ciudad-tag {
      font-size:10px; letter-spacing:1px; text-transform:uppercase;
      color:var(--text-muted); background:var(--bg); border:1px solid var(--border);
      padding:2px 7px; border-radius:10px;
    }

    .estado-pill { font-size:11px; padding:3px 10px; border-radius:10px; font-weight:500; }
    .estado-pill.activa  { background:rgba(79,209,165,0.12); color:var(--notarial); }
    .estado-pill.pausada { background:rgba(255,255,255,0.05); color:var(--text-muted); }

    .alerta-actions { display:flex; gap:6px; }

    /* ZONA PILL */
    .zona-pill {
      background:rgba(232,197,71,0.1); color:var(--asking);
      border:1px solid rgba(232,197,71,0.2); font-size:11px;
      padding:2px 8px; border-radius:10px; white-space:nowrap;
    }

    /* GAP BADGE */
    .gap-badge { font-size:11px; font-family:'DM Mono',monospace; padding:3px 8px; border-radius:8px; font-weight:500; }
    .gap-high  { background:rgba(248,113,113,0.15); color:#f87171; }
    .gap-med   { background:rgba(232,197,71,0.12); color:#e8c547; }
    .gap-low   { background:rgba(79,209,165,0.12); color:#4fd1a5; }

    /* BUTTONS */
    .btn-accent {
      background:var(--accent); color:#0d0f12; border:none;
      padding:9px 18px; border-radius:8px; font-family:inherit;
      font-size:13px; font-weight:500; cursor:pointer; transition:background .15s;
    }
    .btn-accent:hover { background:#f0d060; }
    .btn-accent:disabled { opacity:.4; cursor:not-allowed; }
    .btn-ghost {
      background:var(--bg3); border:1px solid var(--border);
      color:var(--text-secondary); padding:8px 14px; border-radius:8px;
      font-family:inherit; font-size:13px; cursor:pointer; transition:all .15s;
    }
    .btn-ghost:hover { border-color:var(--border-bright); color:var(--text-primary); }
    .btn-ghost-sm {
      background:none; border:1px solid var(--border); color:var(--text-muted);
      padding:5px 10px; border-radius:6px; font-size:12px; cursor:pointer;
      font-family:inherit; transition:all .15s;
    }
    .btn-ghost-sm:hover { color:var(--text-primary); border-color:var(--border-bright); }
    .btn-danger-sm {
      background:none; border:1px solid rgba(248,113,113,0.2); color:rgba(248,113,113,0.6);
      padding:5px 10px; border-radius:6px; font-size:12px; cursor:pointer; font-family:inherit; transition:all .15s;
    }
    .btn-danger-sm:hover { background:rgba(248,113,113,0.1); color:var(--gap); border-color:var(--gap); }

    /* EMPTY STATE */
    .empty-state {
      display:flex; flex-direction:column; align-items:center; gap:10px;
      padding:40px; text-align:center;
    }
    .empty-icon   { font-size:36px; opacity:.5; }
    .empty-titulo { font-size:15px; font-weight:500; color:var(--text-primary); }
    .empty-sub    { font-size:13px; color:var(--text-secondary); font-weight:300; max-width:360px; }

    /* HOW IT WORKS */
    .how-it-works { }
    .steps-row { display:grid; grid-template-columns:1fr auto 1fr auto 1fr; align-items:start; gap:16px; }
    .step { display:flex; flex-direction:column; gap:8px; }
    .step-num {
      width:28px; height:28px; border-radius:50%;
      background:rgba(232,197,71,0.15); color:var(--asking);
      border:1px solid rgba(232,197,71,0.3);
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:500;
    }
    .step-titulo { font-size:13px; font-weight:500; color:var(--text-primary); }
    .step-desc   { font-size:12px; color:var(--text-secondary); font-weight:300; line-height:1.6; }
    .step-arrow  { font-size:20px; color:var(--text-muted); margin-top:6px; }

    @media(max-width:900px) {
      .steps-row { grid-template-columns:1fr; }
      .step-arrow { display:none; }
    }

    /* MODAL */
    .modal-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.6);
      display:flex; align-items:center; justify-content:center; z-index:200;
      backdrop-filter:blur(4px); animation:fadeIn .2s ease;
    }
    .modal {
      background:var(--bg2); border:1px solid var(--border-bright);
      border-radius:14px; padding:28px; width:560px; max-width:calc(100vw - 40px);
      display:flex; flex-direction:column; gap:18px;
    }
    .modal-header { display:flex; justify-content:space-between; align-items:center; }
    .modal-titulo { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:1px; color:var(--text-primary); }
    .modal-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:4px; }

    .form-row   { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .form-group { display:flex; flex-direction:column; gap:6px; }
    .form-label { font-size:11.5px; color:var(--text-secondary); font-weight:500; letter-spacing:0.5px; }
    .form-input, .form-select {
      background:var(--bg3); border:1px solid var(--border-bright);
      color:var(--text-primary); padding:9px 12px; border-radius:8px;
      font-family:inherit; font-size:13px; transition:border-color .15s; outline:none;
    }
    .form-input:focus, .form-select:focus { border-color:var(--accent); }
    .form-input::placeholder { color:var(--text-muted); }
    .form-hint { font-size:11px; color:var(--text-muted); }

    .form-preview {
      background:rgba(79,209,165,0.05); border:1px solid rgba(79,209,165,0.15);
      border-radius:8px; padding:14px;
    }
    .preview-label { font-size:10px; letter-spacing:1px; text-transform:uppercase; color:var(--notarial); margin-bottom:8px; }
    .preview-text  { font-size:13px; color:var(--text-secondary); line-height:1.6; }

    @media(max-width:768px){
      .page{padding:20px}
      .form-row{grid-template-columns:1fr}
      .alerta-row{grid-template-columns:44px 1fr}
    }
  `]
})
export class AlertasComponent {
  svc = inject(AlertasService);
  private inmSvc = inject(InmobiliarioService);

  mostrarForm = signal(false);
  editando    = signal<string | null>(null);

  form = {
    descripcion: '',
    ciudad: 'Madrid',
    zona: '',
    precioMaxAsking: 4000,
    gapMinimo: 10,
  };

  zonasDisponibles = computed(() =>
    this.inmSvc.ciudadData().distritos.map(d => d.nombre)
  );

  formValido = computed(() =>
    !!this.form.zona && this.form.precioMaxAsking > 0 && this.form.gapMinimo >= 0
  );

  onCiudadChange(ciudad: string) {
    this.form.ciudad = ciudad;
    this.form.zona = '';
  }

  editarAlerta(a: Alerta) {
    this.form = {
      descripcion: a.descripcion ?? '',
      ciudad: a.ciudad,
      zona: a.zona,
      precioMaxAsking: a.precioMaxAsking,
      gapMinimo: a.gapMinimo,
    };
    this.editando.set(a.id);
    this.mostrarForm.set(true);
  }

  guardarAlerta() {
    if (!this.formValido()) return;
    if (this.editando()) {
      // update
      this.svc.alertas.update(list => list.map(a =>
        a.id === this.editando()
          ? { ...a, ...this.form }
          : a
      ));
    } else {
      this.svc.crearAlerta({ ...this.form, activa: true });
    }
    this.cerrarForm();
  }

  cerrarForm() {
    this.mostrarForm.set(false);
    this.editando.set(null);
    this.form = { descripcion:'', ciudad:'Madrid', zona:'', precioMaxAsking:4000, gapMinimo:10 };
  }

  getGapClass(gap: number): string {
    if (gap >= 20) return 'gap-high';
    if (gap >= 13) return 'gap-med';
    return 'gap-low';
  }
}
