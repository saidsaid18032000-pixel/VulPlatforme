package com.vulnplatform.scan.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanStatsResponse {

    private long totalScans;
    private long runningScans;
    private long completedScans;
    private long failedScans;
    private long totalVulnerabilitiesFound;
    private Map<String, Long> scansByType;
    private Map<String, Long> scansByStatus;
}
