import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'urbia_favoritos_v1';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  readonly favoritos = signal<number[]>(this.loadIds());

  isFavorito(inmuebleId: number): boolean {
    return this.favoritos().includes(inmuebleId);
  }

  toggle(inmuebleId: number): boolean {
    const current = this.favoritos();
    const exists = current.includes(inmuebleId);
    const next = exists
      ? current.filter((id) => id !== inmuebleId)
      : [...current, inmuebleId];

    this.favoritos.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return !exists;
  }

  private loadIds(): number[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as number[];
      return Array.isArray(parsed) ? parsed.filter((v) => Number.isFinite(v)) : [];
    } catch {
      return [];
    }
  }
}