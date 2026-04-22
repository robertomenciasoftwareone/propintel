import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

type CategoriaDoc = 'contrato' | 'nota_simple' | 'cee' | 'escritura' | 'tasacion' | 'seguro' | 'otro';

interface Documento {
  id: string;
  nombre: string;
  categoria: CategoriaDoc;
  inmueble: string;
  fecha: Date;
  tamaño: string;
  url: string;
  notas?: string;
}

const CAT_LABELS: Record<CategoriaDoc, { label: string; icon: string; color: string }> = {
  contrato:    { label: 'Contrato',          icon: '📄', color: '#3B82F6' },
  nota_simple: { label: 'Nota simple',       icon: '🏛️', color: '#8B5CF6' },
  cee:         { label: 'Certificado energ.', icon: '⚡', color: '#10B981' },
  escritura:   { label: 'Escritura',         icon: '📜', color: '#F59E0B' },
  tasacion:    { label: 'Tasación',          icon: '📊', color: '#0052FF' },
  seguro:      { label: 'Seguro',            icon: '🛡️', color: '#EF4444' },
  otro:        { label: 'Otro',              icon: '📎', color: '#94A3B8' },
};

const DEMO_DOCS: Documento[] = [
  { id: '1', nombre: 'Contrato_arras_Salamanca_42.pdf', categoria: 'contrato', inmueble: 'Calle Serrano 42, Madrid', fecha: new Date('2024-11-10'), tamaño: '2.3 MB', url: '#', notas: 'Firmado el 10/11/2024' },
  { id: '2', nombre: 'Nota_simple_Registral.pdf',       categoria: 'nota_simple', inmueble: 'Calle Serrano 42, Madrid', fecha: new Date('2024-11-05'), tamaño: '450 KB', url: '#' },
  { id: '3', nombre: 'CEE_Salamanca42.pdf',              categoria: 'cee',     inmueble: 'Calle Serrano 42, Madrid', fecha: new Date('2024-10-20'), tamaño: '1.1 MB', url: '#', notas: 'Calificación D' },
  { id: '4', nombre: 'Tasacion_BBVA.pdf',                categoria: 'tasacion', inmueble: 'Calle Serrano 42, Madrid', fecha: new Date('2024-11-15'), tamaño: '5.8 MB', url: '#' },
  { id: '5', nombre: 'Poliza_hogar_Mutua.pdf',           categoria: 'seguro', inmueble: 'Av. Diagonal 100, Barcelona', fecha: new Date('2024-09-01'), tamaño: '980 KB', url: '#', notas: 'Vence 01/09/2025' },
  { id: '6', nombre: 'Escritura_publica.pdf',            categoria: 'escritura', inmueble: 'Av. Diagonal 100, Barcelona', fecha: new Date('2023-03-15'), tamaño: '12 MB', url: '#' },
];

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, DatePipe, RouterLink],
  template: `
    <div class="page-wrap">
      <div class="page-header">
        <a routerLink="/dashboard" class="back-link">
          <svg viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Inicio
        </a>
        <div class="header-row">
          <div>
            <h1 class="page-title">Gestor de documentos</h1>
            <p class="page-sub">Contratos, notas simples, certificados y más — todo centralizado</p>
          </div>
          <label class="btn-upload">
            <svg viewBox="0 0 16 16" fill="none"><path d="M8 11V5M5 8l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="2" y="13" width="12" height="1.5" rx=".75" fill="currentColor"/></svg>
            Subir documento
            <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.png" (change)="onFileUpload($event)" style="display:none" />
          </label>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-chip" *ngFor="let s of statsCards()">
          <span class="stat-icon">{{ s.icon }}</span>
          <span class="stat-label">{{ s.label }}</span>
          <span class="stat-val">{{ s.val }}</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <input class="search-inp" [(ngModel)]="searchQ" placeholder="Buscar por nombre, inmueble..." />
        <div class="cat-chips">
          <button class="chip" [class.active]="filtroCategoria() === ''" (click)="filtroCategoria.set('')">Todos</button>
          <button class="chip" *ngFor="let c of categorias" [class.active]="filtroCategoria() === c"
            (click)="filtroCategoria.set(c)">
            {{ catMeta(c).icon }} {{ catMeta(c).label }}
          </button>
        </div>
      </div>

      <!-- Tabla docs -->
      <div class="doc-grid">
        <div class="doc-card" *ngFor="let doc of docsFiltrados()" (click)="seleccionar(doc)">
          <div class="doc-icon" [style.background]="catMeta(doc.categoria).color + '15'" [style.color]="catMeta(doc.categoria).color">
            {{ catMeta(doc.categoria).icon }}
          </div>
          <div class="doc-info">
            <div class="doc-nombre">{{ doc.nombre }}</div>
            <div class="doc-inmueble">{{ doc.inmueble }}</div>
            <div class="doc-meta">
              <span class="doc-cat" [style.background]="catMeta(doc.categoria).color + '15'" [style.color]="catMeta(doc.categoria).color">
                {{ catMeta(doc.categoria).label }}
              </span>
              <span class="doc-fecha">{{ doc.fecha | date:'dd/MM/yyyy' }}</span>
              <span class="doc-size">{{ doc.tamaño }}</span>
            </div>
            <div class="doc-notas" *ngIf="doc.notas">💬 {{ doc.notas }}</div>
          </div>
          <div class="doc-actions">
            <button class="action-btn" title="Ver" (click)="$event.stopPropagation()">
              <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 8S4 3 8 3s6.5 5 6.5 5-2.5 5-6.5 5S1.5 8 1.5 8z" stroke="currentColor" stroke-width="1.3"/></svg>
            </button>
            <button class="action-btn" title="Descargar" (click)="$event.stopPropagation()">
              <svg viewBox="0 0 16 16" fill="none"><path d="M8 3v7M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 13h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            </button>
            <button class="action-btn del" title="Eliminar" (click)="eliminar(doc.id); $event.stopPropagation()">
              <svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>

        <div class="empty" *ngIf="docsFiltrados().length === 0">
          <div class="empty-icon">📂</div>
          <div class="empty-text">No hay documentos{{ filtroCategoria() ? ' en esta categoría' : '' }}</div>
          <div class="empty-sub">Sube tu primer documento usando el botón de arriba</div>
        </div>
      </div>

      <!-- Toast -->
      <div class="toast" *ngIf="toast()">{{ toast() }}</div>
    </div>
  `,
  styles: [`
    .page-wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px; font-family: 'Plus Jakarta Sans', sans-serif; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #64748B; font-size: 13px; text-decoration: none; margin-bottom: 12px; }
    .back-link svg { width: 14px; height: 14px; }
    .header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .page-title { font-size: 26px; font-weight: 800; color: #0F172A; margin: 0 0 6px; }
    .page-sub { font-size: 14px; color: #64748B; margin: 0; }
    .btn-upload { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; background: #0052FF; color: #fff; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .btn-upload svg { width: 16px; height: 16px; }
    .btn-upload:hover { background: #0040CC; }

    .stats-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
    .stat-chip { display: flex; align-items: center; gap: 8px; background: #F8FAFC; border-radius: 10px; padding: 10px 16px; border: 1px solid #E2E8F0; }
    .stat-icon { font-size: 18px; }
    .stat-label { font-size: 12px; color: #64748B; }
    .stat-val { font-size: 14px; font-weight: 700; color: #0F172A; }

    .filters-bar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .search-inp { padding: 10px 14px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 13px; width: 100%; max-width: 360px; outline: none; box-sizing: border-box; }
    .search-inp:focus { border-color: #0052FF; }
    .cat-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 5px 12px; border-radius: 20px; border: 1px solid #E2E8F0; background: #fff; font-size: 12px; cursor: pointer; color: #64748B; }
    .chip.active { background: #EEF4FF; border-color: #0052FF; color: #0052FF; font-weight: 600; }

    .doc-grid { display: flex; flex-direction: column; gap: 8px; }
    .doc-card { display: flex; align-items: flex-start; gap: 14px; background: #fff; border-radius: 12px; border: 1px solid #E2E8F0; padding: 14px 16px; cursor: pointer; transition: box-shadow .2s; }
    .doc-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }
    .doc-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .doc-info { flex: 1; min-width: 0; }
    .doc-nombre { font-size: 13px; font-weight: 600; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .doc-inmueble { font-size: 11px; color: #64748B; margin: 2px 0 6px; }
    .doc-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .doc-cat { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .doc-fecha, .doc-size { font-size: 11px; color: #94A3B8; }
    .doc-notas { font-size: 11px; color: #64748B; margin-top: 4px; }
    .doc-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .action-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #E2E8F0; background: #F8FAFC; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748B; }
    .action-btn svg { width: 14px; height: 14px; }
    .action-btn:hover { background: #EEF4FF; color: #0052FF; border-color: #0052FF; }
    .action-btn.del:hover { background: #FFF1F2; color: #EF4444; border-color: #FECDD3; }

    .empty { text-align: center; padding: 60px 20px; }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-text { font-size: 15px; font-weight: 600; color: #475569; margin-bottom: 6px; }
    .empty-sub { font-size: 13px; color: #94A3B8; }

    .toast { position: fixed; bottom: 24px; right: 24px; background: #0F172A; color: #fff; padding: 12px 20px; border-radius: 10px; font-size: 13px; animation: slideIn .3s ease; z-index: 9999; }
    @keyframes slideIn { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }
  `]
})
export class DocumentosComponent {
  searchQ = '';
  filtroCategoria = signal<string>('');
  toast = signal<string>('');
  docs = signal<Documento[]>([...DEMO_DOCS]);

  readonly categorias: CategoriaDoc[] = ['contrato', 'nota_simple', 'cee', 'escritura', 'tasacion', 'seguro', 'otro'];

  catMeta(c: string) { return CAT_LABELS[c as CategoriaDoc] ?? CAT_LABELS['otro']; }

  statsCards = computed(() => {
    const d = this.docs();
    return [
      { icon: '📁', label: 'Total documentos', val: d.length },
      { icon: '🏠', label: 'Inmuebles', val: new Set(d.map(x => x.inmueble)).size },
      { icon: '📄', label: 'Contratos', val: d.filter(x => x.categoria === 'contrato').length },
      { icon: '⚡', label: 'CEE', val: d.filter(x => x.categoria === 'cee').length },
    ];
  });

  docsFiltrados = computed(() => {
    let d = this.docs();
    if (this.filtroCategoria()) d = d.filter(x => x.categoria === this.filtroCategoria());
    if (this.searchQ.trim()) {
      const q = this.searchQ.toLowerCase();
      d = d.filter(x => x.nombre.toLowerCase().includes(q) || x.inmueble.toLowerCase().includes(q));
    }
    return d.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  });

  seleccionar(doc: Documento) {
    this.showToast(`Abriendo: ${doc.nombre}`);
  }

  eliminar(id: string) {
    this.docs.update(d => d.filter(x => x.id !== id));
    this.showToast('Documento eliminado');
  }

  onFileUpload(ev: Event) {
    const files = (ev.target as HTMLInputElement).files;
    if (!files) return;
    const nuevos: Documento[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      nuevos.push({
        id: Date.now() + '_' + i,
        nombre: f.name,
        categoria: 'otro',
        inmueble: 'Sin asignar',
        fecha: new Date(),
        tamaño: this._formatSize(f.size),
        url: URL.createObjectURL(f),
      });
    }
    this.docs.update(d => [...nuevos, ...d]);
    this.showToast(`${nuevos.length} documento(s) subido(s) correctamente`);
  }

  private _formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
