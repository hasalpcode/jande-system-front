import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { DocumentGenere, GenererDocumentRequest, TemplateDocument, TemplateDocumentRequest } from '../models/documents.models';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly baseUrl = `${API_BASE_URL}/admin/documents`;

  constructor(private readonly http: HttpClient) {}

  listerTemplates(): Observable<TemplateDocument[]> {
    return this.http.get<TemplateDocument[]>(`${this.baseUrl}/templates`);
  }
  enregistrerTemplate(request: TemplateDocumentRequest): Observable<TemplateDocument> {
    return this.http.post<TemplateDocument>(`${this.baseUrl}/templates`, request);
  }
  supprimerTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/templates/${id}`);
  }

  listerParEtudiant(etudiantId: string): Observable<DocumentGenere[]> {
    return this.http.get<DocumentGenere[]>(`${this.baseUrl}/etudiants/${etudiantId}`);
  }
  generer(request: GenererDocumentRequest): Observable<DocumentGenere> {
    return this.http.post<DocumentGenere>(this.baseUrl, request);
  }
  supprimerDocumentGenere(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Blob plutot qu'un lien direct : l'endpoint est protege par JWT, un <a href>
   * nu ne porterait pas l'en-tete Authorization. */
  telechargerPdf(documentGenereId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${documentGenereId}/pdf`, { responseType: 'blob' });
  }
}
