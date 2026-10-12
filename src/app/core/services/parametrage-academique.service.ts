import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  AnneeAcademique,
  AnneeAcademiqueRequest,
  Domaine,
  DomaineRequest,
  FiliereAcademique,
  FiliereRequest,
  Mention,
  MentionRequest,
  Niveau,
  NiveauRequest,
  Option,
  OptionRequest,
  ReconductionRequest,
  ReconductionResultat,
  Salle,
  SalleRequest,
  Semestre,
  SemestreRequest,
} from '../models/parametrage.models';

@Injectable({ providedIn: 'root' })
export class ParametrageAcademiqueService {
  private readonly baseUrl = `${API_BASE_URL}/admin/parametrage/academique`;

  constructor(private readonly http: HttpClient) {}

  listerAnnees(): Observable<AnneeAcademique[]> {
    return this.http.get<AnneeAcademique[]>(`${this.baseUrl}/annees`);
  }
  creerAnnee(request: AnneeAcademiqueRequest): Observable<AnneeAcademique> {
    return this.http.post<AnneeAcademique>(`${this.baseUrl}/annees`, request);
  }
  modifierAnnee(id: string, request: AnneeAcademiqueRequest): Observable<AnneeAcademique> {
    return this.http.put<AnneeAcademique>(`${this.baseUrl}/annees/${id}`, request);
  }
  supprimerAnnee(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/annees/${id}`);
  }

  listerSemestres(): Observable<Semestre[]> {
    return this.http.get<Semestre[]>(`${this.baseUrl}/semestres`);
  }
  creerSemestre(request: SemestreRequest): Observable<Semestre> {
    return this.http.post<Semestre>(`${this.baseUrl}/semestres`, request);
  }
  modifierSemestre(id: string, request: SemestreRequest): Observable<Semestre> {
    return this.http.put<Semestre>(`${this.baseUrl}/semestres/${id}`, request);
  }
  supprimerSemestre(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/semestres/${id}`);
  }

  listerDomaines(): Observable<Domaine[]> {
    return this.http.get<Domaine[]>(`${this.baseUrl}/domaines`);
  }
  creerDomaine(request: DomaineRequest): Observable<Domaine> {
    return this.http.post<Domaine>(`${this.baseUrl}/domaines`, request);
  }
  modifierDomaine(id: string, request: DomaineRequest): Observable<Domaine> {
    return this.http.put<Domaine>(`${this.baseUrl}/domaines/${id}`, request);
  }
  supprimerDomaine(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/domaines/${id}`);
  }

  listerMentions(): Observable<Mention[]> {
    return this.http.get<Mention[]>(`${this.baseUrl}/mentions`);
  }
  creerMention(request: MentionRequest): Observable<Mention> {
    return this.http.post<Mention>(`${this.baseUrl}/mentions`, request);
  }
  modifierMention(id: string, request: MentionRequest): Observable<Mention> {
    return this.http.put<Mention>(`${this.baseUrl}/mentions/${id}`, request);
  }
  supprimerMention(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/mentions/${id}`);
  }

  listerOptions(): Observable<Option[]> {
    return this.http.get<Option[]>(`${this.baseUrl}/options`);
  }
  creerOption(request: OptionRequest): Observable<Option> {
    return this.http.post<Option>(`${this.baseUrl}/options`, request);
  }
  modifierOption(id: string, request: OptionRequest): Observable<Option> {
    return this.http.put<Option>(`${this.baseUrl}/options/${id}`, request);
  }
  supprimerOption(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/options/${id}`);
  }

  listerFilieres(): Observable<FiliereAcademique[]> {
    return this.http.get<FiliereAcademique[]>(`${this.baseUrl}/filieres`);
  }
  creerFiliere(request: FiliereRequest): Observable<FiliereAcademique> {
    return this.http.post<FiliereAcademique>(`${this.baseUrl}/filieres`, request);
  }
  modifierFiliere(id: string, request: FiliereRequest): Observable<FiliereAcademique> {
    return this.http.put<FiliereAcademique>(`${this.baseUrl}/filieres/${id}`, request);
  }
  supprimerFiliere(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/filieres/${id}`);
  }

  listerSalles(): Observable<Salle[]> {
    return this.http.get<Salle[]>(`${this.baseUrl}/salles`);
  }
  creerSalle(request: SalleRequest): Observable<Salle> {
    return this.http.post<Salle>(`${this.baseUrl}/salles`, request);
  }
  modifierSalle(id: string, request: SalleRequest): Observable<Salle> {
    return this.http.put<Salle>(`${this.baseUrl}/salles/${id}`, request);
  }
  supprimerSalle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/salles/${id}`);
  }

  listerNiveaux(): Observable<Niveau[]> {
    return this.http.get<Niveau[]>(`${this.baseUrl}/niveaux`);
  }
  creerNiveau(request: NiveauRequest): Observable<Niveau> {
    return this.http.post<Niveau>(`${this.baseUrl}/niveaux`, request);
  }
  modifierNiveau(id: string, request: NiveauRequest): Observable<Niveau> {
    return this.http.put<Niveau>(`${this.baseUrl}/niveaux/${id}`, request);
  }
  supprimerNiveau(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/niveaux/${id}`);
  }

  reconduire(request: ReconductionRequest): Observable<ReconductionResultat> {
    return this.http.post<ReconductionResultat>(`${this.baseUrl}/reconduction`, request);
  }
}
