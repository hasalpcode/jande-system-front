import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  Badgeage,
  BadgeageRequest,
  BudgetDepense,
  ContratVacataire,
  ContratVacataireRequest,
  Depense,
  DepenseRequest,
  DepotBudgetRequest,
} from '../models/rh.models';

@Injectable({ providedIn: 'root' })
export class RhService {
  private readonly baseUrl = `${API_BASE_URL}/admin/rh`;

  constructor(private readonly http: HttpClient) {}

  listerDepenses(): Observable<Depense[]> {
    return this.http.get<Depense[]>(`${this.baseUrl}/depenses`);
  }
  creerDepense(request: DepenseRequest): Observable<Depense> {
    return this.http.post<Depense>(`${this.baseUrl}/depenses`, request);
  }

  obtenirBudgetDepenses(): Observable<BudgetDepense> {
    return this.http.get<BudgetDepense>(`${this.baseUrl}/budget-depenses`);
  }
  ajouterDepotBudget(request: DepotBudgetRequest): Observable<BudgetDepense> {
    return this.http.post<BudgetDepense>(`${this.baseUrl}/budget-depenses`, request);
  }

  listerBadgeages(): Observable<Badgeage[]> {
    return this.http.get<Badgeage[]>(`${this.baseUrl}/badgeages`);
  }
  pointer(request: BadgeageRequest): Observable<Badgeage> {
    return this.http.post<Badgeage>(`${this.baseUrl}/badgeages`, request);
  }

  listerContrats(): Observable<ContratVacataire[]> {
    return this.http.get<ContratVacataire[]>(`${this.baseUrl}/contrats-vacataires`);
  }
  creerContrat(request: ContratVacataireRequest): Observable<ContratVacataire> {
    return this.http.post<ContratVacataire>(`${this.baseUrl}/contrats-vacataires`, request);
  }
}
