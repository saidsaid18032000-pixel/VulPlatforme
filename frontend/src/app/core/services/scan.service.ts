import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateScanRequest, Scan, ScanStats } from '../models/asset-scan.models';

@Injectable({
  providedIn: 'root',
})
export class ScanService {
  private readonly baseUrl = '/api/scans';

  constructor(private http: HttpClient) {}

  getScans(search?: string, type?: string, status?: string): Observable<Scan[]> {
    let params = new HttpParams();
    if (search && search.trim()) params = params.set('search', search.trim());
    if (type && type !== 'ALL') params = params.set('type', type);
    if (status && status !== 'ALL') params = params.set('status', status);

    return this.http.get<Scan[]>(this.baseUrl, { params });
  }

  getScanById(id: string): Observable<Scan> {
    return this.http.get<Scan>(`${this.baseUrl}/${id}`);
  }

  getStats(): Observable<ScanStats> {
    return this.http.get<ScanStats>(`${this.baseUrl}/stats`);
  }

  createScan(payload: CreateScanRequest): Observable<Scan> {
    return this.http.post<Scan>(this.baseUrl, payload);
  }

  cancelScan(id: string): Observable<Scan> {
    return this.http.post<Scan>(`${this.baseUrl}/${id}/cancel`, {});
  }

  deleteScan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
