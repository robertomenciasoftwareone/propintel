import { Component, inject, signal, OnInit, HostListener, ElementRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InmobiliarioService } from '../../core/services/inmobiliario.service';
import { Municipio } from '../../core/models/inmobiliario.model';

@Component({
  selector: 'app-municipio-selector',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  template: `
    <div class="selector-wrap">
      <div class="search-box" [class.open]="showDropdown()">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input
          type="text"
          class="search-input"
          placeholder="Buscar municipio…"
          [(ngModel)]="query"
          (input)="onInput()"
          (focus)="onFocus()"
          autocomplete="off"
        />
        <span class="ciudad-actual-badge" *ngIf="!showDropdown() && query.length === 0">
          {{ svc.ciudadData().nombre }}
        </span>
      </div>

      <div class="dropdown" *ngIf="showDropdown()">
        <div
          class="dropdown-item"
          *ngFor="let m of svc.municipios()"
          (mousedown)="seleccionar(m)">
          <span class="dot-status" [class.has-data]="m.tieneDatos"></span>
          <div class="item-info">
            <span class="item-nombre">{{ m.nombre }}</span>
            <span class="item-prov" *ngIf="m.provincia">{{ m.provincia }}</span>
          </div>
        </div>
        <div class="dropdown-empty" *ngIf="svc.municipios().length === 0 && query.length >= 2">
          Sin resultados para "{{ query }}"
        </div>
      </div>
    </div>
  `,
  styles: [`
    .selector-wrap { position: relative; min-width: 260px; }

    .search-box {
      display: flex; align-items: center; gap: 8px;
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0 12px;
      height: 36px;
      transition: border-color .15s;
    }
    .search-box:hover,
    .search-box.open { border-color: rgba(232,197,71,0.4); }
    .search-icon { color: var(--text-muted); flex-shrink: 0; }

    .search-input {
      background: none; border: none; outline: none;
      color: var(--text-primary); font-size: 12.5px;
      font-family: inherit; width: 100%;
    }
    .search-input::placeholder { color: var(--text-muted); }

    .ciudad-actual-badge {
      font-size: 11px; color: var(--accent);
      background: rgba(232,197,71,0.1);
      padding: 2px 10px; border-radius: 12px;
      white-space: nowrap;
    }

    .dropdown {
      position: absolute; top: 40px; left: 0; right: 0;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 10px;
      max-height: 280px; overflow-y: auto;
      z-index: 100;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .dropdown-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; cursor: pointer;
      transition: background .1s;
    }
    .dropdown-item:hover { background: rgba(255,255,255,0.04); }

    .dot-status {
      width: 8px; height: 8px; border-radius: 50%;
      background: rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    .dot-status.has-data { background: var(--notarial); }

    .item-info { display: flex; flex-direction: column; gap: 1px; }
    .item-nombre { font-size: 12.5px; color: var(--text-primary); }
    .item-prov   { font-size: 10.5px; color: var(--text-muted); }

    .dropdown-empty {
      padding: 16px 14px;
      font-size: 12px; color: var(--text-muted);
      text-align: center;
    }
  `]
})
export class MunicipioSelectorComponent implements OnInit {
  svc = inject(InmobiliarioService);
  private elRef = inject(ElementRef);

  query = '';
  showDropdown = signal(false);
  private debounceTimer: any;

  ngOnInit() {
    this.svc.cargarMunicipiosPopulares();
  }

  onFocus() {
    this.showDropdown.set(true);
    if (this.query.length === 0) {
      this.svc.cargarMunicipiosPopulares();
    }
  }

  onInput() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (this.query.length >= 2) {
        this.svc.buscarMunicipios(this.query);
      } else if (this.query.length === 0) {
        this.svc.cargarMunicipiosPopulares();
      }
    }, 250);
  }

  seleccionar(m: Municipio) {
    this.query = '';
    this.showDropdown.set(false);
    // Usar el nombre normalizado como id de ciudad (como hace el backend)
    const ciudadId = m.nombre.toLowerCase();
    this.svc.setCiudad(ciudadId, m.nombre);
  }

  @HostListener('document:mousedown', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showDropdown.set(false);
    }
  }
}
