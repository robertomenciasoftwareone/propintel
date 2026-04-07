import { Injectable, inject, signal } from '@angular/core';
import { BusquedaFiltros } from '../models/auth.model';
import { UrbiaBackendService } from './urbia-backend.service';

interface AnalyticsState {
  firstVisitAt: string;
  visits: number;
  searches: number;
  searchPatterns: Record<string, number>;
  newsletterSubscriptions: number;
  registeredUsers: string[];
  consentAccepted: boolean;
}

const STORAGE_KEY = 'urbia_analytics_v1';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private backend = inject(UrbiaBackendService);

  readonly state = signal<AnalyticsState>(this.loadState());

  readonly sessionStart = Date.now();
  private sessionId = this.loadOrCreateSessionId();

  registerVisit(): void {
    this.update((s) => ({ ...s, visits: s.visits + 1 }));
    this.backend.enviarEvento({
      evento: 'visit',
      sessionId: this.sessionId
    }).subscribe({ error: () => void 0 });
  }

  trackSearch(filtros: BusquedaFiltros): void {
    const key = this.buildSearchPatternKey(filtros);
    this.update((s) => ({
      ...s,
      searches: s.searches + 1,
      searchPatterns: {
        ...s.searchPatterns,
        [key]: (s.searchPatterns[key] ?? 0) + 1
      }
    }));

    this.backend.enviarEvento({
      evento: 'busqueda',
      sessionId: this.sessionId,
      municipio: filtros.municipio,
      barrio: filtros.barrio,
      payloadJson: JSON.stringify({
        precioMaximo: filtros.precioMaximo,
        m2Min: filtros.m2Min,
        habitaciones: filtros.habitaciones,
        banos: filtros.banos
      })
    }).subscribe({ error: () => void 0 });
  }

  trackNewsletterSubscription(): void {
    this.update((s) => ({
      ...s,
      newsletterSubscriptions: s.newsletterSubscriptions + 1
    }));

    this.backend.enviarEvento({
      evento: 'newsletter',
      sessionId: this.sessionId
    }).subscribe({ error: () => void 0 });
  }

  trackRegistration(email: string): void {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    this.update((s) => {
      if (s.registeredUsers.includes(normalized)) {
        return s;
      }
      return {
        ...s,
        registeredUsers: [...s.registeredUsers, normalized]
      };
    });

    this.backend.enviarEvento({
      evento: 'registro',
      sessionId: this.sessionId,
      userEmail: normalized
    }).subscribe({ error: () => void 0 });
  }

  setConsentAccepted(): void {
    this.update((s) => ({ ...s, consentAccepted: true }));
  }

  estimatedTimeOnSiteSeconds(): number {
    return Math.max(1, Math.floor((Date.now() - this.sessionStart) / 1000));
  }

  private buildSearchPatternKey(filtros: BusquedaFiltros): string {
    const municipio = filtros.municipio?.toLowerCase() ?? 'madrid';
    const barrio = filtros.barrio?.trim().toLowerCase() || 'sin-barrio';
    const rooms = filtros.habitaciones ?? 'any';
    return `${municipio}|${barrio}|hab:${rooms}`;
  }

  private loadState(): AnalyticsState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.defaultState();
      const parsed = JSON.parse(raw) as Partial<AnalyticsState>;
      return {
        firstVisitAt: parsed.firstVisitAt ?? new Date().toISOString(),
        visits: parsed.visits ?? 0,
        searches: parsed.searches ?? 0,
        searchPatterns: parsed.searchPatterns ?? {},
        newsletterSubscriptions: parsed.newsletterSubscriptions ?? 0,
        registeredUsers: parsed.registeredUsers ?? [],
        consentAccepted: parsed.consentAccepted ?? false
      };
    } catch {
      return this.defaultState();
    }
  }

  private defaultState(): AnalyticsState {
    return {
      firstVisitAt: new Date().toISOString(),
      visits: 0,
      searches: 0,
      searchPatterns: {},
      newsletterSubscriptions: 0,
      registeredUsers: [],
      consentAccepted: false
    };
  }

  private loadOrCreateSessionId(): string {
    const key = 'urbia_session_id_v1';
    const current = localStorage.getItem(key);
    if (current) return current;

    const generated = (crypto?.randomUUID?.() ?? `sess-${Date.now()}-${Math.round(Math.random() * 1e6)}`);
    localStorage.setItem(key, generated);
    return generated;
  }

  private update(mutator: (state: AnalyticsState) => AnalyticsState): void {
    const next = mutator(this.state());
    this.state.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}