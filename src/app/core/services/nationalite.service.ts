import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { Nationalite, NationaliteRequest } from '../models/parametrage.models';

/** Référentiel propre à chaque établissement (plus un référentiel global géré par le
 * super-admin) - c'est l'admin du tenant qui gère sa propre liste, depuis Paramétrage. */
@Injectable({ providedIn: 'root' })
export class NationaliteService {
  private readonly baseUrl = `${API_BASE_URL}/admin/parametrage/academique/nationalites`;

  constructor(private readonly http: HttpClient) {}

  // Nom conservé (plutôt que `lister`) pour ne pas devoir retoucher tous ses appelants
  // (Inscriptions, Cours, Dashboard...) alors que la distinction qu'il marquait à l'origine
  // (lecture seule pour un admin de tenant face au CRUD du super-admin) n'existe plus.
  listerPourAdmin(): Observable<Nationalite[]> {
    return this.http.get<Nationalite[]>(this.baseUrl);
  }

  creer(request: NationaliteRequest): Observable<Nationalite> {
    return this.http.post<Nationalite>(this.baseUrl, request);
  }

  modifier(id: string, request: NationaliteRequest): Observable<Nationalite> {
    return this.http.put<Nationalite>(`${this.baseUrl}/${id}`, request);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
