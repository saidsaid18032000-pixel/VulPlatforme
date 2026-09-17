export type ReportType = 'SECURITY_SUMMARY' | 'VULNERABILITY' | 'ASSET_INVENTORY' | 'EXECUTIVE';
export type ReportStatus = 'GENERATING' | 'READY' | 'FAILED';

export interface ReportSummary {
  generatedAt?: string;
  reportType?: string;
  overallRisk?: string;
  assets?: { total?: number; active?: number; critical?: number };
  scans?: { total?: number; completed?: number };
  vulnerabilities?: { total?: number; open?: number; critical?: number; high?: number };
  alerts?: { total?: number; new?: number };
  topVulnerabilities?: Array<Record<string, unknown>>;
  recommendations?: string[];
  [key: string]: unknown;
}

export interface Report {
  id: string;
  title: string;
  reportType: ReportType;
  status: ReportStatus;
  periodStart?: string | null;
  periodEnd?: string | null;
  summary?: ReportSummary | null;
  createdAt?: string | null;
}

export interface ReportStats {
  totalReports: number;
  securitySummaryCount: number;
  vulnerabilityCount: number;
  assetInventoryCount: number;
  executiveCount: number;
  byType: Record<string, number>;
}

export interface CreateReportRequest {
  title: string;
  reportType: ReportType;
}
