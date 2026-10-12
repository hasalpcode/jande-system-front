import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { EtablissementInfo, ModifierEtablissementInfoRequest } from '../models/parametrage.models';

/** Coordonnees (nom, adresse, telephone, logo) de l'etablissement du tenant courant -
 * distinct du EtablissementService reserve au super-admin (creation/liste des tenants). */
@Injectable({ providedIn: 'root' })
export class EtablissementInfoService {
  private readonly baseUrl = `${API_BASE_URL}/admin/parametrage/etablissement`;

  constructor(private readonly http: HttpClient) {}

  obtenir(): Observable<EtablissementInfo> {
    return this.http.get<EtablissementInfo>(this.baseUrl);
  }

  modifier(request: ModifierEtablissementInfoRequest): Observable<EtablissementInfo> {
    return this.http.put<EtablissementInfo>(this.baseUrl, request);
  }
}
