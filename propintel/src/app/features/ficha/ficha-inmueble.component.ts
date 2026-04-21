import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe, NgClass, UpperCasePipe, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import { AnuncioDetalle, CatastroResult, CatastroFicha, ValorReferencia, EstimacionAvm } from '../../core/models/inmobiliario.model';
import { environment } from '../../../environments/environment';
import { MacroContextoComponent } from '../../shared/components/macro-contexto.component';

interface GeminiZoneAnalysis {
  calidad_zona: string;
  score: number;
  transporte: string[];
  puntos_interes: string[];
  resumen: string;
  pros: string[];
  contras: string[];
}

interface GeminiPhotoAnalysis {
  exterior: boolean;
  luminosidad: string;   // 'Muy luminoso' | 'Luminoso' | 'Normal' | 'Oscuro'
  estado: string;        // 'Excelente' | 'Bueno' | 'Regular' | 'Malo'
  calidad: string;       // 'Premium' | 'Alta' | 'Media' | 'Básica'
  descripcion: string;
  puntuacion: number;    // 0-10
  caracteristicas: string[];
}

@Component({
  selector: 'app-ficha-inmueble',
  standalone: true,
  imports: [DecimalPipe, DatePipe, NgClass, RouterLink, MacroContextoComponent],
  template: `
    <div class="page">

      <!-- TOP BAR -->
      <div class="topbar">
        <a routerLink="/mapa-resultados" class="back-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Volver al mapa
        </a>
        @if (detalle(); as d) {
          <span class="fuente-chip" [ngClass]="d.fuente">{{ d.fuente }}</span>
        }
      </div>

      @if (loading()) {
        <div class="state-center">
          <div class="spinner"></div>
          <p>Cargando ficha del inmueble…</p>
        </div>
      }

      @if (error()) {
        <div class="state-center">
          <div class="error-icon">⚠️</div>
          <p>{{ error() }}</p>
          <a routerLink="/mapa-resultados" class="btn-ghost">Volver al mapa</a>
        </div>
      }

      @if (detalle(); as d) {

        <!-- ══════════════════════════════════════════════════════════════════
             LAYER 1 — SIMPLE VERDICT HERO
        ══════════════════════════════════════════════════════════════════ -->
        <div class="verdict-hero" [ngClass]="verdictColor(d)">
          <div class="verdict-left">
            <div class="verdict-badge">
              <span class="verdict-dot"></span>
              {{ verdictLabel(d) }}
            </div>
            <div class="verdict-pct">{{ verdictPctText(d) }}</div>
            <p class="verdict-sub">{{ verdictSub(d) }}</p>
          </div>
          <div class="verdict-right">
            <div class="verdict-key-price">
              <span class="vkp-label">Precio pedido</span>
              <span class="vkp-value">{{ d.precioTotal | number:'1.0-0':'es-ES' }} €</span>
            </div>
            @if (avm(); as est) {
              <div class="verdict-key-price">
                <span class="vkp-label">Estimado AVM</span>
                <span class="vkp-value avm-v">{{ est.precioEstimado | number:'1.0-0':'es-ES' }} €</span>
              </div>
            } @else if (d.notarialMedioM2 && d.superficieM2) {
              <div class="verdict-key-price">
                <span class="vkp-label">Precio notarial estimado</span>
                <span class="vkp-value not-v">{{ (d.notarialMedioM2 * d.superficieM2) | number:'1.0-0':'es-ES' }} €</span>
              </div>
            }
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════
             LAYER 2 — DECISION: PRICE COMPARISON TABLE
        ══════════════════════════════════════════════════════════════════ -->
        <div class="layer2-card">
          <div class="l2-title">
            <span class="section-icon">⚖️</span>
            Análisis de precio comparado
          </div>
          <div class="l2-grid">

            <!-- Portal asking price -->
            <div class="l2-col">
              <div class="l2-col-header">
                <span class="l2-source-dot portal-dot"></span>
                <span class="l2-source">Precio pedido</span>
              </div>
              <div class="l2-price">{{ d.precioTotal | number:'1.0-0':'es-ES' }} €</div>
              <div class="l2-price-m2">{{ d.precioM2 | number:'1.0-0':'es-ES' }} €/m²</div>
              <div class="l2-sub">{{ d.fuente }}</div>
            </div>

            <!-- Notarial -->
            @if (d.notarialMedioM2) {
              <div class="l2-col">
                <div class="l2-col-header">
                  <span class="l2-source-dot notarial-dot"></span>
                  <span class="l2-source">Precio notarial</span>
                </div>
                <div class="l2-price">
                  @if (d.superficieM2) {
                    {{ (d.notarialMedioM2 * d.superficieM2) | number:'1.0-0':'es-ES' }} €
                  } @else { N/D }
                </div>
                <div class="l2-price-m2">{{ d.notarialMedioM2 | number:'1.0-0':'es-ES' }} €/m²</div>
                <div class="l2-sub">Registro notarial · {{ d.notarialPeriodo }}</div>
              </div>
              <!-- Gap badge -->
              <div class="l2-gap-badge" [ngClass]="getGapClass(d.gapPct)">
                <div class="l2-gap-label">Gap asking/notarial</div>
                <div class="l2-gap-pct">{{ (d.gapPct ?? 0) > 0 ? '+' : '' }}{{ d.gapPct | number:'1.1-1':'es-ES' }}%</div>
              </div>
            }

            <!-- AVM -->
            @if (avm(); as est) {
              <div class="l2-col">
                <div class="l2-col-header">
                  <span class="l2-source-dot avm-dot"></span>
                  <span class="l2-source">Estimación AVM</span>
                </div>
                <div class="l2-price">{{ est.precioEstimado | number:'1.0-0':'es-ES' }} €</div>
                <div class="l2-price-m2">
                  @if (d.superficieM2) {
                    {{ (est.precioEstimado / d.superficieM2) | number:'1.0-0':'es-ES' }} €/m²
                  }
                </div>
                <div class="l2-sub">IA · {{ est.comparablesUsados }} comparables</div>
              </div>
              <!-- AVM gap badge -->
              <div class="l2-gap-badge" [ngClass]="difVrefClass(d.precioTotal, est.precioEstimado)">
                <div class="l2-gap-label">Gap asking/AVM</div>
                <div class="l2-gap-pct">
                  {{ difAvmPct(d.precioTotal, est.precioEstimado) > 0 ? '+' : '' }}{{ difAvmPct(d.precioTotal, est.precioEstimado) | number:'1.1-1':'es-ES' }}%
                </div>
              </div>
            } @else if (avmLoading()) {
              <div class="l2-col l2-loading">
                <div class="spinner-sm"></div>
                <span>Calculando AVM…</span>
              </div>
            }

          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════
             LAYER 3 — EXPERT DATA (collapsible sections)
        ══════════════════════════════════════════════════════════════════ -->

        <!-- Property meta (portal) -->
        <div class="expert-card">
          <div class="expert-header">
            <div class="expert-title">
              <span class="section-icon">🏠</span>
              Datos del portal
            </div>
            @if (d.url) {
              <a [href]="d.url" target="_blank" rel="noopener noreferrer" class="btn-portal">
                Ver en {{ d.fuente }} ↗
              </a>
            }
          </div>
          <div class="data-grid">
            <div class="dato">
              <div class="dato-label">TIPO</div>
              <div class="dato-value">{{ d.tipoInmueble ?? '—' }}</div>
            </div>
            <div class="dato">
              <div class="dato-label">SUPERFICIE</div>
              <div class="dato-value">{{ d.superficieM2 | number:'1.0-0':'es-ES' }} m²</div>
            </div>
            <div class="dato">
              <div class="dato-label">HABITACIONES</div>
              <div class="dato-value">{{ d.habitaciones ?? '—' }}</div>
            </div>
            <div class="dato">
              <div class="dato-label">CIUDAD</div>
              <div class="dato-value">{{ d.ciudad }}</div>
            </div>
            <div class="dato">
              <div class="dato-label">DISTRITO / ZONA</div>
              <div class="dato-value">{{ d.distrito ?? '—' }}</div>
            </div>
            <div class="dato">
              <div class="dato-label">FECHA SCRAPING</div>
              <div class="dato-value">{{ d.fechaScraping | date:'d MMM yyyy':'':'es-ES' }}</div>
            </div>
          </div>
        </div>

        <!-- Notarial detail -->
        @if (d.notarialMedioM2) {
          <div class="expert-card">
            <div class="expert-header">
              <div class="expert-title">
                <span class="section-icon">📋</span>
                Datos notariales
                @if (d.notarialPeriodo) {
                  <span class="period-badge">{{ d.notarialPeriodo }}</span>
                }
              </div>
            </div>
            <div class="data-grid">
              <div class="dato">
                <div class="dato-label">PRECIO MEDIO NOTARIAL</div>
                <div class="dato-value green-val">{{ d.notarialMedioM2 | number:'1.0-0':'es-ES' }} €/m²</div>
              </div>
              <div class="dato">
                <div class="dato-label">RANGO NOTARIAL</div>
                <div class="dato-value">{{ d.notarialMinM2 | number:'1.0-0':'es-ES' }} – {{ d.notarialMaxM2 | number:'1.0-0':'es-ES' }} €/m²</div>
              </div>
              <div class="dato">
                <div class="dato-label">GAP ASKING VS NOTARIAL</div>
                <div class="dato-value" [ngClass]="getGapClass(d.gapPct)">
                  {{ (d.gapPct ?? 0) > 0 ? '+' : '' }}{{ d.gapPct | number:'1.1-1':'es-ES' }}%
                </div>
              </div>
              <div class="dato">
                <div class="dato-label">Nº TRANSACCIONES</div>
                <div class="dato-value">{{ d.numTransacciones ?? '—' }}</div>
              </div>
            </div>
            <!-- Bar chart -->
            <div class="gap-bar-wrap">
              <div class="gap-bar-row">
                <span class="gap-bar-label green-label">Notarial: {{ d.notarialMedioM2 | number:'1.0-0':'es-ES' }} €/m²</span>
                <span class="gap-bar-label blue-label">Asking: {{ d.precioM2 | number:'1.0-0':'es-ES' }} €/m²</span>
              </div>
              <div class="gap-track">
                <div class="gap-fill" [style.width.%]="getNotarialBarWidth(d)"></div>
              </div>
              <div class="gap-bar-pct" [ngClass]="getGapClass(d.gapPct)">
                {{ (d.gapPct ?? 0) > 0 ? '+' : '' }}{{ d.gapPct | number:'1.1-1':'es-ES' }}% sobrevalorado
              </div>
            </div>
          </div>
        }

        <!-- Valor referencia AEAT -->
        @if (valorRef()) {
          <div class="expert-card">
            <div class="expert-header">
              <div class="expert-title">
                <span class="section-icon">📜</span>
                Valor de Referencia AEAT {{ valorRef()!.anno }}
              </div>
            </div>
            @if (valorRef()!.valorReferencia) {
              <div class="data-grid">
                <div class="dato">
                  <div class="dato-label">VALOR DE REFERENCIA</div>
                  <div class="dato-value purple-val">{{ valorRef()!.valorReferencia | number:'1.0-0':'es-ES' }} €</div>
                </div>
                @if (d.precioTotal) {
                  <div class="dato">
                    <div class="dato-label">PRECIO ASKING</div>
                    <div class="dato-value">{{ d.precioTotal | number:'1.0-0':'es-ES' }} €</div>
                  </div>
                  <div class="dato">
                    <div class="dato-label">DIFERENCIA VS REF.</div>
                    <div class="dato-value" [ngClass]="difVrefClass(d.precioTotal, valorRef()!.valorReferencia!)">
                      {{ difVref(d.precioTotal, valorRef()!.valorReferencia!) | number:'1.0-0':'es-ES' }} €
                      ({{ difVrefPct(d.precioTotal, valorRef()!.valorReferencia!) | number:'1.1-1':'es-ES' }}%)
                    </div>
                  </div>
                }
              </div>
              <p class="data-note">Base de cotización para ITP y AJD (AEAT). Por encima = posible sobreprecio fiscal.</p>
            } @else {
              <p class="no-data">{{ valorRef()!.mensaje }}</p>
            }
          </div>
        }

        <!-- AVM detail -->
        <div class="expert-card">
          <div class="expert-header">
            <div class="expert-title">
              <span class="section-icon">🤖</span>
              Valoración automática
            </div>
            @if (!avmLoading() && !avm()) {
              <button class="btn-calcular" (click)="calcularAvm(d)">Calcular estimación</button>
            }
          </div>

          @if (avmLoading()) {
            <div class="loading-inline"><div class="spinner-sm"></div> Calculando estimación de valor…</div>
          } @else if (avm(); as est) {
            <div class="avm-hero">
              <div class="avm-col">
                <div class="dato-label">VALOR ESTIMADO</div>
                <div class="avm-price">{{ est.precioEstimado | number:'1.0-0':'es-ES' }} €</div>
              </div>
              <div class="avm-col">
                <div class="dato-label">RANGO FIABLE</div>
                <div class="avm-range">{{ est.rangoMin | number:'1.0-0':'es-ES' }} — {{ est.rangoMax | number:'1.0-0':'es-ES' }} €</div>
              </div>
              @if (d.precioTotal) {
                <div class="avm-col">
                  <div class="dato-label">DIF. VS ASKING</div>
                  <div class="avm-dif" [class.red-val]="d.precioTotal > est.precioEstimado" [class.green-val]="d.precioTotal <= est.precioEstimado">
                    {{ difAvm(d.precioTotal, est.precioEstimado) | number:'1.0-0':'es-ES' }} €
                    ({{ difAvmPct(d.precioTotal, est.precioEstimado) | number:'1.1-1':'es-ES' }}%)
                  </div>
                </div>
              }
            </div>
            <p class="data-note">{{ est.metodologia }}</p>

            @if (est.comparables.length > 0) {
              <div class="comparables-section">
                <div class="comparables-title">Comparables utilizados ({{ est.comparablesUsados }})</div>
                @for (c of est.comparables; track c.id) {
                  <div class="comp-row">
                    <span class="comp-price">{{ c.precioM2 | number:'1.0-0':'es-ES' }} €/m²</span>
                    <span class="comp-meta">
                      @if (c.superficieM2) { {{ c.superficieM2 | number:'1.0-0':'es-ES' }} m² · }
                      @if (c.habitaciones) { {{ c.habitaciones }} hab · }
                      {{ c.fuente }}
                      @if (c.distanciaM > 0) { · {{ c.distanciaM | number:'1.0-0':'es-ES' }}m }
                    </span>
                    <a [href]="c.url" target="_blank" class="comp-link">Ver →</a>
                  </div>
                }
              </div>
            }
          } @else {
            <div class="avm-cta">
              <p>Estimación AVM basada en comparables reales de mercado y datos notariales de la zona.</p>
              <button class="btn-calcular" (click)="calcularAvm(d)">Calcular ahora</button>
            </div>
          }
        </div>

        <!-- ══════════════════════════════════════════════════════════════════
             GEMINI — ANÁLISIS DE ZONA IA
        ══════════════════════════════════════════════════════════════════ -->
        @if (geminiLoading()) {
          <div class="expert-card gemini-card">
            <div class="expert-header">
              <div class="expert-title">
                <span class="section-icon">✨</span>
                Análisis de Zona IA
                <span class="gemini-badge">Gemini</span>
              </div>
            </div>
            <div class="loading-inline"><div class="spinner-sm"></div> Analizando la zona con Gemini…</div>
          </div>
        } @else if (geminiAnalysis(); as g) {
          <div class="expert-card gemini-card">
            <div class="expert-header">
              <div class="expert-title">
                <span class="section-icon">✨</span>
                Análisis de Zona IA
                <span class="gemini-badge">Gemini</span>
              </div>
              <div class="gemini-score" [ngClass]="geminiScoreClass(g.score)">
                <span class="gemini-score-num">{{ g.score }}/10</span>
                <span class="gemini-score-label">{{ g.calidad_zona }}</span>
              </div>
            </div>
            <p class="gemini-resumen">{{ g.resumen }}</p>
            @if (g.transporte.length > 0) {
              <div class="gemini-section">
                <div class="gemini-section-title">🚇 Transporte</div>
                <div class="gemini-chips">
                  @for (t of g.transporte; track t) {
                    <span class="gemini-chip">{{ t }}</span>
                  }
                </div>
              </div>
            }
            @if (g.puntos_interes.length > 0) {
              <div class="gemini-section">
                <div class="gemini-section-title">📍 Puntos de interés</div>
                <div class="gemini-chips">
                  @for (p of g.puntos_interes; track p) {
                    <span class="gemini-chip gemini-chip-poi">{{ p }}</span>
                  }
                </div>
              </div>
            }
            <div class="gemini-pros-contras">
              <div class="gemini-pros">
                <div class="gemini-section-title">✅ Pros</div>
                @for (pro of g.pros; track pro) {
                  <div class="gemini-item">{{ pro }}</div>
                }
              </div>
              <div class="gemini-contras">
                <div class="gemini-section-title">⚠️ Contras</div>
                @for (con of g.contras; track con) {
                  <div class="gemini-item">{{ con }}</div>
                }
              </div>
            </div>
            <p class="data-note gemini-note">Análisis generativo basado en conocimiento general. Verifica siempre in situ.</p>
          </div>
        } @else if (geminiError()) {
          <div class="expert-card gemini-card gemini-error-card">
            <div class="expert-header">
              <div class="expert-title">
                <span class="section-icon">✨</span>
                Análisis de Zona IA
                <span class="gemini-badge">Gemini</span>
              </div>
            </div>
            <p class="gemini-error-msg">⚠️ No se pudo obtener el análisis: <em>{{ geminiError() }}</em></p>
            <button class="gemini-retry-btn" (click)="reintentarGemini()">Reintentar</button>
          </div>
        }

        <!-- ══════════════════════════════════════════════════════════════════
             GEMINI — ANÁLISIS DE FOTOS IA
        ══════════════════════════════════════════════════════════════════ -->
        @if (d.fotoPrincipal) {
          @if (geminiPhotoLoading()) {
            <div class="expert-card gemini-card">
              <div class="expert-header">
                <div class="expert-title">
                  <span class="section-icon">📸</span>
                  Análisis de Fotos IA
                  <span class="gemini-badge">Gemini Vision</span>
                </div>
              </div>
              <div class="loading-inline"><div class="spinner-sm"></div> Analizando la foto con Gemini Vision…</div>
            </div>
          } @else if (geminiPhotoAnalysis(); as ph) {
            <div class="expert-card gemini-card">
              <div class="expert-header">
                <div class="expert-title">
                  <span class="section-icon">📸</span>
                  Análisis de Fotos IA
                  <span class="gemini-badge">Gemini Vision</span>
                </div>
                <div class="gemini-score" [ngClass]="geminiScoreClass(ph.puntuacion)">
                  <span class="gemini-score-num">{{ ph.puntuacion }}/10</span>
                  <span class="gemini-score-label">{{ ph.calidad }}</span>
                </div>
              </div>
              <p class="gemini-resumen">{{ ph.descripcion }}</p>
              <div class="photo-meta-row">
                <div class="photo-meta-item">
                  <span class="photo-meta-label">Tipo</span>
                  <span class="photo-meta-value">{{ ph.exterior ? 'Exterior' : 'Interior' }}</span>
                </div>
                <div class="photo-meta-item">
                  <span class="photo-meta-label">Luminosidad</span>
                  <span class="photo-meta-value">{{ ph.luminosidad }}</span>
                </div>
                <div class="photo-meta-item">
                  <span class="photo-meta-label">Estado</span>
                  <span class="photo-meta-value">{{ ph.estado }}</span>
                </div>
              </div>
              @if (ph.caracteristicas.length > 0) {
                <div class="gemini-section">
                  <div class="gemini-section-title">🏠 Características detectadas</div>
                  <div class="gemini-chips">
                    @for (c of ph.caracteristicas; track c) {
                      <span class="gemini-chip">{{ c }}</span>
                    }
                  </div>
                </div>
              }
              <p class="data-note gemini-note">Análisis basado en la foto principal del anuncio. Solo una foto puede ser representativa.</p>
            </div>
          }
        }

        <!-- ══════════════════════════════════════════════════════════════════
             CONTEXTO MACRO — IPV / Hipotecas / Tipo interés
        ══════════════════════════════════════════════════════════════════ -->
        <app-macro-contexto />

      }
    </div>
  `,
  styles: [`
    /* ── PAGE ────────────────────────── */
    .page {
      padding: 24px 32px;
      max-width: 900px;
      margin: 0 auto;
      font-family: 'Inter', sans-serif;
    }

    /* TOP BAR */
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px;
    }
    .back-btn {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 13px; font-weight: 600; color: #6B7280;
      text-decoration: none;
      padding: 7px 14px; border-radius: 8px; border: 1px solid #E5E7EB;
      transition: background .15s, color .15s;
    }
    .back-btn:hover { background: #F9FAFB; color: #374151; }
    .fuente-chip {
      padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700;
      letter-spacing: .06em; text-transform: uppercase;
    }
    .fuente-chip.fotocasa { background: #FEF3C7; color: #D97706; }
    .fuente-chip.idealista { background: #D1FAE5; color: #059669; }

    /* STATE SCREENS */
    .state-center {
      text-align: center; padding: 80px 0;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      color: #6B7280;
    }
    .error-icon { font-size: 32px; }
    .btn-ghost {
      display: inline-block; padding: 8px 20px; border-radius: 8px;
      border: 1px solid #E5E7EB; font-size: 13px; font-weight: 600; color: #374151;
      text-decoration: none; transition: background .15s;
    }
    .btn-ghost:hover { background: #F9FAFB; }

    /* ── LAYER 1: VERDICT HERO ───────── */
    .verdict-hero {
      border-radius: 16px; padding: 28px 28px;
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px; gap: 20px;
    }
    .verdict-hero.green-verdict { background: #F0FDF4; border: 1.5px solid #BBF7D0; }
    .verdict-hero.yellow-verdict { background: #FFFBEB; border: 1.5px solid #FDE68A; }
    .verdict-hero.red-verdict { background: #FEF2F2; border: 1.5px solid #FECACA; }
    .verdict-hero.neutral-verdict { background: #F9FAFB; border: 1.5px solid #E5E7EB; }

    .verdict-left { display: flex; flex-direction: column; gap: 6px; }
    .verdict-badge {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 700;
    }
    .green-verdict .verdict-badge { color: #15803D; }
    .yellow-verdict .verdict-badge { color: #D97706; }
    .red-verdict .verdict-badge { color: #B91C1C; }
    .neutral-verdict .verdict-badge { color: #374151; }
    .verdict-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    }
    .green-verdict .verdict-dot { background: #16A34A; box-shadow: 0 0 0 3px #BBF7D0; }
    .yellow-verdict .verdict-dot { background: #F59E0B; box-shadow: 0 0 0 3px #FDE68A; }
    .red-verdict .verdict-dot { background: #DC2626; box-shadow: 0 0 0 3px #FECACA; }
    .neutral-verdict .verdict-dot { background: #9CA3AF; }

    .verdict-pct {
      font-size: 44px; font-weight: 900; letter-spacing: -0.05em; line-height: 1;
    }
    .green-verdict .verdict-pct { color: #15803D; }
    .yellow-verdict .verdict-pct { color: #D97706; }
    .red-verdict .verdict-pct { color: #B91C1C; }
    .neutral-verdict .verdict-pct { color: #374151; }

    .verdict-sub { font-size: 13px; color: #6B7280; max-width: 280px; line-height: 1.5; margin: 0; }

    .verdict-right {
      display: flex; flex-direction: column; gap: 14px; text-align: right;
    }
    .verdict-key-price { display: flex; flex-direction: column; gap: 3px; }
    .vkp-label { font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: .06em; }
    .vkp-value { font-size: 20px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.03em; }
    .avm-v { color: #2563EB; }
    .not-v { color: #16A34A; }

    /* ── LAYER 2: PRICE COMPARISON ──── */
    .layer2-card {
      background: #fff; border: 1px solid #E5E7EB; border-radius: 14px;
      padding: 20px 24px; margin-bottom: 16px;
    }
    .l2-title {
      font-size: 14px; font-weight: 600; color: #1A1A1A;
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 16px;
    }
    .section-icon { font-size: 16px; }
    .l2-grid {
      display: flex; gap: 0; align-items: stretch;
      border: 1px solid #F3F4F6; border-radius: 10px; overflow: hidden;
    }
    .l2-col {
      flex: 1; padding: 16px;
      border-right: 1px solid #F3F4F6;
      display: flex; flex-direction: column; gap: 4px;
    }
    .l2-col:last-child { border-right: none; }
    .l2-col-header { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
    .l2-source-dot { width: 7px; height: 7px; border-radius: 50%; }
    .portal-dot { background: #2563EB; }
    .notarial-dot { background: #16A34A; }
    .avm-dot { background: #8B5CF6; }
    .l2-source { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #9CA3AF; }
    .l2-price { font-size: 18px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.03em; }
    .l2-price-m2 { font-size: 11px; color: #6B7280; }
    .l2-sub { font-size: 10px; color: #9CA3AF; }
    .l2-gap-badge {
      display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px;
      padding: 14px 16px; min-width: 80px;
      border-right: 1px solid #F3F4F6;
    }
    .l2-gap-badge:last-child { border-right: none; }
    .l2-gap-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #9CA3AF; }
    .l2-gap-pct { font-size: 18px; font-weight: 800; }
    .l2-gap-badge.gap-high .l2-gap-pct { color: #DC2626; }
    .l2-gap-badge.gap-med .l2-gap-pct { color: #D97706; }
    .l2-gap-badge.gap-low .l2-gap-pct { color: #16A34A; }
    .l2-loading {
      display: flex; flex-direction: row; align-items: center; gap: 10px;
      color: #9CA3AF; font-size: 12px;
    }

    /* ── LAYER 3: EXPERT CARDS ───────── */
    .expert-card {
      background: #fff; border: 1px solid #E5E7EB; border-radius: 14px;
      padding: 20px 24px; margin-bottom: 12px;
    }
    .expert-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 18px;
    }
    .expert-title {
      font-size: 14px; font-weight: 600; color: #1A1A1A;
      display: flex; align-items: center; gap: 8px;
    }
    .period-badge {
      padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600;
      background: #D1FAE5; color: #059669;
    }

    .btn-portal {
      padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
      text-decoration: none; background: #2563EB; color: #fff; transition: background .15s;
    }
    .btn-portal:hover { background: #1D4ED8; }
    .btn-secondary {
      display: inline-block; padding: 6px 14px; border-radius: 8px; font-size: 12px;
      font-weight: 600; text-decoration: none;
      background: #F9FAFB; color: #374151;
      border: 1px solid #E5E7EB;
      transition: background .15s;
    }
    .btn-secondary:hover { background: #F3F4F6; }
    .btn-calcular {
      padding: 7px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;
      background: #EFF6FF; color: #2563EB;
      border: 1px solid #BFDBFE; cursor: pointer; transition: background .15s;
    }
    .btn-calcular:hover { background: #DBEAFE; }

    /* ── DATA GRID ───────────────────── */
    .data-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px;
    }
    .dato { display: flex; flex-direction: column; gap: 3px; }
    .dato-wide { grid-column: span 2; }
    .dato-label {
      font-size: 10px; font-weight: 700; letter-spacing: .06em; color: #9CA3AF;
    }
    .dato-value { font-size: 15px; font-weight: 600; color: #1A1A1A; }
    .dato-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .dato-value.green-val { color: #16A34A; }
    .dato-value.red-val { color: #DC2626; }
    .dato-value.purple-val { color: #7C3AED; }
    .gap-high { color: #DC2626 !important; }
    .gap-med  { color: #D97706 !important; }
    .gap-low  { color: #16A34A !important; }

    /* GAP BAR */
    .gap-bar-wrap {
      margin-top: 18px; padding: 14px 16px;
      background: #F9FAFB; border-radius: 10px; border: 1px solid #F3F4F6;
    }
    .gap-bar-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .gap-bar-label { font-size: 11px; font-weight: 600; }
    .green-label { color: #16A34A; }
    .blue-label { color: #2563EB; }
    .gap-track {
      height: 8px; border-radius: 4px; background: #2563EB; position: relative; overflow: hidden;
    }
    .gap-fill {
      position: absolute; left: 0; top: 0; height: 100%;
      background: #16A34A; border-radius: 4px 0 0 4px;
    }
    .gap-bar-pct { text-align: right; font-size: 12px; font-weight: 700; margin-top: 6px; }

    /* AVM HERO */
    .avm-hero {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
      background: #F9FAFB; border-radius: 10px; padding: 16px; margin-bottom: 12px;
      border: 1px solid #F3F4F6;
    }
    .avm-col { display: flex; flex-direction: column; gap: 4px; }
    .avm-price { font-size: 24px; font-weight: 800; color: #2563EB; letter-spacing: -0.04em; }
    .avm-range { font-size: 13px; font-weight: 600; color: #374151; }
    .avm-dif { font-size: 16px; font-weight: 700; }

    /* Comparables */
    .comparables-section { }
    .comparables-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
      color: #9CA3AF; margin-bottom: 8px; margin-top: 4px;
    }
    .comp-row {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 0; border-bottom: 1px solid #F3F4F6;
    }
    .comp-row:last-child { border-bottom: none; }
    .comp-price { font-size: 13px; font-weight: 700; color: #1A1A1A; min-width: 90px; }
    .comp-meta { font-size: 11px; color: #9CA3AF; flex: 1; }
    .comp-link { font-size: 11px; color: #2563EB; text-decoration: none; white-space: nowrap; }
    .comp-link:hover { text-decoration: underline; }

    .avm-cta { text-align: center; padding: 12px 0; }
    .avm-cta p { font-size: 13px; color: #6B7280; margin: 0 0 12px; }

    /* Catastro */
    .catastro-item { padding: 12px 0; }
    .catastro-item:not(:last-child) { border-bottom: 1px solid #F3F4F6; }

    /* Misc */
    .no-data { font-size: 13px; color: #9CA3AF; padding: 8px 0; }
    .data-note { font-size: 11.5px; color: #9CA3AF; font-style: italic; margin: 4px 0 0; }
    .loading-inline { display: flex; align-items: center; gap: 10px; color: #9CA3AF; font-size: 13px; padding: 12px 0; }

    .spinner {
      width: 32px; height: 32px; margin: 0 auto 4px;
      border: 3px solid #E5E7EB; border-top-color: #2563EB;
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    .spinner-sm {
      width: 16px; height: 16px; flex-shrink: 0;
      border: 2px solid #E5E7EB; border-top-color: #2563EB;
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Gemini Zone Analysis ──── */
    .gemini-card { border-color: #EDE9FE; background: linear-gradient(135deg, #FAFAFF 0%, #F5F3FF 100%); }
    .gemini-error-card { border-color: #FCA5A5; background: #FFF5F5; }
    .gemini-error-msg { font-size: 13px; color: #B91C1C; margin: 8px 0 12px; }
    .gemini-retry-btn {
      font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px;
      border: 1px solid #7C3AED; background: transparent; color: #7C3AED;
      cursor: pointer;
    }
    .gemini-retry-btn:hover { background: #7C3AED; color: #fff; }
    .gemini-badge {
      padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700;
      letter-spacing: .06em; text-transform: uppercase;
      background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff;
    }
    .gemini-score {
      display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
    }
    .gemini-score-num { font-size: 20px; font-weight: 800; letter-spacing: -0.04em; }
    .gemini-score-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    .score-high .gemini-score-num, .score-high .gemini-score-label { color: #16A34A; }
    .score-med  .gemini-score-num, .score-med  .gemini-score-label { color: #D97706; }
    .score-low  .gemini-score-num, .score-low  .gemini-score-label { color: #DC2626; }
    .gemini-resumen { font-size: 13.5px; line-height: 1.6; color: #374151; margin: 0 0 16px; }
    .gemini-section { margin-bottom: 14px; }
    .gemini-section-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .06em; color: #6B7280; margin-bottom: 8px;
    }
    .gemini-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .gemini-chip {
      padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 500;
      background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE;
    }
    .gemini-chip-poi { background: #F0FDF4; color: #16A34A; border-color: #BBF7D0; }
    .gemini-pros-contras { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .gemini-pros, .gemini-contras { display: flex; flex-direction: column; gap: 6px; }
    .gemini-item {
      font-size: 12.5px; color: #374151; padding: 6px 10px;
      border-radius: 8px; border: 1px solid #F3F4F6; background: #fff;
    }
    .gemini-pros .gemini-item { border-color: #D1FAE5; }
    .gemini-contras .gemini-item { border-color: #FEE2E2; }
    .gemini-note { margin-top: 12px; }

    /* Photo analysis meta row */
    .photo-meta-row {
      display: flex; gap: 12px; margin: 12px 0;
      flex-wrap: wrap;
    }
    .photo-meta-item {
      display: flex; flex-direction: column; gap: 2px;
      background: #F9FAFB; border: 1px solid #E5E7EB;
      border-radius: 10px; padding: 8px 14px; min-width: 90px;
    }
    .photo-meta-label { font-size: 11px; color: #9CA3AF; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    .photo-meta-value { font-size: 13px; color: #111827; font-weight: 600; }

    @media (max-width: 700px) {
      .page { padding: 16px; }
      .l2-grid { flex-direction: column; }
      .avm-hero { grid-template-columns: 1fr; }
      .verdict-hero { flex-direction: column; text-align: center; }
      .verdict-right { text-align: center; }
    }
  `]
})
export class FichaInmuebleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc   = inject(InmobiliarioService);
  private http  = inject(HttpClient);
  private readonly headers = { headers: { 'X-Api-Key': environment.apiKey } };

  detalle        = signal<AnuncioDetalle | null>(null);
  catastro       = signal<CatastroResult | null>(null);
  catastroFicha  = signal<CatastroFicha | null>(null);
  valorRef       = signal<ValorReferencia | null>(null);
  avm            = signal<EstimacionAvm | null>(null);

  loading        = signal(true);
  error          = signal<string | null>(null);
  catastroLoading = signal(true);
  avmLoading     = signal(false);
  geminiAnalysis      = signal<GeminiZoneAnalysis | null>(null);
  geminiLoading       = signal(false);
  geminiError         = signal<string | null>(null);
  geminiPhotoAnalysis = signal<GeminiPhotoAnalysis | null>(null);
  geminiPhotoLoading  = signal(false);
  readonly geminiEnabled = !!environment.geminiApiKey;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.error.set('ID de anuncio no válido.');
      this.loading.set(false);
      this.catastroLoading.set(false);
      return;
    }

    // 1. Cargar detalle del anuncio
    this.svc.getAnuncioDetalle(id).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.loading.set(false);
        // Con los datos del anuncio, lanzar automáticamente el AVM, análisis de zona y fotos
        this.calcularAvm(d);
        this.analizarZona(d);
        this.analizarFotos(d);
      },
      error: () => {
        this.error.set('No se pudo cargar el detalle del anuncio.');
        this.loading.set(false);
        this.catastroLoading.set(false);
      }
    });

    // 2. Catastro por dirección (método existente)
    this.svc.getCatastro(id).subscribe({
      next: (c) => {
        this.catastro.set(c);
        this.catastroLoading.set(false);

        // Si tenemos RC del catastro, cargar ficha rica y valor referencia
        const rc = c.inmuebles?.[0]?.referenciaCatastral;
        if (rc) {
          this.cargarFichaYValorRef(rc);
        }
      },
      error: () => {
        this.catastroLoading.set(false);
      }
    });
  }

  private cargarFichaYValorRef(rc: string): void {
    const base = environment.apiUrl;

    forkJoin({
      ficha: this.http.get<CatastroFicha>(
        `${base}/catastro/ficha?rc=${encodeURIComponent(rc)}`,
        this.headers
      ).pipe(catchError(() => of(null))),
      vref: this.http.get<ValorReferencia>(
        `${base}/catastro/valor-referencia?rc=${encodeURIComponent(rc)}`,
        this.headers
      ).pipe(catchError(() => of(null))),
    }).subscribe(({ ficha, vref }) => {
      if (ficha) this.catastroFicha.set(ficha);
      if (vref)  this.valorRef.set(vref);
    });
  }

  calcularAvm(d: AnuncioDetalle): void {
    this.avmLoading.set(true);

    const body = {
      rc:           null,
      lat:          null,
      lon:          null,
      superficie:   d.superficieM2,
      habitaciones: d.habitaciones,
      ciudad:       d.ciudad,
    };

    this.http.post<EstimacionAvm>(
      `${environment.apiUrl}/tasacion/estimar`,
      body,
      this.headers
    ).pipe(catchError(() => of(null))).subscribe(est => {
      this.avm.set(est);
      this.avmLoading.set(false);
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private analizarZona(d: AnuncioDetalle): void {
    this.geminiLoading.set(true);

    const prompt = `Analiza la zona para un inmueble en España con estas características:
- Ciudad: ${d.ciudad}
- Distrito/Barrio: ${d.distrito ?? 'desconocido'}
- Tipo de inmueble: ${d.tipoInmueble ?? 'piso'}
- Superficie: ${d.superficieM2 ?? '?'} m²
- Habitaciones: ${d.habitaciones ?? '?'}
- Precio anunciado: ${d.precioTotal ? d.precioTotal.toLocaleString('es-ES') + ' €' : 'desconocido'}

Devuelve ÚNICAMENTE un objeto JSON (sin markdown, sin explicaciones) con exactamente estas claves:
{
  "calidad_zona": "Alta|Media-Alta|Media|Media-Baja|Baja",
  "score": número del 0 al 10,
  "transporte": ["Metro L1 Sol 400m", "Bus 27 100m"],
  "puntos_interes": ["Mercado San Miguel 300m", "Parque del Retiro 800m"],
  "resumen": "Descripción de 2-3 frases sobre la zona",
  "pros": ["pro 1", "pro 2", "pro 3"],
  "contras": ["contra 1", "contra 2", "contra 3"]
}`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } }
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${environment.geminiApiKey}`;
    this.http.post<{ candidates: { content: { parts: { text: string }[] } }[] }>(
      geminiUrl,
      body
    ).subscribe({
      next: (res) => {
        try {
          const text = res.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
          const data: GeminiZoneAnalysis = JSON.parse(text);
          this.geminiAnalysis.set(data);
        } catch {
          this.geminiError.set('Error al procesar la respuesta de Gemini.');
        }
        this.geminiLoading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.error?.message ?? err?.message ?? 'Error desconocido';
        this.geminiError.set(msg);
        this.geminiLoading.set(false);
      }
    });
  }

  reintentarGemini(): void {
    const d = this.detalle();
    if (!d) return;
    this.geminiError.set(null);
    this.geminiAnalysis.set(null);
    this.analizarZona(d);
  }

  private analizarFotos(d: AnuncioDetalle): void {
    if (!d.fotoPrincipal) return;
    this.geminiPhotoLoading.set(true);

    // Fetch image as base64 through our server-side proxy (avoids CORS)
    this.http.get<{ base64: string; mimeType: string }>(
      `${environment.apiUrl}/anuncios/${d.id}/foto-base64`,
      this.headers
    ).pipe(catchError(() => of(null))).subscribe(foto => {
      if (!foto) { this.geminiPhotoLoading.set(false); return; }

      const prompt = `Eres un experto inmobiliario. Analiza esta foto de un inmueble en venta en España.
Devuelve ÚNICAMENTE un objeto JSON (sin markdown, sin explicaciones) con exactamente estas claves:
{
  "exterior": false,
  "luminosidad": "Muy luminoso|Luminoso|Normal|Oscuro",
  "estado": "Excelente|Bueno|Regular|Malo",
  "calidad": "Premium|Alta|Media|Básica",
  "descripcion": "2-3 frases describiendo lo que ves en la foto",
  "puntuacion": 7,
  "caracteristicas": ["Suelos de parquet", "Techos altos", "Ventanas grandes"]
}`;

      const body = {
        contents: [{ parts: [
          { inlineData: { mimeType: foto.mimeType, data: foto.base64 } },
          { text: prompt }
        ]}],
        generationConfig: { responseMimeType: 'application/json' }
      };

      this.http.post<{ candidates: { content: { parts: { text: string }[] } }[] }>(
        `${environment.apiUrl}/gemini/vision`,
        body
      ).subscribe({
        next: (res) => {
          try {
            const text = res.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
            const data: GeminiPhotoAnalysis = JSON.parse(text);
            this.geminiPhotoAnalysis.set(data);
          } catch { /* silently fail */ }
          this.geminiPhotoLoading.set(false);
        },
        error: () => this.geminiPhotoLoading.set(false)
      });
    });
  }

  geminiScoreClass(score: number): string {
    if (score >= 7.5) return 'score-high';
    if (score >= 5)   return 'score-med';
    return 'score-low';
  }

  // ── Verdict helpers (Layer 1) ──────────────
  private verdictPct(d: AnuncioDetalle): number | null {
    const est = this.avm();
    if (est?.precioEstimado && d.precioTotal) {
      return this.difAvmPct(d.precioTotal, est.precioEstimado);
    }
    if (d.gapPct != null) return d.gapPct;
    return null;
  }

  verdictColor(d: AnuncioDetalle): string {
    const pct = this.verdictPct(d);
    if (pct == null) return 'neutral-verdict';
    if (pct <= -5) return 'green-verdict';
    if (pct < 10) return 'yellow-verdict';
    return 'red-verdict';
  }

  verdictLabel(d: AnuncioDetalle): string {
    const pct = this.verdictPct(d);
    if (pct == null) return 'Sin datos suficientes';
    if (pct <= -5) return 'Infravalorado';
    if (pct < 10) return 'Precio de mercado';
    return 'Precio elevado';
  }

  verdictPctText(d: AnuncioDetalle): string {
    const pct = this.verdictPct(d);
    if (pct == null) return '—';
    return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  verdictSub(d: AnuncioDetalle): string {
    const est = this.avm();
    const pct = this.verdictPct(d);
    if (pct == null) return 'Calcula el AVM para obtener un veredicto completo.';
    const source = est ? 'según el modelo AVM' : 'respecto al precio notarial de la zona';
    if (pct <= -5) return `Este inmueble está ${Math.abs(pct).toFixed(1)}% por debajo del valor estimado ${source}.`;
    if (pct < 10) return `El precio pedido está en línea con el mercado (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%) ${source}.`;
    return `Este inmueble está ${pct.toFixed(1)}% por encima del valor estimado ${source}.`;
  }

  getGapClass(gap: number | null): string {
    if (!gap) return '';
    return this.svc.getGapClass(gap);
  }

  getNotarialBarWidth(d: AnuncioDetalle): number {
    if (!d.notarialMedioM2 || !d.precioM2 || d.precioM2 === 0) return 50;
    return Math.min(95, (d.notarialMedioM2 / d.precioM2) * 100);
  }

  difVref(precio: number, vref: number): number {
    return precio - vref;
  }
  difVrefPct(precio: number, vref: number): number {
    return vref > 0 ? ((precio - vref) / vref) * 100 : 0;
  }
  difVrefClass(precio: number, vref: number): string {
    return precio > vref ? 'gap-high' : 'gap-low';
  }

  difAvm(precio: number, estimado: number): number {
    return precio - estimado;
  }
  difAvmPct(precio: number, estimado: number): number {
    return estimado > 0 ? ((precio - estimado) / estimado) * 100 : 0;
  }
}
