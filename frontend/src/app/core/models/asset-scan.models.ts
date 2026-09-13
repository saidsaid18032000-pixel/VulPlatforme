export type AssetType =
  | 'SERVER'
  | 'WORKSTATION'
  | 'NETWORK'
  | 'DATABASE'
  | 'WEB_APPLICATION'
  | 'CLOUD_INSTANCE';

export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';

export interface Asset {
  id: string;
  name: string;
  assetType: AssetType;
  ipAddress?: string;
  hostname?: string;
  macAddress?: string;
  os?: string;
  criticality: Criticality;
  status: AssetStatus;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAssetRequest {
  name: string;
  assetType: AssetType;
  ipAddress?: string;
  hostname?: string;
  macAddress?: string;
  os?: string;
  criticality?: Criticality;
  status?: AssetStatus;
  description?: string;
}

export interface AssetStats {
  totalAssets: number;
  activeAssets: number;
  criticalAssets: number;
  highAssets: number;
  assetsByType: Record<string, number>;
  assetsByCriticality: Record<string, number>;
  assetsByStatus: Record<string, number>;
}

export type ScanType = 'NETWORK' | 'WEB_APPLICATION' | 'PORT_SCAN' | 'COMPLIANCE' | 'CVE_SCAN';

export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Scan {
  id: string;
  name: string;
  scanType: ScanType;
  status: ScanStatus;
  progress: number;
  targetsCount: number;
  vulnerabilitiesFound: number;
  startedAt?: string;
  finishedAt?: string;
  createdBy?: string;
  targetAssetIds: string[];
  summary?: string;
  createdAt: string;
}

export interface CreateScanRequest {
  name: string;
  scanType: ScanType;
  targetAssetIds?: string[];
  intensity?: string;
}

export interface ScanStats {
  totalScans: number;
  runningScans: number;
  completedScans: number;
  failedScans: number;
  totalVulnerabilitiesFound: number;
  scansByType: Record<string, number>;
  scansByStatus: Record<string, number>;
}
