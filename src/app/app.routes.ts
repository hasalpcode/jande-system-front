import { Routes } from '@angular/router';
import { authenticatedGuard } from './core/guards/authenticated.guard';
import { permissionGuard, tenantGuard } from './core/guards/role.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./shared/layout/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'super-admin',
        canActivate: [superAdminGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'etablissements' },
          {
            path: 'etablissements',
            loadComponent: () => import('./features/super-admin/tenants/tenants').then((m) => m.Tenants),
          },
        ],
      },
      {
        path: 'admin',
        canActivate: [tenantGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
          },
          {
            path: 'users',
            canActivate: [permissionGuard('UTILISATEURS')],
            loadComponent: () => import('./features/admin/users/users').then((m) => m.Users),
          },
          {
            path: 'parametrage',
            canActivate: [permissionGuard('PARAMETRAGE')],
            loadComponent: () => import('./features/parametrage/parametrage').then((m) => m.ParametragePage),
          },
          {
            path: 'parcours',
            canActivate: [permissionGuard('PARCOURS')],
            loadComponent: () => import('./features/parcours/parcours').then((m) => m.ParcoursPage),
          },
          {
            path: 'inscriptions',
            canActivate: [permissionGuard('INSCRIPTIONS')],
            loadComponent: () => import('./features/inscriptions/inscriptions').then((m) => m.InscriptionsPage),
          },
          {
            path: 'paiements',
            canActivate: [permissionGuard('PAIEMENTS')],
            loadComponent: () => import('./features/paiements/paiements').then((m) => m.PaiementsPage),
          },
          {
            path: 'statistiques',
            canActivate: [permissionGuard('STATISTIQUES')],
            loadComponent: () => import('./features/statistiques/statistiques').then((m) => m.StatistiquesPage),
          },
          {
            path: 'cours',
            canActivate: [permissionGuard('COURS')],
            loadComponent: () => import('./features/cours/cours').then((m) => m.CoursPage),
          },
          {
            path: 'evaluations',
            canActivate: [permissionGuard('EVALUATIONS')],
            loadComponent: () => import('./features/evaluations/evaluations').then((m) => m.EvaluationsPage),
          },
          {
            path: 'documents',
            canActivate: [permissionGuard('DOCUMENTS')],
            loadComponent: () => import('./features/documents/documents').then((m) => m.DocumentsPage),
          },
          {
            path: 'rh',
            canActivate: [permissionGuard('RH')],
            loadComponent: () => import('./features/rh/rh').then((m) => m.RhPage),
          },
          {
            path: 'badgeage',
            canActivate: [permissionGuard('BADGEAGE')],
            loadComponent: () => import('./features/badgeage/badgeage').then((m) => m.BadgeagePage),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
