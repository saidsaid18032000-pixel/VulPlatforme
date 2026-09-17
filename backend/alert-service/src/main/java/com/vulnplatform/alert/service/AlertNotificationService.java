package com.vulnplatform.alert.service;

import com.vulnplatform.alert.entity.Alert;
import com.vulnplatform.alert.entity.AlertSeverity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AlertNotificationService {

    private static final Logger log = LoggerFactory.getLogger(AlertNotificationService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final String webhookUrl;

    public AlertNotificationService(
            @Value("${alerts.webhook-url:}") String webhookUrl) {
        this.webhookUrl = webhookUrl != null ? webhookUrl.trim() : "";
    }

    public void notifyNewAlert(Alert alert) {
        if (alert == null) {
            return;
        }
        log.info(
                "SOC NOTIFICATION [{}] {} — {}",
                alert.getSeverity(),
                alert.getCveId() != null ? alert.getCveId() : "N/A",
                alert.getTitle());

        if (webhookUrl.isBlank()) {
            return;
        }
        if (alert.getSeverity() != AlertSeverity.CRITICAL && alert.getSeverity() != AlertSeverity.HIGH) {
            return;
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("event", "alert.created");
            payload.put("id", alert.getId() != null ? alert.getId().toString() : null);
            payload.put("title", alert.getTitle());
            payload.put("severity", alert.getSeverity() != null ? alert.getSeverity().name() : null);
            payload.put("cveId", alert.getCveId());
            payload.put("status", alert.getStatus() != null ? alert.getStatus().name() : null);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(webhookUrl, new HttpEntity<>(payload, headers), String.class);
            log.info("Webhook notification sent to {}", webhookUrl);
        } catch (Exception e) {
            log.warn("Webhook notification failed: {}", e.getMessage());
        }
    }
}
