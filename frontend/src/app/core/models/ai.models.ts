export interface AiInsights {
  engine: string;
  cached: boolean;
  overallRisk: string;
  metrics: {
    openVulnerabilities: number;
    criticalOpen: number;
    highOpen: number;
    newAlerts: number;
    criticalAssets: number;
  };
  topPriorities: PrioritizedVulnerability[];
  recommendedActions: string[];
  bandCounts: Record<string, number>;
}

export interface PrioritizedVulnerability {
  id: string;
  rank: number;
  cveId?: string;
  title: string;
  severity: string;
  cvssScore?: number;
  status: string;
  assetId?: string;
  assetName?: string;
  assetCriticality?: string;
  discoveredAt?: string;
  priorityScore: number;
  priorityBand: string;
  suggestedSlaHours: number;
  rationale: string[];
  scoreBreakdown?: Record<string, number>;
}

export interface PrioritizeResponse {
  engine: string;
  totalAnalyzed: number;
  returned: number;
  bandCounts: Record<string, number>;
  items: PrioritizedVulnerability[];
}

export interface RemediationAdvice {
  cveId?: string;
  vulnerabilityId?: string;
  title: string;
  priorityBand: string;
  priorityScore: number;
  suggestedOwner: string;
  suggestedSlaHours: number;
  remediationSteps: string[];
  summary: string;
}
