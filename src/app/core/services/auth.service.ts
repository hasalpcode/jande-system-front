import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  LoginResponse,
  LoginSuperAdminRequest,
  LoginTenantRequest,
  Session,
} from '../models/auth.models';

const STORAGE_KEY = 'school-management.session';

/**
 * Source de verite unique pour la session courante (super-admin ou
 * utilisateur tenant). Le token est persiste en localStorage pour survivre
 * a un rechargement de page ; tout le reste (roles, type, etablissement) en
 * decoule via des signaux calcules.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<Session | null>(this.lireSessionStockee());

  readonly currentSession = this.session.asReadonly();
  readonly estConnecte = computed(() => this.session() !== null);
  readonly estSuperAdmin = computed(() => this.session()?.type === 'SUPER_ADMIN');
  readonly estTenantUser = computed(() => this.session()?.type === 'TENANT_USER');
  readonly estAdminTenant = computed(() => this.hasRole('ADMIN'));

  constructor(private readonly http: HttpClient) {}

  /** Un utilisateur ADMIN a toujours acces : c'est le profil qui voit tout. */
  hasRole(role: string): boolean {
    return this.session()?.type === 'TENANT_USER' && (this.session()?.roles.includes(role) ?? false);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  /** Un utilisateur ADMIN a toujours acces a tout, sans avoir besoin qu'on le lui coche explicitement. */
  hasPermission(permission: string): boolean {
    if (this.session()?.type !== 'TENANT_USER') {
      return false;
    }
    return this.hasRole('ADMIN') || (this.session()?.permissions.includes(permission) ?? false);
  }

  loginSuperAdmin(request: LoginSuperAdminRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/super-admin/login`, request)
      .pipe(tap((response) => this.ouvrirSession(response)));
  }

  loginTenant(request: LoginTenantRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, request)
      .pipe(tap((response) => this.ouvrirSession(response)));
  }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  token(): string | null {
    return this.session()?.token ?? null;
  }

  private ouvrirSession(response: LoginResponse): void {
    const session: Session = { ...response };
    this.session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private lireSessionStockee(): Session | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }
}
