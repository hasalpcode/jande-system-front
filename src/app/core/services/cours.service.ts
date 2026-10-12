import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  Affectation,
  AffectationRequest,
  Presence,
  PresenceRequest,
  Professeur,
  ProfesseurRequest,
  SeanceCours,
  SeanceCoursRequest,
} from '../models/cours.models';

@Injectable({ providedIn: 'root' })
export class CoursService {
  private readonly baseUrl = `${API_BASE_URL}/admin/cours`;

  constructor(private readonly http: HttpClient) {}

  listerProfesseurs(): Observable<Professeur[]> {
    return this.http.get<Professeur[]>(`${this.baseUrl}/professeurs`);
  }
  creerProfesseur(request: ProfesseurRequest): Observable<Professeur> {
    return this.http.post<Professeur>(`${this.baseUrl}/professeurs`, request);
  }

  listerAffectations(): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(`${this.baseUrl}/affectations`);
  }
  creerAffectation(request: AffectationRequest): Observable<Affectation> {
    return this.http.post<Affectation>(`${this.baseUrl}/affectations`, request);
  }
  modifierAffectation(id: string, request: AffectationRequest): Observable<Affectation> {
    return this.http.put<Affectation>(`${this.baseUrl}/affectations/${id}`, request);
  }
  supprimerAffectation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/affectations/${id}`);
  }

  listerSeances(): Observable<SeanceCours[]> {
    return this.http.get<SeanceCours[]>(`${this.baseUrl}/seances`);
  }
  creerSeance(request: SeanceCoursRequest): Observable<SeanceCours> {
    return this.http.post<SeanceCours>(`${this.baseUrl}/seances`, request);
  }
  modifierSeance(id: string, request: SeanceCoursRequest): Observable<SeanceCours> {
    return this.http.put<SeanceCours>(`${this.baseUrl}/seances/${id}`, request);
  }
  supprimerSeance(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/seances/${id}`);
  }

  listerPresences(seanceId: string): Observable<Presence[]> {
    return this.http.get<Presence[]>(`${this.baseUrl}/seances/${seanceId}/presences`);
  }
  releverPresence(seanceId: string, request: PresenceRequest): Observable<Presence> {
    return this.http.post<Presence>(`${this.baseUrl}/seances/${seanceId}/presences`, request);
  }
}
