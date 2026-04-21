import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CompararService {
  private _ids = signal<number[]>([]);

  readonly ids = this._ids.asReadonly();
  readonly count = computed(() => this._ids().length);

  add(id: number): void {
    if (this._ids().length >= 4) return;
    if (this._ids().includes(id)) return;
    this._ids.update(arr => [...arr, id]);
  }

  remove(id: number): void {
    this._ids.update(arr => arr.filter(x => x !== id));
  }

  has(id: number): boolean {
    return this._ids().includes(id);
  }

  clear(): void {
    this._ids.set([]);
  }
}
