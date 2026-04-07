import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UrbiAUser } from '../models/auth.model';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'urbia_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  readonly currentUser = signal<UrbiAUser | null>(this._loadFromStorage());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  private _loadFromStorage(): UrbiAUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { ...parsed, registradoEn: new Date(parsed.registradoEn ?? parsed.creado_en) };
    } catch {
      return null;
    }
  }

  async login(email: string, nombre: string): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.post<{ id: number; email: string; nombre: string; creadoEn: string }>(
          `${environment.apiUrl}/auth/login`,
          { email, nombre }
        )
      );
      const user: UrbiAUser = { email: data.email, nombre: data.nombre, registradoEn: new Date(data.creadoEn) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      this.currentUser.set(user);
    } catch {
      // fallback local si la API no está disponible
      const user: UrbiAUser = { email, nombre, registradoEn: new Date() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      this.currentUser.set(user);
    }
  }

  async register(email: string, nombre: string): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.post<{ id: number; email: string; nombre: string; creadoEn: string }>(
          `${environment.apiUrl}/auth/registro`,
          { email, nombre }
        )
      );
      const user: UrbiAUser = { email: data.email, nombre: data.nombre, registradoEn: new Date(data.creadoEn) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      this.currentUser.set(user);
    } catch {
      const user: UrbiAUser = { email, nombre, registradoEn: new Date() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      this.currentUser.set(user);
    }
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUser.set(null);
  }
}
