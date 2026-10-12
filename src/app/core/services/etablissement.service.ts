import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { CreerEtablissementRequest, Etablissement } from '../models/etablissement.models';

@Injectable({ providedIn: 'root' })
export class EtablissementService {
  private readonly baseUrl = `${API_BASE_URL}/super-admin/etablissements`;

  constructor(private readonly http: HttpClient) {}

  lister(): Observable<Etablissement[]> {
    return this.http.get<Etablissement[]>(this.baseUrl);
  }

  creer(request: CreerEtablissementRequest): Observable<Etablissement> {
    return this.http.post<Etablissement>(this.baseUrl, request);
  }

  changerStatut(id: string, actif: boolean): Observable<Etablissement> {
    return this.http.patch<Etablissement>(`${this.baseUrl}/${id}/statut`, { actif });
  }
}
