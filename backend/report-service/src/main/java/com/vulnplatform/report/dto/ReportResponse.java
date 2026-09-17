package com.vulnplatform.report.dto;

import com.vulnplatform.report.entity.ReportStatus;
import com.vulnplatform.report.entity.ReportType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {
    private UUID id;
    private String title;
    private ReportType reportType;
    private ReportStatus status;
    private Instant periodStart;
    private Instant periodEnd;
    private Map<String, Object> summary;
    private Instant createdAt;
}
