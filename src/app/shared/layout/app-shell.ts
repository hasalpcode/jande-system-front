import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { EtablissementInfoService } from '../../core/services/etablissement-info.service';
import { NavGroup } from './nav-item.model';

const NAV_SUPER_ADMIN: NavGroup[] = [
  {
    label: 'Plateforme',
    items: [{ label: 'Établissements', icon: 'domain', route: '/super-admin/etablissements' }],
  },
];

const NAV_ADMIN: NavGroup[] = [
  {
    label: 'Général',
    items: [
      { label: 'Tableau de bord', icon: 'dashboard', route: '/admin/dashboard' },
      { label: 'Utilisateurs', icon: 'group', route: '/admin/users', permission: 'UTILISATEURS' },
    ],
  },
  {
    label: 'Pédagogie',
    items: [
      {
        label: 'Paramétrage',
        icon: 'tune',
        route: '/admin/parametrage',
        tint: 'tint-parametrage',
        permission: 'PARAMETRAGE',
      },
      { label: 'Parcours', icon: 'school', route: '/admin/parcours', tint: 'tint-parcours', permission: 'PARCOURS' },
    ],
  },
  {
    label: 'Vie étudiante',
    items: [
      {
        label: 'Inscriptions',
        icon: 'how_to_reg',
        route: '/admin/inscriptions',
        tint: 'tint-inscriptions',
        permission: 'INSCRIPTIONS',
      },
      {
        label: 'Paiements',
        icon: 'payments',
        route: '/admin/paiements',
        tint: 'tint-paiements',
        permission: 'PAIEMENTS',
      },
      {
        label: 'Statistiques',
        icon: 'query_stats',
        route: '/admin/statistiques',
        tint: 'tint-statistiques',
        permission: 'STATISTIQUES',
      },
    ],
  },
  {
    label: 'Enseignement',
    items: [
      { label: 'Cours', icon: 'event_note', route: '/admin/cours', tint: 'tint-cours', permission: 'COURS' },
      {
        label: 'Évaluations',
        icon: 'grading',
        route: '/admin/evaluations',
        tint: 'tint-evaluations',
        permission: 'EVALUATIONS',
      },
    ],
  },
  {
    label: 'Administratif',
    items: [
      {
        label: 'Documents',
        icon: 'description',
        route: '/admin/documents',
        tint: 'tint-documents',
        permission: 'DOCUMENTS',
      },
      { label: 'RH & Autres', icon: 'badge', route: '/admin/rh', tint: 'tint-rh', permission: 'RH' },
    ],
  },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatIconModule, MatButtonModule, MatDividerModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly authService = inject(AuthService);
  private readonly etablissementService = inject(EtablissementInfoService);
  private readonly router = inject(Router);

  readonly session = this.authService.currentSession;
  readonly navGroups = computed<NavGroup[]>(() =>
    this.authService.estSuperAdmin() ? NAV_SUPER_ADMIN : this.filtrerParPermission(NAV_ADMIN),
  );
  readonly titrePlateforme = computed(() => (this.authService.estSuperAdmin() ? 'Super Admin' : this.session()?.tenantNom ?? 'Établissement'));

  readonly logoEtablissement = signal<string | null>(null);

  constructor() {
    if (!this.authService.estSuperAdmin()) {
      this.etablissementService.obtenir().subscribe({
        next: (e) => this.logoEtablissement.set(e.logo),
        error: () => this.logoEtablissement.set(null),
      });
    }
  }

  deconnecter(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /** Un item sans `permission` est visible par tout utilisateur tenant ; sinon il faut l'admin ou la permission. */
  private filtrerParPermission(groupes: NavGroup[]): NavGroup[] {
    return groupes
      .map((groupe) => ({
        ...groupe,
        items: groupe.items.filter((item) => !item.permission || this.authService.hasPermission(item.permission)),
      }))
      .filter((groupe) => groupe.items.length > 0);
  }
}
