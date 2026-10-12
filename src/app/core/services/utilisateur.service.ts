import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { CreerUtilisateurRequest, ModifierUtilisateurRequest, Utilisateur } from '../models/utilisateur.models';

@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private readonly baseUrl = `${API_BASE_URL}/admin/users`;

  constructor(private readonly http: HttpClient) {}

  lister(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(this.baseUrl);
  }

  creer(request: CreerUtilisateurRequest): Observable<Utilisateur> {
    return this.http.post<Utilisateur>(this.baseUrl, request);
  }

  modifier(id: string, request: ModifierUtilisateurRequest): Observable<Utilisateur> {
    return this.http.put<Utilisateur>(`${this.baseUrl}/${id}`, request);
  }
}
