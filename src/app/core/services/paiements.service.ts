import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  CalendrierInscription,
  InscriptionValidee,
  Paiement,
  PaiementRequest,
  Pointage,
  PointageRequest,
} from '../models/paiements.models';

@Injectable({ providedIn: 'root' })
export class PaiementsService {
  private readonly baseUrl = `${API_BASE_URL}/admin/paiements`;

  constructor(private readonly http: HttpClient) {}

  lister(): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(this.baseUrl);
  }
  enregistrer(request: PaiementRequest): Observable<Paiement> {
    return this.http.post<Paiement>(this.baseUrl, request);
  }

  listerPointages(): Observable<Pointage[]> {
    return this.http.get<Pointage[]>(`${this.baseUrl}/pointages`);
  }
  pointer(request: PointageRequest): Observable<Pointage> {
    return this.http.post<Pointage>(`${this.baseUrl}/pointages`, request);
  }

  listerInscriptionsValidees(): Observable<InscriptionValidee[]> {
    return this.http.get<InscriptionValidee[]>(`${this.baseUrl}/inscriptions-validees`);
  }
  calendrier(inscriptionId: string): Observable<CalendrierInscription> {
    return this.http.get<CalendrierInscription>(`${this.baseUrl}/calendrier/${inscriptionId}`);
  }

  /** Blob plutot qu'un lien direct : l'endpoint est protege par JWT, un <a href>
   * nu ne porterait pas l'en-tete Authorization (meme pattern que DocumentsService). */
  telechargerRecuPdf(paiementId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${paiementId}/recu/pdf`, { responseType: 'blob' });
  }
}
