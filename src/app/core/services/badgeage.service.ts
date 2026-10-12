import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { BadgeageEtudiantResponse, BadgerRequest } from '../models/badgeage.models';

@Injectable({ providedIn: 'root' })
export class BadgeageService {
  private readonly baseUrl = `${API_BASE_URL}/admin/badgeage`;

  constructor(private readonly http: HttpClient) {}

  badger(request: BadgerRequest): Observable<BadgeageEtudiantResponse> {
    return this.http.post<BadgeageEtudiantResponse>(`${this.baseUrl}/etudiants`, request);
  }
}
