import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateReportRequest, Report, ReportStats } from '../models/report.models';

@Injectable({
  providedIn: 'root',
})
export class ReportApiService {
  private readonly baseUrl = '/api/reports';

  constructor(private http: HttpClient) {}

  getAll(search?: string, type?: string): Observable<Report[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    if (type && type !== 'ALL') params = params.set('type', type);
    return this.http.get<Report[]>(this.baseUrl, { params });
  }

  getById(id: string): Observable<Report> {
    return this.http.get<Report>(`${this.baseUrl}/${id}`);
  }

  getStats(): Observable<ReportStats> {
    return this.http.get<ReportStats>(`${this.baseUrl}/stats`);
  }

  create(payload: CreateReportRequest): Observable<Report> {
    return this.http.post<Report>(this.baseUrl, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
