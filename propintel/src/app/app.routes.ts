import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'historico',
    loadComponent: () =>
      import('./features/historico/historico.component').then(m => m.HistoricoComponent),
  },
  {
    path: 'alertas',
    loadComponent: () =>
      import('./features/alertas/alertas.component').then(m => m.AlertasComponent),
  },
  {
    path: 'mapa',
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
    loadComponent: () =>
      import('./features/tasacion/tasacion.component').then(m => m.TasacionComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
