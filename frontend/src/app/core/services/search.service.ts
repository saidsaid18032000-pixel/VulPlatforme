import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SearchResponse } from '../models/search.models';

@Injectable({
  providedIn: 'root',
})
export class SearchApiService {
  private readonly baseUrl = '/api/vulnerabilities';

  constructor(private http: HttpClient) {}

  search(q: string, severity?: string, status?: string, size = 25): Observable<SearchResponse> {
    let params = new HttpParams().set('q', q || '').set('size', String(size));
    if (severity && severity !== 'ALL') params = params.set('severity', severity);
    if (status && status !== 'ALL') params = params.set('status', status);
    return this.http.get<SearchResponse>(`${this.baseUrl}/search`, { params });
  }

  reindex(): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(`${this.baseUrl}/search/reindex`, {});
  }
}
