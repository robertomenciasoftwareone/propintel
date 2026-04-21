import { Injectable, inject } from '@angular/core';
import { UrbiaBackendService } from './urbia-backend.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class MetricasService {
  private backend = inject(UrbiaBackendService);
  private auth = inject(AuthService);

  track(tipo: 'page_view' | 'busqueda' | 'ficha_vista', payload?: string): void {
    this.backend.enviarEvento({
      evento: tipo,
      userEmail: this.auth.currentUser()?.email,
      payloadJson: payload,
    }).subscribe({ error: () => {} }); // fire-and-forget: never throws
  }
}
