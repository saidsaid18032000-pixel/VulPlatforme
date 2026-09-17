package com.vulnplatform.alert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertStatsResponse {
    private long totalAlerts;
    private long newAlerts;
    private long acknowledgedAlerts;
    private long resolvedAlerts;
    private long criticalAlerts;
    private long highAlerts;
    private Map<String, Long> bySeverity;
    private Map<String, Long> byStatus;
}
