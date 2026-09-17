export interface SearchHit {
  id: string;
  cveId?: string;
  title: string;
  description?: string;
  severity?: string;
  cvssScore?: number;
  status?: string;
  assetId?: string;
  discoveredAt?: string;
  score?: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  cached: boolean;
  engine: string;
  hits: SearchHit[];
}
