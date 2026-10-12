import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** N'importe quel utilisateur tenant (admin, comptable, enseignant...), peu importe son role precis. */
export const tenantGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.estTenantUser() ? true : router.createUrlTree(['/login']);
};

/**
 * Restreint une route a l'admin et aux roles listes. L'admin garde toujours
 * acces (profil "tout voir") sans avoir a le repeter a chaque appel.
 */
export function roleGuard(...roles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    return authService.hasAnyRole(['ADMIN', ...roles]) ? true : router.createUrlTree(['/admin/dashboard']);
  };
}

/**
 * Restreint une route a la permission donnee (l'admin garde toujours acces,
 * voir AuthService.hasPermission). Utilise pour les fonctionnalites que
 * l'admin peut accorder finement a un utilisateur.
 */
export function permissionGuard(permission: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    return authService.hasPermission(permission) ? true : router.createUrlTree(['/admin/dashboard']);
  };
}
