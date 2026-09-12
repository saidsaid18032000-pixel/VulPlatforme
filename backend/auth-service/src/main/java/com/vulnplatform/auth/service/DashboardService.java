package com.vulnplatform.auth.service;

import com.vulnplatform.auth.dto.DashboardStatsResponse;
import com.vulnplatform.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final JdbcTemplate jdbcTemplate;

    public DashboardService(
            UserRepository userRepository,
            AuditLogService auditLogService,
            JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        DashboardStatsResponse stats = new DashboardStatsResponse();

        // 1. User counts
        stats.setUsersCount(userRepository.count());
        stats.setActiveUsersCount(userRepository.countByIsActive(true));

        // 2. Assets counts & distribution
        long assetsCount = queryCount("SELECT COUNT(*) FROM assets");
        stats.setAssetsCount(assetsCount);

        Map<String, Long> assetsByType = new HashMap<>();
        try {
            jdbcTemplate.query(
                "SELECT asset_type, COUNT(*) as cnt FROM assets GROUP BY asset_type",
                rs -> {
                    assetsByType.put(rs.getString("asset_type"), rs.getLong("cnt"));
                }
            );
        } catch (Exception e) {
            log.warn("Error querying assets by type: {}", e.getMessage());
        }
        stats.setAssetsByType(assetsByType);

        // 3. Scans count
        stats.setScansCount(queryCount("SELECT COUNT(*) FROM scans"));

        // 4. Vulnerabilities counts & distributions
        stats.setVulnerabilitiesCount(queryCount("SELECT COUNT(*) FROM vulnerabilities"));
        stats.setCriticalAlertsCount(queryCount("SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'CRITICAL' AND status = 'OPEN'"));

        Map<String, Long> vulnBySeverity = new HashMap<>();
        vulnBySeverity.put("CRITICAL", 0L);
        vulnBySeverity.put("HIGH", 0L);
        vulnBySeverity.put("MEDIUM", 0L);
        vulnBySeverity.put("LOW", 0L);

        try {
            jdbcTemplate.query(
                "SELECT severity, COUNT(*) as cnt FROM vulnerabilities GROUP BY severity",
                rs -> {
                    String sev = rs.getString("severity");
                    if (sev != null) {
                        vulnBySeverity.put(sev.toUpperCase(), rs.getLong("cnt"));
                    }
                }
            );
        } catch (Exception e) {
            log.warn("Error querying vulnerabilities by severity: {}", e.getMessage());
        }
        stats.setVulnerabilitiesBySeverity(vulnBySeverity);

        Map<String, Long> vulnByStatus = new HashMap<>();
        try {
            jdbcTemplate.query(
                "SELECT status, COUNT(*) as cnt FROM vulnerabilities GROUP BY status",
                rs -> {
                    String st = rs.getString("status");
                    if (st != null) {
                        vulnByStatus.put(st.toUpperCase(), rs.getLong("cnt"));
                    }
                }
            );
        } catch (Exception e) {
            log.warn("Error querying vulnerabilities by status: {}", e.getMessage());
        }
        stats.setVulnerabilitiesByStatus(vulnByStatus);

        // 5. Recent activity
        stats.setRecentActivity(auditLogService.getRecentLogs());

        return stats;
    }

    private long queryCount(String sql) {
        try {
            Long count = jdbcTemplate.queryForObject(sql, Long.class);
            return count != null ? count : 0L;
        } catch (Exception e) {
            log.warn("Error running count query [{}]: {}", sql, e.getMessage());
            return 0L;
        }
    }
}
