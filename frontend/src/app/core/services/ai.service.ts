import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiInsights, PrioritizeResponse, RemediationAdvice } from '../models/ai.models';

@Injectable({
  providedIn: 'root',
})
export class AiApiService {
  private readonly baseUrl = '/api/ai';

  constructor(private http: HttpClient) {}

  getInsights(): Observable<AiInsights> {
    return this.http.get<AiInsights>(`${this.baseUrl}/insights`);
  }

  prioritize(limit = 20): Observable<PrioritizeResponse> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<PrioritizeResponse>(`${this.baseUrl}/prioritize`, { params });
  }

  recommend(vulnerabilityId: string): Observable<RemediationAdvice> {
    return this.http.get<RemediationAdvice>(`${this.baseUrl}/recommend/${vulnerabilityId}`);
  }
}
