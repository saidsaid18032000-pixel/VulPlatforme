package com.vulnplatform.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportStatsResponse {
    private long totalReports;
    private long securitySummaryCount;
    private long vulnerabilityCount;
    private long assetInventoryCount;
    private long executiveCount;
    private Map<String, Long> byType;
}
