import { Component, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';

interface CheckItem {
  id: string;
  texto: string;
  descripcion?: string;
  enlace?: string;
  enlacelabel?: string;
  obligatorio: boolean;
  hecho: boolean;
}

interface Fase {
  id: string;
  numero: number;
  titulo: string;
  icono: string;
  descripcion: string;
  items: CheckItem[];
}

@Component({
  selector: 'app-checklist-compra',
  standalone: true,
  imports: [NgClass, RouterLink],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Checklist del comprador</h1>
          <p class="page-sub">Guía paso a paso desde la primera visita hasta vivir en tu casa · {{ hechos() }}/{{ total() }} tareas completadas</p>
        </div>
        <a routerLink="/mapa-resultados" class="btn-ghost">← Volver al mapa</a>
      </div>

      <!-- Progreso global -->
      <div class="progress-global">
        <div class="progress-track">
          <div class="progress-fill" [style.width.%]="pctGlobal()"></div>
        </div>
        <span class="progress-label">{{ pctGlobal() }}% completado</span>
      </div>

      <!-- Fases -->
      @for (fase of fases(); track fase.id) {
        <div class="fase-card" [ngClass]="{ 'fase-completa': fasePct(fase) === 100, 'fase-activa': faseActiva() === fase.id }">

          <!-- Cabecera de fase -->
          <button class="fase-header" (click)="toggleFase(fase.id)">
            <div class="fase-header-left">
              <div class="fase-num-wrap" [ngClass]="faseNumClass(fase)">
                @if (fasePct(fase) === 100) {
                  <span class="fase-check">✓</span>
                } @else {
                  <span class="fase-num">{{ fase.numero }}</span>
                }
              </div>
              <div class="fase-info">
                <div class="fase-titulo">{{ fase.icono }} {{ fase.titulo }}</div>
                <div class="fase-desc">{{ fase.descripcion }}</div>
              </div>
            </div>
            <div class="fase-header-right">
              <div class="fase-mini-bar">
                <div class="fase-mini-fill" [style.width.%]="fasePct(fase)" [ngClass]="faseBarClass(fase)"></div>
              </div>
              <span class="fase-pct">{{ faseHechos(fase) }}/{{ fase.items.length }}</span>
              <span class="fase-chevron" [class.rotado]="faseActiva() === fase.id">›</span>
            </div>
          </button>

          <!-- Items de la fase (expandibles) -->
          @if (faseActiva() === fase.id) {
            <div class="items-list">
              @for (item of fase.items; track item.id) {
                <div class="check-item" [class.hecho]="item.hecho" (click)="toggleItem(fase.id, item.id)">
                  <div class="check-box" [ngClass]="item.hecho ? 'cb-done' : (item.obligatorio ? 'cb-required' : 'cb-optional')">
                    @if (item.hecho) { <span>✓</span> }
                  </div>
                  <div class="check-content">
                    <div class="check-texto">
                      {{ item.texto }}
                      @if (item.obligatorio) {
                        <span class="obligatorio-badge">Obligatorio</span>
                      }
                    </div>
                    @if (item.descripcion) {
                      <p class="check-desc">{{ item.descripcion }}</p>
                    }
                    @if (item.enlace) {
                      <a [href]="item.enlace" target="_blank" class="check-link" (click)="$event.stopPropagation()">
                        {{ item.enlacelabel ?? 'Más información' }} ↗
                      </a>
                    }
                  </div>
                </div>
              }
            </div>
          }

        </div>
      }

      <!-- Footer CTA -->
      <div class="footer-cta">
        <p class="footer-nota">
          Este checklist es una guía orientativa. Para transacciones reales, consulta siempre con un abogado o asesor inmobiliario cualificado.
        </p>
        <div class="footer-btns">
          <a routerLink="/costes-compra" class="footer-btn">🧾 Calcular gastos de compra</a>
          <a routerLink="/hipotecas" class="footer-btn">🏦 Comparar hipotecas</a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; max-width: 800px; margin: 0 auto; font-family: 'Inter', sans-serif; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 20px; gap: 16px;
    }
    .page-title { font-size: 22px; font-weight: 800; color: #1A1A1A; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #6B7280; margin: 0; }
    .btn-ghost {
      flex-shrink: 0; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
      color: #6B7280; border: 1px solid #E5E7EB; text-decoration: none;
      transition: background .15s;
    }
    .btn-ghost:hover { background: #F9FAFB; }

    .progress-global {
      display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
    }
    .progress-track { flex: 1; height: 8px; background: #F3F4F6; border-radius: 999px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #2563EB, #7C3AED); border-radius: 999px; transition: width .4s; }
    .progress-label { font-size: 12px; font-weight: 700; color: #6B7280; white-space: nowrap; }

    /* Fases */
    .fase-card {
      border: 1px solid #E5E7EB; border-radius: 14px; margin-bottom: 10px;
      overflow: hidden; transition: border-color .2s, box-shadow .2s;
    }
    .fase-card.fase-completa { border-color: #BBF7D0; background: #FAFFFE; }
    .fase-card.fase-activa   { border-color: #BFDBFE; box-shadow: 0 0 0 3px #EFF6FF; }

    .fase-header {
      width: 100%; display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; background: none; border: none; cursor: pointer;
      gap: 12px; text-align: left;
    }
    .fase-header:hover { background: #FAFAFA; }
    .fase-header-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
    .fase-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

    .fase-num-wrap {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-weight: 800;
    }
    .fase-num-wrap.pendiente { background: #F3F4F6; color: #6B7280; }
    .fase-num-wrap.en-curso  { background: #EFF6FF; color: #2563EB; border: 2px solid #BFDBFE; }
    .fase-num-wrap.completa  { background: #D1FAE5; color: #059669; }
    .fase-num  { font-size: 15px; }
    .fase-check{ font-size: 16px; }

    .fase-titulo { font-size: 14px; font-weight: 700; color: #1A1A1A; }
    .fase-desc   { font-size: 12px; color: #9CA3AF; margin-top: 2px; }

    .fase-mini-bar { width: 60px; height: 4px; background: #F3F4F6; border-radius: 999px; overflow: hidden; }
    .fase-mini-fill { height: 100%; border-radius: 999px; transition: width .4s; }
    .fase-mini-fill.bar-blue   { background: #2563EB; }
    .fase-mini-fill.bar-green  { background: #16A34A; }
    .fase-mini-fill.bar-gray   { background: #D1D5DB; }
    .fase-pct    { font-size: 12px; font-weight: 600; color: #6B7280; }
    .fase-chevron{ font-size: 20px; color: #9CA3AF; transition: transform .2s; font-style: normal; }
    .fase-chevron.rotado { transform: rotate(90deg); }

    /* Items */
    .items-list { border-top: 1px solid #F3F4F6; padding: 8px 0; }
    .check-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 20px; cursor: pointer; transition: background .15s;
    }
    .check-item:hover { background: #F9FAFB; }
    .check-item.hecho .check-texto { color: #9CA3AF; text-decoration: line-through; }

    .check-box {
      width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0; margin-top: 1px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; color: #fff;
      border: 2px solid #D1D5DB; background: #fff;
      transition: all .15s;
    }
    .check-box.cb-done     { background: #16A34A; border-color: #16A34A; }
    .check-box.cb-required { border-color: #F59E0B; }
    .check-box.cb-optional { border-color: #D1D5DB; }

    .check-content { flex: 1; min-width: 0; }
    .check-texto { font-size: 13px; font-weight: 600; color: #1A1A1A; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .obligatorio-badge {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
      color: #D97706; background: #FEF3C7; border-radius: 999px; padding: 2px 7px;
    }
    .check-desc { font-size: 12px; color: #6B7280; line-height: 1.6; margin: 4px 0 0; }
    .check-link { font-size: 11px; font-weight: 600; color: #2563EB; text-decoration: none; display: inline-block; margin-top: 4px; }
    .check-link:hover { text-decoration: underline; }

    /* Footer */
    .footer-cta {
      margin-top: 24px; padding: 20px; background: #F9FAFB;
      border-radius: 14px; border: 1px solid #E5E7EB;
    }
    .footer-nota { font-size: 12px; color: #9CA3AF; margin: 0 0 14px; line-height: 1.6; }
    .footer-btns { display: flex; gap: 10px; flex-wrap: wrap; }
    .footer-btn {
      padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 600;
      text-decoration: none; background: #fff; color: #374151; border: 1px solid #E5E7EB;
      transition: background .15s;
    }
    .footer-btn:hover { background: #F3F4F6; }

    @media (max-width: 700px) {
      .page { padding: 16px; }
      .page-header { flex-direction: column; }
      .footer-btns { flex-direction: column; }
    }
  `]
})
export class ChecklistCompraComponent {

  // Estado de qué fase está expandida
  faseActiva = signal<string | null>('pre-oferta');

  // Estado de las fases y sus items (mutable para marcar hechos)
  fases = signal<Fase[]>([
    {
      id: 'pre-oferta', numero: 1, icono: '🔍',
      titulo: 'Pre-oferta: Due Diligence',
      descripcion: 'Antes de comprometerte, verifica que el inmueble está limpio de problemas',
      items: [
        {
          id: 'nota-simple', texto: 'Solicitar nota simple registral', obligatorio: true,
          descripcion: 'Confirma la titularidad y cargas del inmueble. Cuesta 9-10 €.',
          enlace: 'https://www.registradores.org/servicios/nota-simple', enlacelabel: 'Registro de la Propiedad',
          hecho: false
        },
        {
          id: 'cargas', texto: 'Revisar cargas y deudas pendientes', obligatorio: true,
          descripcion: 'Hipotecas, embargos, servidumbres. Pide certificado de deuda de la comunidad de propietarios.',
          hecho: false
        },
        {
          id: 'cee', texto: 'Exigir Certificado de Eficiencia Energética (CEE)', obligatorio: true,
          descripcion: 'Obligatorio por ley desde 2013. Debe incluir la letra (A-G) y las emisiones.',
          hecho: false
        },
        {
          id: 'ite', texto: 'Comprobar ITE (Inspección Técnica del Edificio)', obligatorio: false,
          descripcion: 'Edificios de más de 50 años deben tener ITE. Solicítala al vendedor o al Ayuntamiento.',
          hecho: false
        },
        {
          id: 'cedula', texto: 'Verificar cédula de habitabilidad', obligatorio: false,
          descripcion: 'Obligatoria en Cataluña y otras CCAA. Confirma que el inmueble es legalmente habitable.',
          hecho: false
        },
        {
          id: 'inspeccion', texto: 'Valorar inspección técnica independiente', obligatorio: false,
          descripcion: 'Un arquitecto o aparejador puede detectar humedades, grietas o instalaciones deficientes. Cuesta 200-500 €.',
          hecho: false
        },
      ]
    },
    {
      id: 'oferta-arras', numero: 2, icono: '🤝',
      titulo: 'Oferta y Arras',
      descripcion: 'Formalizar el acuerdo y asegurar la operación con garantías',
      items: [
        {
          id: 'oferta-escrita', texto: 'Hacer oferta por escrito', obligatorio: false,
          descripcion: 'Una oferta escrita (email o carta) deja rastro y puede usarse como argumento de negociación.',
          hecho: false
        },
        {
          id: 'revision-juridica', texto: 'Revisión jurídica antes de firmar arras', obligatorio: true,
          descripcion: 'Un abogado debe revisar el contrato de arras antes de firmarlo. Cuesta 200-500 € pero protege tu señal.',
          hecho: false
        },
        {
          id: 'arras-penitenciales', texto: 'Negociar arras penitenciales (art. 1454 CC)', obligatorio: true,
          descripcion: 'Las arras penitenciales te permiten recuperar el doble si el vendedor incumple. Más protección que las confirmatorias.',
          hecho: false
        },
        {
          id: 'plazo-arras', texto: 'Fijar plazo de escritura en el contrato de arras', obligatorio: true,
          descripcion: 'Típicamente 60-90 días. Deja margen para la tasación bancaria y la aprobación hipotecaria.',
          hecho: false
        },
        {
          id: 'señal-pct', texto: 'Señal de arras entre el 5-10% del precio', obligatorio: false,
          descripcion: 'No des más del 10% de señal sin revisión jurídica completa del contrato.',
          hecho: false
        },
      ]
    },
    {
      id: 'hipoteca', numero: 3, icono: '🏦',
      titulo: 'Hipoteca y Financiación',
      descripcion: 'Conseguir la mejor hipoteca y preparar la firma notarial',
      items: [
        {
          id: 'comparar-hip', texto: 'Comparar al menos 3 ofertas hipotecarias', obligatorio: true,
          descripcion: 'Banco, broker hipotecario (Hipoo, iAhorro…) y cooperativa de crédito. Diferencias de 0.3% TAE son miles de euros.',
          hecho: false
        },
        {
          id: 'tasacion', texto: 'Tasación oficial bancaria', obligatorio: true,
          descripcion: 'El banco la encarga y la pagas tú (400-700 €). Puede diferir del precio de compra — es clave para el LTV.',
          hecho: false
        },
        {
          id: 'fein', texto: 'Recibir y revisar FEIN y FIAE', obligatorio: true,
          descripcion: 'Ficha Europea de Información Normalizada y Ficha de Advertencias Estandarizadas. Son documentos precontractuales obligatorios.',
          hecho: false
        },
        {
          id: 'acta-notarial', texto: 'Acta notarial de transparencia (10 días antes)', obligatorio: true,
          descripcion: 'Obligatorio: 10 días antes de firmar, el notario debe comprobar que entiendes las condiciones hipotecarias.',
          hecho: false
        },
        {
          id: 'seguro-hogar-hip', texto: 'Seguro de hogar (vinculado a hipoteca)', obligatorio: true,
          descripcion: 'El banco puede exigirlo. Compara ofertas externas — no estás obligado a contratar el del banco.',
          hecho: false
        },
      ]
    },
    {
      id: 'escritura', numero: 4, icono: '📋',
      titulo: 'Escritura y Registro',
      descripcion: 'La firma notarial y los trámites posteriores',
      items: [
        {
          id: 'escritura-compra', texto: 'Firma escritura de compraventa ante notario', obligatorio: true,
          descripcion: 'Tú eliges el notario (no el banco ni el vendedor). Reserva con antelación.',
          hecho: false
        },
        {
          id: 'itp-pago', texto: 'Pagar ITP/AJD en 30 días hábiles', obligatorio: true,
          descripcion: 'ITP (segunda mano) o AJD (nueva). Según CCAA: 6-10% del precio. Plazo máximo: 30 días hábiles desde escritura.',
          enlace: 'https://www.agenciatributaria.es', enlacelabel: 'AEAT',
          hecho: false
        },
        {
          id: 'inscripcion-registro', texto: 'Inscribir en el Registro de la Propiedad', obligatorio: true,
          descripcion: 'Hazlo cuanto antes. El notario puede gestionarlo. Sin inscripción, la compra no es oponible a terceros.',
          hecho: false
        },
        {
          id: 'plusvalia', texto: 'Plusvalía municipal', obligatorio: true,
          descripcion: 'La paga el vendedor (salvo pacto contrario). Verifica en el contrato quién la asume.',
          hecho: false
        },
      ]
    },
    {
      id: 'post-compra', numero: 5, icono: '🏠',
      titulo: 'Post-compra: Mudanza',
      descripcion: 'Los trámites una vez que la casa ya es tuya',
      items: [
        {
          id: 'suministros', texto: 'Cambiar titularidad de suministros', obligatorio: true,
          descripcion: 'Luz, gas, agua e internet. Hazlo antes de mudarte para evitar cortes.',
          hecho: false
        },
        {
          id: 'ibi', texto: 'Darse de alta en el IBI (Catastro)', obligatorio: true,
          descripcion: 'El IBI se prorratea entre comprador y vendedor el año de compra. Notifica al Ayuntamiento el cambio de titularidad.',
          hecho: false
        },
        {
          id: 'padron', texto: 'Empadronamiento en el nuevo domicilio', obligatorio: false,
          descripcion: 'Necesario para muchos trámites administrativos. Acude al Ayuntamiento con la escritura.',
          hecho: false
        },
        {
          id: 'seguro-hogar-fin', texto: 'Contratar seguro de hogar definitivo', obligatorio: true,
          descripcion: 'Si tienes hipoteca, asegúrate de que el importe cubre el valor de reconstrucción (no el de mercado).',
          hecho: false
        },
        {
          id: 'reforma', texto: 'Solicitar presupuestos de reforma (si aplica)', obligatorio: false,
          descripcion: 'Con las llaves en mano, es el momento de reformar antes de amueblar.',
          hecho: false
        },
        {
          id: 'comunidad', texto: 'Presentarse en la Comunidad de Propietarios', obligatorio: false,
          descripcion: 'Conoce las normas de comunidad, la cuota mensual exacta y si hay derrama pendiente.',
          hecho: false
        },
      ]
    },
  ]);

  // ─── Computed ────────────────────────────────────────────────────────────

  total = computed(() => this.fases().reduce((acc, f) => acc + f.items.length, 0));
  hechos = computed(() => this.fases().reduce((acc, f) => acc + f.items.filter(i => i.hecho).length, 0));
  pctGlobal = computed(() => this.total() > 0 ? Math.round((this.hechos() / this.total()) * 100) : 0);

  fasePct(fase: Fase): number {
    if (!fase.items.length) return 0;
    return Math.round((fase.items.filter(i => i.hecho).length / fase.items.length) * 100);
  }

  faseHechos(fase: Fase): number {
    return fase.items.filter(i => i.hecho).length;
  }

  faseNumClass(fase: Fase): string {
    const pct = this.fasePct(fase);
    if (pct === 100) return 'completa';
    if (pct > 0) return 'en-curso';
    return 'pendiente';
  }

  faseBarClass(fase: Fase): string {
    const pct = this.fasePct(fase);
    if (pct === 100) return 'bar-green';
    if (pct > 0) return 'bar-blue';
    return 'bar-gray';
  }

  // ─── Acciones ────────────────────────────────────────────────────────────

  toggleFase(id: string): void {
    this.faseActiva.set(this.faseActiva() === id ? null : id);
  }

  toggleItem(faseId: string, itemId: string): void {
    this.fases.update(fases =>
      fases.map(f =>
        f.id !== faseId ? f : {
          ...f,
          items: f.items.map(i => i.id !== itemId ? i : { ...i, hecho: !i.hecho })
        }
      )
    );
  }
}
