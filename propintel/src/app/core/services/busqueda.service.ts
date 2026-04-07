import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BusquedaFiltros, ResultadoBusqueda } from '../models/auth.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class BusquedaService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly filtrosActivos = signal<BusquedaFiltros | null>(null);
  readonly resultados = signal<ResultadoBusqueda[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  buscar(filtros: BusquedaFiltros): Promise<void> {
    this.filtrosActivos.set(filtros);
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams()
      .set('municipio', filtros.municipio);

    if (filtros.precioMaximo && filtros.precioMaximo > 0)
      params = params.set('precioMax', filtros.precioMaximo.toString());

    if (filtros.barrio) params = params.set('barrio', filtros.barrio);
    if (filtros.m2Min != null) params = params.set('m2Min', filtros.m2Min.toString());
    if (filtros.m2Max != null) params = params.set('m2Max', filtros.m2Max.toString());
    if (filtros.habitaciones != null) params = params.set('habitaciones', filtros.habitaciones.toString());
    if (filtros.banos != null) params = params.set('banos', filtros.banos.toString());
    if (filtros.exterior != null) params = params.set('exterior', filtros.exterior.toString());
    if (filtros.ascensor != null) params = params.set('ascensor', filtros.ascensor.toString());
    if (filtros.planta) params = params.set('planta', filtros.planta);

    const user = this.auth.currentUser();
    const headers: Record<string, string> = {};
    if (user) headers['X-User-Email'] = user.email;

    return new Promise((resolve, reject) => {
      this.http.get<ResultadoBusqueda[]>(`${environment.apiUrl}/busqueda`, { params, headers }).subscribe({
        next: (data) => {
          this.resultados.set(data);
          this.loading.set(false);
          resolve();
        },
        error: (err) => {
          console.error('Error en búsqueda:', err);
          this.error.set('No se pudieron cargar los resultados. Inténtalo de nuevo.');
          this.loading.set(false);
          reject(err);
        }
      });
    });
  }

  calcularSemaforo(precioM2: number, precioMedio: number): 'rojo' | 'amarillo' | 'verde' {
    if (precioMedio <= 0) return 'amarillo';
    if (precioM2 >= precioMedio * 1.05) return 'rojo';
    if (precioM2 >= precioMedio * 0.95) return 'amarillo';
    return 'verde';
  }

  limpiar(): void {
    this.resultados.set([]);
    this.filtrosActivos.set(null);
    this.error.set(null);
  }
}
