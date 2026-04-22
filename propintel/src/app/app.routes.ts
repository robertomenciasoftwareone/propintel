import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ── Rutas públicas UrbIA ────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'mapa-resultados',
    loadComponent: () =>
      import('./features/mapa-resultados/mapa-resultados.component').then(m => m.MapaResultadosComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/registro.component').then(m => m.RegistroComponent),
  },

  // ── Rutas analytics (requieren login) ──────────────────────────────
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'historico',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/historico/historico.component').then(m => m.HistoricoComponent),
  },
  {
    path: 'alertas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/alertas/alertas.component').then(m => m.AlertasComponent),
  },
  {
    path: 'mapa',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/mapa/mapa.component').then(m => m.MapaComponent),
  },
  {
    path: 'ficha/:id',
    loadComponent: () =>
      import('./features/ficha/ficha-inmueble.component').then(m => m.FichaInmuebleComponent),
  },
  {
    path: 'tasacion',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tasacion/tasacion.component').then(m => m.TasacionComponent),
  },
  {
    path: 'admin-validacion',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin-validacion.component').then(m => m.AdminValidacionComponent),
  },
  {
    path: 'apis-fuentes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/apis-fuentes/apis-fuentes.component').then(m => m.ApisFuentesComponent),
  },
  {
    path: 'explorador-casas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/explorador-casas/explorador-casas.component').then(m => m.ExploradorCasasComponent),
  },

  {
    path: 'comparar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/comparar/comparar.component').then(m => m.CompararComponent),
  },
  {
    path: 'hipotecas',
    loadComponent: () =>
      import('./features/hipotecas/hipotecas.component').then(m => m.HipotecasComponent),
  },
  {
    path: 'estadisticas',
    loadComponent: () =>
      import('./features/estadisticas/estadisticas.component').then(m => m.EstadisticasComponent),
  },
  {
    path: 'catastro',
    loadComponent: () =>
      import('./features/catastro/catastro.component').then(m => m.CatastroComponent),
  },

  // ── Herramientas de inversión ───────────────────────────────────────
  {
    path: 'roi',
    loadComponent: () =>
      import('./features/roi/roi.component').then(m => m.RoiComponent),
  },
  {
    path: 'historial-precios',
    loadComponent: () =>
      import('./features/historial-precios/historial-precios.component').then(m => m.HistorialPreciosComponent),
  },

  // ── Nuevas funcionalidades ──────────────────────────────────────────
  {
    path: 'asistente',
    loadComponent: () =>
      import('./features/asistente/asistente.component').then(m => m.AsistenteComponent),
  },
  {
    path: 'seguros',
    loadComponent: () =>
      import('./features/seguros/seguros.component').then(m => m.SegurosComponent),
  },
  {
    path: 'costes-compra',
    loadComponent: () =>
      import('./features/costes-compra/costes-compra.component').then(m => m.CostesCompraComponent),
  },
  {
    path: 'barrios',
    loadComponent: () =>
      import('./features/barrios/barrios.component').then(m => m.BarriosComponent),
  },

  { path: '**', redirectTo: '' },
];
