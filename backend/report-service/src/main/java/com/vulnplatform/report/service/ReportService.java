package com.vulnplatform.report.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vulnplatform.report.dto.CreateReportRequest;
import com.vulnplatform.report.dto.ReportResponse;
import com.vulnplatform.report.dto.ReportStatsResponse;
import com.vulnplatform.report.entity.Report;
import com.vulnplatform.report.entity.ReportStatus;
import com.vulnplatform.report.entity.ReportType;
import com.vulnplatform.report.repository.ReportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    private final ReportRepository reportRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PdfReportGenerator pdfReportGenerator;
    private final ObjectMapper objectMapper;

    public ReportService(
            ReportRepository reportRepository,
            JdbcTemplate jdbcTemplate,
            PdfReportGenerator pdfReportGenerator,
            ObjectMapper objectMapper) {
        this.reportRepository = reportRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.pdfReportGenerator = pdfReportGenerator;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> getAll(String search, ReportType type) {
        List<Report> reports;
        if (search != null && !search.trim().isEmpty()) {
            reports = reportRepository.findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(search.trim());
        } else {
            reports = reportRepository.findAllByOrderByCreatedAtDesc();
        }
        return reports.stream()
                .filter(r -> type == null || r.getReportType() == type)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReportResponse getById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public ReportResponse create(CreateReportRequest request) {
        Instant end = Instant.now();
        Instant start = end.minus(30, ChronoUnit.DAYS);
        Map<String, Object> summary = buildSummary(request.getReportType());

        Report report = Report.builder()
                .title(request.getTitle().trim())
                .reportType(request.getReportType())
                .status(ReportStatus.READY)
                .periodStart(start)
                .periodEnd(end)
                .summaryJson(toJson(summary))
                .createdAt(Instant.now())
                .build();

        Report saved = reportRepository.save(report);
        log.info("Report created: {} [{}] id={}", saved.getTitle(), saved.getReportType(), saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID id) {
        if (!reportRepository.existsById(id)) {
            throw new NoSuchElementException("Rapport introuvable avec l'identifiant : " + id);
        }
        reportRepository.deleteById(id);
        log.info("Report deleted id={}", id);
    }

    @Transactional(readOnly = true)
    public ReportStatsResponse getStats() {
        long total = reportRepository.count();
        Map<String, Long> byType = new HashMap<>();
        for (Object[] row : reportRepository.countByTypeGrouped()) {
            if (row[0] != null) {
                byType.put(row[0].toString(), (Long) row[1]);
            }
        }
        return ReportStatsResponse.builder()
                .totalReports(total)
                .securitySummaryCount(reportRepository.countByReportType(ReportType.SECURITY_SUMMARY))
                .vulnerabilityCount(reportRepository.countByReportType(ReportType.VULNERABILITY))
                .assetInventoryCount(reportRepository.countByReportType(ReportType.ASSET_INVENTORY))
                .executiveCount(reportRepository.countByReportType(ReportType.EXECUTIVE))
                .byType(byType)
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] exportPdf(UUID id) {
        Report report = findOrThrow(id);
        Map<String, Object> summary = parseSummary(report.getSummaryJson());
        return pdfReportGenerator.generate(report, summary);
    }

    public Map<String, Object> buildSummary(ReportType type) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("generatedAt", Instant.now().toString());
        summary.put("reportType", type.name());

        long assets = countSafe("SELECT COUNT(*) FROM assets");
        long activeAssets = countSafe("SELECT COUNT(*) FROM assets WHERE status = 'ACTIVE'");
        long criticalAssets = countSafe("SELECT COUNT(*) FROM assets WHERE criticality = 'CRITICAL'");
        long scans = countSafe("SELECT COUNT(*) FROM scans");
        long completedScans = countSafe("SELECT COUNT(*) FROM scans WHERE status = 'COMPLETED'");
        long vulns = countSafe("SELECT COUNT(*) FROM vulnerabilities");
        long openVulns = countSafe("SELECT COUNT(*) FROM vulnerabilities WHERE status IN ('OPEN','IN_PROGRESS')");
        long criticalVulns = countSafe("SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'CRITICAL'");
        long highVulns = countSafe("SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'HIGH'");
        long alerts = countSafe("SELECT COUNT(*) FROM alerts");
        long newAlerts = countSafe("SELECT COUNT(*) FROM alerts WHERE status = 'NEW'");

        summary.put("assets", Map.of(
                "total", assets,
                "active", activeAssets,
                "critical", criticalAssets
        ));
        summary.put("scans", Map.of(
                "total", scans,
                "completed", completedScans
        ));
        summary.put("vulnerabilities", Map.of(
                "total", vulns,
                "open", openVulns,
                "critical", criticalVulns,
                "high", highVulns
        ));
        summary.put("alerts", Map.of(
                "total", alerts,
                "new", newAlerts
        ));

        List<Map<String, Object>> topVulns = jdbcTemplate.queryForList(
                """
                SELECT cve_id, title, severity, cvss_score, status
                FROM vulnerabilities
                ORDER BY
                  CASE severity
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    WHEN 'LOW' THEN 4
                    ELSE 5
                  END,
                  cvss_score DESC NULLS LAST
                LIMIT 10
                """
        );
        summary.put("topVulnerabilities", topVulns);

        String riskLevel;
        if (criticalVulns > 0 || newAlerts >= 5) {
            riskLevel = "CRITICAL";
        } else if (highVulns > 0 || openVulns > 10) {
            riskLevel = "HIGH";
        } else if (openVulns > 0) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "LOW";
        }
        summary.put("overallRisk", riskLevel);
        summary.put("recommendations", buildRecommendations(criticalVulns, highVulns, openVulns, newAlerts, type));

        return summary;
    }

    private List<String> buildRecommendations(
            long criticalVulns, long highVulns, long openVulns, long newAlerts, ReportType type) {
        List<String> recs = new ArrayList<>();
        if (criticalVulns > 0) {
            recs.add("Traiter en priorité les vulnérabilités CRITICAL encore ouvertes.");
        }
        if (highVulns > 0) {
            recs.add("Planifier la remédiation des vulnérabilités HIGH sous 7 jours.");
        }
        if (newAlerts > 0) {
            recs.add("Acquitter et trier les alertes NEW dans le centre SOC.");
        }
        if (openVulns == 0) {
            recs.add("Maintenir le rythme de scans périodiques et la veille CVE.");
        }
        if (type == ReportType.EXECUTIVE) {
            recs.add("Présenter le niveau de risque global à la direction SSI.");
        }
        if (recs.isEmpty()) {
            recs.add("Aucune action critique immédiate détectée.");
        }
        return recs;
    }

    private long countSafe(String sql) {
        try {
            Long value = jdbcTemplate.queryForObject(sql, Long.class);
            return value != null ? value : 0L;
        } catch (Exception e) {
            log.warn("Count query failed: {}", e.getMessage());
            return 0L;
        }
    }

    private Report findOrThrow(UUID id) {
        return reportRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Rapport introuvable avec l'identifiant : " + id));
    }

    private String toJson(Map<String, Object> summary) {
        try {
            return objectMapper.writeValueAsString(summary);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Impossible de sérialiser le résumé du rapport", e);
        }
    }

    private Map<String, Object> parseSummary(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Map.of("raw", json);
        }
    }

    private ReportResponse toResponse(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .title(report.getTitle())
                .reportType(report.getReportType())
                .status(report.getStatus())
                .periodStart(report.getPeriodStart())
                .periodEnd(report.getPeriodEnd())
                .summary(parseSummary(report.getSummaryJson()))
                .createdAt(report.getCreatedAt())
                .build();
    }
}
