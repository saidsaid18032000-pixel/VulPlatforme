package com.vulnplatform.alert;

import com.vulnplatform.alert.dto.AlertRequest;
import com.vulnplatform.alert.dto.AlertResponse;
import com.vulnplatform.alert.dto.AlertStatsResponse;
import com.vulnplatform.alert.entity.Alert;
import com.vulnplatform.alert.entity.AlertSeverity;
import com.vulnplatform.alert.entity.AlertStatus;
import com.vulnplatform.alert.repository.AlertRepository;
import com.vulnplatform.alert.service.AlertNotificationService;
import com.vulnplatform.alert.service.AlertService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private AlertNotificationService notificationService;

    @InjectMocks
    private AlertService alertService;

    private UUID alertId;
    private Alert sample;

    @BeforeEach
    void setUp() {
        alertId = UUID.randomUUID();
        sample = Alert.builder()
                .id(alertId)
                .title("[CVE-2021-44228] Log4Shell")
                .message("Alerte critique")
                .severity(AlertSeverity.CRITICAL)
                .status(AlertStatus.NEW)
                .cveId("CVE-2021-44228")
                .createdAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Devrait créer une alerte")
    void shouldCreate() {
        AlertRequest req = AlertRequest.builder()
                .title("[CVE-2021-44228] Log4Shell")
                .message("Alerte critique")
                .severity(AlertSeverity.CRITICAL)
                .cveId("CVE-2021-44228")
                .build();

        when(alertRepository.save(any(Alert.class))).thenReturn(sample);

        AlertResponse response = alertService.create(req);

        assertThat(response.getId()).isEqualTo(alertId);
        assertThat(response.getSeverity()).isEqualTo(AlertSeverity.CRITICAL);
    }

    @Test
    @DisplayName("Devrait acquitter une alerte")
    void shouldAcknowledge() {
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(sample));
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> inv.getArgument(0));

        AlertResponse response = alertService.acknowledge(alertId);

        assertThat(response.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
        assertThat(response.getAcknowledgedAt()).isNotNull();
    }

    @Test
    @DisplayName("Devrait résoudre une alerte")
    void shouldResolve() {
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(sample));
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> inv.getArgument(0));

        AlertResponse response = alertService.resolve(alertId);

        assertThat(response.getStatus()).isEqualTo(AlertStatus.RESOLVED);
        assertThat(response.getResolvedAt()).isNotNull();
    }

    @Test
    @DisplayName("Devrait lever une exception si introuvable")
    void shouldThrowWhenNotFound() {
        when(alertRepository.findById(alertId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> alertService.getById(alertId))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    @DisplayName("Devrait calculer les statistiques")
    void shouldGetStats() {
        when(alertRepository.count()).thenReturn(4L);
        when(alertRepository.countByStatus(AlertStatus.NEW)).thenReturn(2L);
        when(alertRepository.countByStatus(AlertStatus.ACKNOWLEDGED)).thenReturn(1L);
        when(alertRepository.countByStatus(AlertStatus.RESOLVED)).thenReturn(1L);
        when(alertRepository.countBySeverity(AlertSeverity.CRITICAL)).thenReturn(1L);
        when(alertRepository.countBySeverity(AlertSeverity.HIGH)).thenReturn(2L);
        when(alertRepository.countBySeverityGrouped()).thenReturn(List.of());
        when(alertRepository.countByStatusGrouped()).thenReturn(List.of());

        AlertStatsResponse stats = alertService.getStats();

        assertThat(stats.getTotalAlerts()).isEqualTo(4L);
        assertThat(stats.getNewAlerts()).isEqualTo(2L);
        assertThat(stats.getCriticalAlerts()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Devrait générer des alertes depuis les vulnérabilités critiques")
    void shouldGenerateFromVulnerabilities() {
        UUID vulnId = UUID.randomUUID();
        Map<String, Object> row = new HashMap<>();
        row.put("id", vulnId);
        row.put("cve_id", "CVE-2021-44228");
        row.put("title", "Log4Shell");
        row.put("description", "RCE");
        row.put("severity", "CRITICAL");
        row.put("asset_id", null);

        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(row));
        when(alertRepository.existsByVulnerabilityIdAndStatusIn(eq(vulnId), anyList())).thenReturn(false);
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> {
            Alert a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        int created = alertService.generateFromCriticalVulnerabilities();

        assertThat(created).isEqualTo(1);
        verify(alertRepository).save(any(Alert.class));
    }

    @Test
    @DisplayName("Devrait supprimer une alerte")
    void shouldDelete() {
        when(alertRepository.existsById(alertId)).thenReturn(true);

        alertService.delete(alertId);

        verify(alertRepository).deleteById(alertId);
    }
}
