package com.vulnplatform.alert.repository;

import com.vulnplatform.alert.entity.Alert;
import com.vulnplatform.alert.entity.AlertSeverity;
import com.vulnplatform.alert.entity.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {

    List<Alert> findAllByOrderByCreatedAtDesc();

    List<Alert> findByTitleContainingIgnoreCaseOrCveIdContainingIgnoreCaseOrMessageContainingIgnoreCaseOrderByCreatedAtDesc(
            String title, String cveId, String message);

    long countByStatus(AlertStatus status);

    long countBySeverity(AlertSeverity severity);

    Optional<Alert> findFirstByVulnerabilityIdAndStatusNot(UUID vulnerabilityId, AlertStatus status);

    boolean existsByVulnerabilityIdAndStatusIn(UUID vulnerabilityId, List<AlertStatus> statuses);

    @Query("SELECT a.severity, COUNT(a) FROM Alert a GROUP BY a.severity")
    List<Object[]> countBySeverityGrouped();

    @Query("SELECT a.status, COUNT(a) FROM Alert a GROUP BY a.status")
    List<Object[]> countByStatusGrouped();
}
