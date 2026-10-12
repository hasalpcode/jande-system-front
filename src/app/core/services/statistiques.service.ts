import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  ImpayesMensuel,
  LigneBrouillard,
  SituationClasse,
  SituationEtudiant,
  SituationMensuelleClasse,
} from '../models/statistiques.models';

@Injectable({ providedIn: 'root' })
export class StatistiquesService {
  private readonly baseUrl = `${API_BASE_URL}/admin/statistiques`;

  constructor(private readonly http: HttpClient) {}

  situationEtudiant(etudiantId: string): Observable<SituationEtudiant> {
    return this.http.get<SituationEtudiant>(`${this.baseUrl}/etudiants/${etudiantId}`);
  }

  situationClasse(classeId: string): Observable<SituationClasse> {
    return this.http.get<SituationClasse>(`${this.baseUrl}/classes/${classeId}`);
  }

  situationMensuelleClasse(classeId: string, annee: number, mois: number): Observable<SituationMensuelleClasse> {
    const params = new HttpParams().set('annee', annee).set('mois', mois);
    return this.http.get<SituationMensuelleClasse>(`${this.baseUrl}/classes/${classeId}/paiements-mensuels`, { params });
  }

  impayesMensuel(anneeAcademiqueId: string, annee: number, mois: number): Observable<ImpayesMensuel> {
    const params = new HttpParams().set('anneeAcademiqueId', anneeAcademiqueId).set('annee', annee).set('mois', mois);
    return this.http.get<ImpayesMensuel>(`${this.baseUrl}/impayes`, { params });
  }

  brouillard(dateDebut?: string, dateFin?: string): Observable<LigneBrouillard[]> {
    let params = new HttpParams();
    if (dateDebut) params = params.set('dateDebut', dateDebut);
    if (dateFin) params = params.set('dateFin', dateFin);
    return this.http.get<LigneBrouillard[]>(`${this.baseUrl}/brouillard`, { params });
  }
}
