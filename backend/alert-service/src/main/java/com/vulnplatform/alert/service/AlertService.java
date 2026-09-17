package com.vulnplatform.alert.service;

import com.vulnplatform.alert.dto.AlertRequest;
import com.vulnplatform.alert.dto.AlertResponse;
import com.vulnplatform.alert.dto.AlertStatsResponse;
import com.vulnplatform.alert.entity.Alert;
import com.vulnplatform.alert.entity.AlertSeverity;
import com.vulnplatform.alert.entity.AlertStatus;
import com.vulnplatform.alert.repository.AlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final AlertRepository alertRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AlertNotificationService notificationService;

    public AlertService(
            AlertRepository alertRepository,
            JdbcTemplate jdbcTemplate,
            AlertNotificationService notificationService) {
        this.alertRepository = alertRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getAll(String search, AlertSeverity severity, AlertStatus status) {
        List<Alert> alerts;
        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim();
            alerts = alertRepository
                    .findByTitleContainingIgnoreCaseOrCveIdContainingIgnoreCaseOrMessageContainingIgnoreCaseOrderByCreatedAtDesc(
                            q, q, q);
        } else {
            alerts = alertRepository.findAllByOrderByCreatedAtDesc();
        }

        return alerts.stream()
                .filter(a -> severity == null || a.getSeverity() == severity)
                .filter(a -> status == null || a.getStatus() == status)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AlertResponse getById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public AlertResponse create(AlertRequest request) {
        Alert alert = Alert.builder()
                .title(request.getTitle().trim())
                .message(request.getMessage())
                .severity(request.getSeverity())
                .status(request.getStatus() != null ? request.getStatus() : AlertStatus.NEW)
                .vulnerabilityId(request.getVulnerabilityId())
                .assetId(request.getAssetId())
                .cveId(request.getCveId())
                .build();

        Alert saved = alertRepository.save(alert);
        log.info("Alert created: {} [{}] id={}", saved.getTitle(), saved.getSeverity(), saved.getId());
        notificationService.notifyNewAlert(saved);
        return toResponse(saved);
    }

    @Transactional
    public AlertResponse acknowledge(UUID id) {
        Alert alert = findOrThrow(id);
        if (alert.getStatus() == AlertStatus.RESOLVED) {
            throw new IllegalArgumentException("Impossible d'acquitter une alerte déjà résolue");
        }
        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        alert.setAcknowledgedAt(Instant.now());
        return toResponse(alertRepository.save(alert));
    }

    @Transactional
    public AlertResponse resolve(UUID id) {
        Alert alert = findOrThrow(id);
        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedAt(Instant.now());
        if (alert.getAcknowledgedAt() == null) {
            alert.setAcknowledgedAt(Instant.now());
        }
        return toResponse(alertRepository.save(alert));
    }

    @Transactional
    public void delete(UUID id) {
        if (!alertRepository.existsById(id)) {
            throw new NoSuchElementException("Alerte introuvable avec l'identifiant : " + id);
        }
        alertRepository.deleteById(id);
        log.info("Alert deleted id={}", id);
    }

    @Transactional(readOnly = true)
    public AlertStatsResponse getStats() {
        long total = alertRepository.count();
        long neu = alertRepository.countByStatus(AlertStatus.NEW);
        long ack = alertRepository.countByStatus(AlertStatus.ACKNOWLEDGED);
        long resolved = alertRepository.countByStatus(AlertStatus.RESOLVED);
        long critical = alertRepository.countBySeverity(AlertSeverity.CRITICAL);
        long high = alertRepository.countBySeverity(AlertSeverity.HIGH);

        Map<String, Long> bySeverity = new HashMap<>();
        for (Object[] row : alertRepository.countBySeverityGrouped()) {
            if (row[0] != null) {
                bySeverity.put(row[0].toString(), (Long) row[1]);
            }
        }

        Map<String, Long> byStatus = new HashMap<>();
        for (Object[] row : alertRepository.countByStatusGrouped()) {
            if (row[0] != null) {
                byStatus.put(row[0].toString(), (Long) row[1]);
            }
        }

        return AlertStatsResponse.builder()
                .totalAlerts(total)
                .newAlerts(neu)
                .acknowledgedAlerts(ack)
                .resolvedAlerts(resolved)
                .criticalAlerts(critical)
                .highAlerts(high)
                .bySeverity(bySeverity)
                .byStatus(byStatus)
                .build();
    }

    /**
     * Génère des alertes à partir des vulnérabilités CRITICAL/HIGH encore ouvertes.
     */
    @Transactional
    public int generateFromCriticalVulnerabilities() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT id, cve_id, title, description, severity, asset_id
                FROM vulnerabilities
                WHERE status IN ('OPEN', 'IN_PROGRESS')
                  AND severity IN ('CRITICAL', 'HIGH')
                ORDER BY discovered_at DESC
                LIMIT 200
                """
        );

        int created = 0;
        List<AlertStatus> openish = List.of(AlertStatus.NEW, AlertStatus.ACKNOWLEDGED);

        for (Map<String, Object> row : rows) {
            UUID vulnId = (UUID) row.get("id");
            if (alertRepository.existsByVulnerabilityIdAndStatusIn(vulnId, openish)) {
                continue;
            }

            String severityStr = Objects.toString(row.get("severity"), "HIGH");
            AlertSeverity severity = AlertSeverity.valueOf(severityStr);

            String cveId = row.get("cve_id") != null ? row.get("cve_id").toString() : null;
            String title = row.get("title") != null ? row.get("title").toString() : "Vulnérabilité critique";
            String description = row.get("description") != null ? row.get("description").toString() : "";
            UUID assetId = row.get("asset_id") != null ? (UUID) row.get("asset_id") : null;

            String alertTitle = (cveId != null ? "[" + cveId + "] " : "") + title;
            String message = "Alerte automatique générée depuis le catalogue des vulnérabilités. "
                    + (description.isBlank() ? "Sévérité " + severity + "." : description);

            Alert alert = Alert.builder()
                    .title(alertTitle.length() > 500 ? alertTitle.substring(0, 500) : alertTitle)
                    .message(message)
                    .severity(severity)
                    .status(AlertStatus.NEW)
                    .vulnerabilityId(vulnId)
                    .assetId(assetId)
                    .cveId(cveId)
                    .build();

            Alert saved = alertRepository.save(alert);
            notificationService.notifyNewAlert(saved);
            created++;
        }

        if (created > 0) {
            log.info("Generated {} alerts from critical/high vulnerabilities", created);
        }
        return created;
    }

    @Scheduled(fixedDelayString = "${alerts.sync-interval-ms:30000}")
    public void scheduledSync() {
        try {
            generateFromCriticalVulnerabilities();
        } catch (Exception e) {
            log.warn("Alert sync skipped: {}", e.getMessage());
        }
    }

    private Alert findOrThrow(UUID id) {
        return alertRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Alerte introuvable avec l'identifiant : " + id));
    }

    private AlertResponse toResponse(Alert a) {
        return AlertResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .message(a.getMessage())
                .severity(a.getSeverity())
                .status(a.getStatus())
                .vulnerabilityId(a.getVulnerabilityId())
                .assetId(a.getAssetId())
                .cveId(a.getCveId())
                .acknowledgedAt(a.getAcknowledgedAt())
                .resolvedAt(a.getResolvedAt())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
