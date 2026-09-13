import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Asset, AssetStats, CreateAssetRequest } from '../models/asset-scan.models';

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  private readonly baseUrl = '/api/assets';

  constructor(private http: HttpClient) {}

  getAssets(
    search?: string,
    type?: string,
    criticality?: string,
    status?: string
  ): Observable<Asset[]> {
    let params = new HttpParams();
    if (search && search.trim()) params = params.set('search', search.trim());
    if (type && type !== 'ALL') params = params.set('type', type);
    if (criticality && criticality !== 'ALL') params = params.set('criticality', criticality);
    if (status && status !== 'ALL') params = params.set('status', status);

    return this.http.get<Asset[]>(this.baseUrl, { params });
  }

  getAssetById(id: string): Observable<Asset> {
    return this.http.get<Asset>(`${this.baseUrl}/${id}`);
  }

  getStats(): Observable<AssetStats> {
    return this.http.get<AssetStats>(`${this.baseUrl}/stats`);
  }

  createAsset(payload: CreateAssetRequest): Observable<Asset> {
    return this.http.post<Asset>(this.baseUrl, payload);
  }

  updateAsset(id: string, payload: CreateAssetRequest): Observable<Asset> {
    return this.http.put<Asset>(`${this.baseUrl}/${id}`, payload);
  }

  deleteAsset(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
