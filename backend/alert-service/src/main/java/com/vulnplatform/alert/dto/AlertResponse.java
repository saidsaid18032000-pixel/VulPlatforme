package com.vulnplatform.alert.dto;

import com.vulnplatform.alert.entity.AlertSeverity;
import com.vulnplatform.alert.entity.AlertStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertResponse {
    private UUID id;
    private String title;
    private String message;
    private AlertSeverity severity;
    private AlertStatus status;
    private UUID vulnerabilityId;
    private UUID assetId;
    private String cveId;
    private Instant acknowledgedAt;
    private Instant resolvedAt;
    private Instant createdAt;
}
