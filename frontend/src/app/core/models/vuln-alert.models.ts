export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type VulnerabilityStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'REMEDIATED'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'ACCEPTED_RISK';

export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Vulnerability {
  id: string;
  cveId?: string | null;
  title: string;
  description?: string | null;
  severity: Severity;
  cvssScore?: number | null;
  status: VulnerabilityStatus;
  assetId?: string | null;
  scanId?: string | null;
  discoveredAt?: string | null;
  remediatedAt?: string | null;
  createdAt?: string | null;
}

export interface VulnerabilityStats {
  totalVulnerabilities: number;
  openVulnerabilities: number;
  inProgressVulnerabilities: number;
  remediatedVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface CreateVulnerabilityRequest {
  cveId?: string;
  title: string;
  description?: string;
  severity: Severity;
  cvssScore?: number | null;
  status?: VulnerabilityStatus;
  assetId?: string | null;
  scanId?: string | null;
}

export interface Alert {
  id: string;
  title: string;
  message?: string | null;
  severity: Severity;
  status: AlertStatus;
  vulnerabilityId?: string | null;
  assetId?: string | null;
  cveId?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
}

export interface AlertStats {
  totalAlerts: number;
  newAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
}
