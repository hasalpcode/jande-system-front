import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  Classe,
  ClasseRequest,
  ElementConstitutif,
  ElementConstitutifRequest,
  UniteEnseignement,
  UniteEnseignementRequest,
} from '../models/parcours.models';
import { Etudiant } from '../models/inscriptions.models';

@Injectable({ providedIn: 'root' })
export class ParcoursService {
  private readonly baseUrl = `${API_BASE_URL}/admin/parcours`;

  constructor(private readonly http: HttpClient) {}

  listerClasses(): Observable<Classe[]> {
    return this.http.get<Classe[]>(`${this.baseUrl}/classes`);
  }
  creerClasse(request: ClasseRequest): Observable<Classe> {
    return this.http.post<Classe>(`${this.baseUrl}/classes`, request);
  }
  modifierClasse(id: string, request: ClasseRequest): Observable<Classe> {
    return this.http.put<Classe>(`${this.baseUrl}/classes/${id}`, request);
  }
  supprimerClasse(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/classes/${id}`);
  }
  listerEtudiantsDeClasse(classeId: string): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.baseUrl}/classes/${classeId}/etudiants`);
  }

  listerElementsConstitutifsDuSemestre(semestreId: string): Observable<ElementConstitutif[]> {
    return this.http.get<ElementConstitutif[]>(`${this.baseUrl}/semestres/${semestreId}/elements-constitutifs`);
  }

  listerUnitesEnseignement(): Observable<UniteEnseignement[]> {
    return this.http.get<UniteEnseignement[]>(`${this.baseUrl}/unites-enseignement`);
  }
  creerUniteEnseignement(request: UniteEnseignementRequest): Observable<UniteEnseignement> {
    return this.http.post<UniteEnseignement>(`${this.baseUrl}/unites-enseignement`, request);
  }
  modifierUniteEnseignement(id: string, request: UniteEnseignementRequest): Observable<UniteEnseignement> {
    return this.http.put<UniteEnseignement>(`${this.baseUrl}/unites-enseignement/${id}`, request);
  }
  supprimerUniteEnseignement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/unites-enseignement/${id}`);
  }

  listerElementsConstitutifs(uniteEnseignementId: string): Observable<ElementConstitutif[]> {
    return this.http.get<ElementConstitutif[]>(`${this.baseUrl}/unites-enseignement/${uniteEnseignementId}/elements-constitutifs`);
  }
  creerElementConstitutif(request: ElementConstitutifRequest): Observable<ElementConstitutif> {
    return this.http.post<ElementConstitutif>(`${this.baseUrl}/elements-constitutifs`, request);
  }
}
