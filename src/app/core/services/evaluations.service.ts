import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  BulletinDetailResponse,
  BulletinResponse,
  ConseilClasseResponse,
  CreerBulletinRequest,
  ImportNotesClasseResponse,
  LigneNoteClasseResponse,
  NoteMatiereRequest,
  SaisirNotesClasseRequest,
  UniteEnseignementCurriculumResponse,
} from '../models/evaluations.models';

@Injectable({ providedIn: 'root' })
export class EvaluationsService {
  private readonly baseUrl = `${API_BASE_URL}/admin/evaluations`;

  constructor(private readonly http: HttpClient) {}

  listerBulletins(etudiantId: string): Observable<BulletinResponse[]> {
    return this.http.get<BulletinResponse[]>(`${this.baseUrl}/bulletins/etudiant/${etudiantId}`);
  }

  listerBulletinsClasse(classeId: string, semestreId: string): Observable<BulletinResponse[]> {
    return this.http.get<BulletinResponse[]>(`${this.baseUrl}/bulletins/classe/${classeId}/semestre/${semestreId}`);
  }

  conseilClasse(classeId: string, semestreId: string): Observable<ConseilClasseResponse> {
    return this.http.get<ConseilClasseResponse>(`${this.baseUrl}/conseil-classe/classe/${classeId}/semestre/${semestreId}`);
  }

  creerBulletin(request: CreerBulletinRequest): Observable<BulletinResponse> {
    return this.http.post<BulletinResponse>(`${this.baseUrl}/bulletins`, request);
  }

  detailBulletin(bulletinId: string): Observable<BulletinDetailResponse> {
    return this.http.get<BulletinDetailResponse>(`${this.baseUrl}/bulletins/${bulletinId}`);
  }

  ajouterMatiere(bulletinId: string, request: NoteMatiereRequest): Observable<BulletinDetailResponse> {
    return this.http.post<BulletinDetailResponse>(`${this.baseUrl}/bulletins/${bulletinId}/matieres`, request);
  }

  effacerMatiere(bulletinId: string, elementConstitutifId: string): Observable<BulletinDetailResponse> {
    return this.http.delete<BulletinDetailResponse>(`${this.baseUrl}/bulletins/${bulletinId}/matieres/${elementConstitutifId}`);
  }

  modifierAppreciation(bulletinId: string, appreciationConseilClasse: string): Observable<BulletinDetailResponse> {
    return this.http.put<BulletinDetailResponse>(`${this.baseUrl}/bulletins/${bulletinId}/appreciation`, { appreciationConseilClasse });
  }

  // ----- Saisie des notes par classe (+ import Excel) -----

  curriculumSemestre(semestreId: string): Observable<UniteEnseignementCurriculumResponse[]> {
    return this.http.get<UniteEnseignementCurriculumResponse[]>(`${this.baseUrl}/elements-constitutifs/semestre/${semestreId}`);
  }

  notesClasse(classeId: string, semestreId: string, elementConstitutifId: string): Observable<LigneNoteClasseResponse[]> {
    return this.http.get<LigneNoteClasseResponse[]>(
      `${this.baseUrl}/notes/classe/${classeId}/semestre/${semestreId}/ec/${elementConstitutifId}`,
    );
  }

  saisirNotesClasse(request: SaisirNotesClasseRequest): Observable<LigneNoteClasseResponse[]> {
    return this.http.post<LigneNoteClasseResponse[]>(`${this.baseUrl}/notes/classe`, request);
  }

  /** Blob plutot qu'un lien direct : l'endpoint est protege par JWT, un <a href> nu ne
   * porterait pas l'en-tete Authorization (meme pattern que DocumentsService). */
  telechargerModeleNotes(classeId: string, semestreId: string, elementConstitutifId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/notes/classe/${classeId}/semestre/${semestreId}/ec/${elementConstitutifId}/modele`, {
      responseType: 'blob',
    });
  }

  importerNotesClasse(
    classeId: string,
    semestreId: string,
    elementConstitutifId: string,
    fichier: File,
  ): Observable<ImportNotesClasseResponse> {
    const donnees = new FormData();
    donnees.set('classeId', classeId);
    donnees.set('semestreId', semestreId);
    donnees.set('elementConstitutifId', elementConstitutifId);
    donnees.set('fichier', fichier);
    return this.http.post<ImportNotesClasseResponse>(`${this.baseUrl}/notes/classe/import`, donnees);
  }
}
