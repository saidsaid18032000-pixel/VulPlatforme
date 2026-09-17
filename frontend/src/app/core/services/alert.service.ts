import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Alert, AlertStats } from '../models/vuln-alert.models';

@Injectable({
  providedIn: 'root',
})
export class AlertApiService {
  private readonly baseUrl = '/api/alerts';

  constructor(private http: HttpClient) {}

  getAll(search?: string, severity?: string, status?: string): Observable<Alert[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    if (severity && severity !== 'ALL') params = params.set('severity', severity);
    if (status && status !== 'ALL') params = params.set('status', status);
    return this.http.get<Alert[]>(this.baseUrl, { params });
  }

  getById(id: string): Observable<Alert> {
    return this.http.get<Alert>(`${this.baseUrl}/${id}`);
  }

  getStats(): Observable<AlertStats> {
    return this.http.get<AlertStats>(`${this.baseUrl}/stats`);
  }

  syncFromVulnerabilities(): Observable<{ created: number; message: string }> {
    return this.http.post<{ created: number; message: string }>(`${this.baseUrl}/sync`, {});
  }

  acknowledge(id: string): Observable<Alert> {
    return this.http.post<Alert>(`${this.baseUrl}/${id}/acknowledge`, {});
  }

  resolve(id: string): Observable<Alert> {
    return this.http.post<Alert>(`${this.baseUrl}/${id}/resolve`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
