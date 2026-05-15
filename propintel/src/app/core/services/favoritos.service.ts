import { Injectable, signal, computed } from '@angular/core';
import { FavoritoSnapshot } from '../models/inmobiliario.model';

const STORAGE_KEY_V2 = 'urbia_favoritos_v2';
const STORAGE_KEY_V1 = 'urbia_favoritos_v1';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  readonly snapshots = signal<FavoritoSnapshot[]>(this.loadSnapshots());

  /** Backward-compat: array de IDs para isFavorito() */
  readonly favoritos = computed(() => this.snapshots().map(s => s.id));

  isFavorito(inmuebleId: number): boolean {
    return this.snapshots().some(s => s.id === inmuebleId);
  }

  /** Añade o quita un favorito. `data` solo se usa al añadir. */
  toggle(
    inmuebleId: number,
    data?: Partial<Omit<FavoritoSnapshot, 'id' | 'snapshotAt' | 'alertarBajadaPrecio' | 'alertarCambioSemaforo' | 'umbralBajada'>>,
  ): boolean {
    const current = this.snapshots();
    const exists = current.some(s => s.id === inmuebleId);

    if (exists) {
      const next = current.filter(s => s.id !== inmuebleId);
      this.snapshots.set(next);
      this.persist(next);
      return false;
    } else {
      const nuevo: FavoritoSnapshot = {
        id:                    inmuebleId,
        titulo:                data?.titulo               ?? null,
        precioTotal:           data?.precioTotal          ?? 0,
        precioM2:              data?.precioM2             ?? null,
        gapPct:                data?.gapPct               ?? null,
        notarialM2:            data?.notarialM2           ?? null,
        semaforoColor:         data?.semaforoColor        ?? null,
        distrito:              data?.distrito             ?? null,
        ciudad:                data?.ciudad               ?? '',
        url:                   data?.url                  ?? '',
        fuente:                data?.fuente               ?? '',
        snapshotAt:            new Date().toISOString(),
        alertarBajadaPrecio:   false,
        alertarCambioSemaforo: false,
        umbralBajada:          5,
      };
      const next = [...current, nuevo];
      this.snapshots.set(next);
      this.persist(next);
      return true;
    }
  }

  updateAlertaBool(id: number, field: 'alertarBajadaPrecio' | 'alertarCambioSemaforo', value: boolean): void {
    this.snapshots.update(list =>
      list.map(s => s.id === id ? { ...s, [field]: value } : s)
    );
    this.persist(this.snapshots());
  }

  updateUmbral(id: number, value: number): void {
    this.snapshots.update(list =>
      list.map(s => s.id === id ? { ...s, umbralBajada: value } : s)
    );
    this.persist(this.snapshots());
  }

  eliminar(id: number): void {
    const next = this.snapshots().filter(s => s.id !== id);
    this.snapshots.set(next);
    this.persist(next);
  }

  private persist(snapshots: FavoritoSnapshot[]): void {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(snapshots));
  }

  private loadSnapshots(): FavoritoSnapshot[] {
    try {
      // v2: snapshots completos
      const raw = localStorage.getItem(STORAGE_KEY_V2);
      if (raw) {
        const parsed = JSON.parse(raw) as FavoritoSnapshot[];
        return Array.isArray(parsed) ? parsed : [];
      }
      // Migración desde v1 (solo IDs)
      const v1 = localStorage.getItem(STORAGE_KEY_V1);
      if (v1) {
        const ids = JSON.parse(v1) as number[];
        if (Array.isArray(ids)) {
          return ids.filter(Number.isFinite).map(id => ({
            id,
            titulo: null, precioTotal: 0, precioM2: null,
            gapPct: null, notarialM2: null, semaforoColor: null,
            distrito: null, ciudad: '', url: '', fuente: '',
            snapshotAt: new Date().toISOString(),
            alertarBajadaPrecio: false, alertarCambioSemaforo: false,
            umbralBajada: 5,
          }));
        }
      }
      return [];
    } catch {
      return [];
    }
  }
}
