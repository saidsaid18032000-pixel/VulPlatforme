import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/dashboard/home.component').then((m) => m.HomeComponent),
  },
  { path: '**', redirectTo: 'home' },
];
