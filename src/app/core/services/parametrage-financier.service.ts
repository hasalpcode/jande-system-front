import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  Engagement,
  EngagementRequest,
  ModePaiement,
  ModePaiementRequest,
  Partenaire,
  PartenaireRequest,
} from '../models/parametrage.models';

@Injectable({ providedIn: 'root' })
export class ParametrageFinancierService {
  private readonly baseUrl = `${API_BASE_URL}/admin/parametrage/financier`;

  constructor(private readonly http: HttpClient) {}

  listerEngagements(): Observable<Engagement[]> {
    return this.http.get<Engagement[]>(`${this.baseUrl}/engagements`);
  }
  creerEngagement(request: EngagementRequest): Observable<Engagement> {
    return this.http.post<Engagement>(`${this.baseUrl}/engagements`, request);
  }
  modifierEngagement(id: string, request: EngagementRequest): Observable<Engagement> {
    return this.http.put<Engagement>(`${this.baseUrl}/engagements/${id}`, request);
  }
  supprimerEngagement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/engagements/${id}`);
  }

  listerModesPaiement(): Observable<ModePaiement[]> {
    return this.http.get<ModePaiement[]>(`${this.baseUrl}/modes-paiement`);
  }
  creerModePaiement(request: ModePaiementRequest): Observable<ModePaiement> {
    return this.http.post<ModePaiement>(`${this.baseUrl}/modes-paiement`, request);
  }
  modifierModePaiement(id: string, request: ModePaiementRequest): Observable<ModePaiement> {
    return this.http.put<ModePaiement>(`${this.baseUrl}/modes-paiement/${id}`, request);
  }
  supprimerModePaiement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/modes-paiement/${id}`);
  }

  listerPartenaires(): Observable<Partenaire[]> {
    return this.http.get<Partenaire[]>(`${this.baseUrl}/partenaires`);
  }
  creerPartenaire(request: PartenaireRequest): Observable<Partenaire> {
    return this.http.post<Partenaire>(`${this.baseUrl}/partenaires`, request);
  }
  modifierPartenaire(id: string, request: PartenaireRequest): Observable<Partenaire> {
    return this.http.put<Partenaire>(`${this.baseUrl}/partenaires/${id}`, request);
  }
  supprimerPartenaire(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/partenaires/${id}`);
  }
}
