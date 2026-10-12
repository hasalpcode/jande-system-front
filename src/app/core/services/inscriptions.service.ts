import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  AttributionUniforme,
  AttributionUniformeRequest,
  CandidatRequest,
  CarteEtudiant,
  CarteEtudiantRequest,
  EcheancePrevue,
  EcheancePrevueRequest,
  Etudiant,
  FormulaireAdmission,
  Inscription,
  InscriptionRequest,
  ModifierEtudiantRequest,
  ModifierInscriptionRequest,
} from '../models/inscriptions.models';

@Injectable({ providedIn: 'root' })
export class InscriptionsService {
  private readonly baseUrl = `${API_BASE_URL}/admin/inscriptions`;

  constructor(private readonly http: HttpClient) {}

  listerFormulaires(): Observable<FormulaireAdmission[]> {
    return this.http.get<FormulaireAdmission[]>(`${this.baseUrl}/formulaires`);
  }
  soumettreFormulaire(request: CandidatRequest): Observable<FormulaireAdmission> {
    return this.http.post<FormulaireAdmission>(`${this.baseUrl}/formulaires`, request);
  }
  admettre(id: string): Observable<FormulaireAdmission> {
    return this.http.post<FormulaireAdmission>(`${this.baseUrl}/formulaires/${id}/admettre`, {});
  }

  listerEtudiants(): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.baseUrl}/etudiants`);
  }
  modifierEtudiant(id: string, request: ModifierEtudiantRequest): Observable<Etudiant> {
    return this.http.put<Etudiant>(`${this.baseUrl}/etudiants/${id}`, request);
  }
  supprimerEtudiant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/etudiants/${id}`);
  }
  exporterEtudiants(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/etudiants/export`, { responseType: 'blob' });
  }

  listerInscriptions(): Observable<Inscription[]> {
    return this.http.get<Inscription[]>(`${this.baseUrl}/inscriptions`);
  }
  creerInscription(request: InscriptionRequest): Observable<Inscription> {
    return this.http.post<Inscription>(`${this.baseUrl}/inscriptions`, request);
  }
  modifierInscription(id: string, request: ModifierInscriptionRequest): Observable<Inscription> {
    return this.http.put<Inscription>(`${this.baseUrl}/inscriptions/${id}`, request);
  }
  supprimerInscription(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/inscriptions/${id}`);
  }

  listerEcheances(inscriptionId: string): Observable<EcheancePrevue[]> {
    return this.http.get<EcheancePrevue[]>(`${this.baseUrl}/inscriptions/${inscriptionId}/echeances`);
  }
  enregistrerEcheances(inscriptionId: string, lignes: EcheancePrevueRequest[]): Observable<EcheancePrevue[]> {
    return this.http.put<EcheancePrevue[]>(`${this.baseUrl}/inscriptions/${inscriptionId}/echeances`, lignes);
  }

  emettreCarte(request: CarteEtudiantRequest): Observable<CarteEtudiant> {
    return this.http.post<CarteEtudiant>(`${this.baseUrl}/cartes-etudiant`, request);
  }
  /** Récupère la carte déjà émise pour cette inscription, ou en crée une (numéro
   * auto-généré) au premier appel. */
  obtenirCarte(inscriptionId: string): Observable<CarteEtudiant> {
    return this.http.get<CarteEtudiant>(`${this.baseUrl}/inscriptions/${inscriptionId}/carte`);
  }

  attribuerUniforme(request: AttributionUniformeRequest): Observable<AttributionUniforme> {
    return this.http.post<AttributionUniforme>(`${this.baseUrl}/uniformes`, request);
  }
}
