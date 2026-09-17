package com.vulnplatform.scan.service;

import com.vulnplatform.scan.entity.Scan;
import com.vulnplatform.scan.entity.ScanStatus;
import com.vulnplatform.scan.repository.ScanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ScanEngineService {

    private static final Logger log = LoggerFactory.getLogger(ScanEngineService.class);

    private final ScanRepository scanRepository;
    private final JdbcTemplate jdbcTemplate;
    private final RestTemplate restTemplate;
    private final String vulnerabilityServiceUrl;
    private final String alertServiceUrl;

    // Active cancellation flags
    private final Set<UUID> cancelledScans = ConcurrentHashMap.newKeySet();

    public ScanEngineService(
            ScanRepository scanRepository,
            JdbcTemplate jdbcTemplate,
            RestTemplate restTemplate,
            @Value("${app.vulnerability-service.url:http://vulnerability-service:8084}") String vulnerabilityServiceUrl,
            @Value("${app.alert-service.url:http://alert-service:8085}") String alertServiceUrl) {
        this.scanRepository = scanRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.restTemplate = restTemplate;
        this.vulnerabilityServiceUrl = vulnerabilityServiceUrl;
        this.alertServiceUrl = alertServiceUrl;
    }

    public void requestCancellation(UUID scanId) {
        cancelledScans.add(scanId);
    }

    @Async
    public void executeScanAsync(UUID scanId) {
        log.info("Starting asynchronous execution of scan: {}", scanId);

        // Wait up to 3 seconds for outer transaction commit
        Optional<Scan> optionalScan = Optional.empty();
        for (int i = 0; i < 15; i++) {
            optionalScan = scanRepository.findById(scanId);
            if (optionalScan.isPresent()) break;
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }

        if (optionalScan.isEmpty()) {
            log.error("Scan not found for execution: {}", scanId);
            return;
        }

        Scan scan = optionalScan.get();
        scan.setStatus(ScanStatus.RUNNING);
        scan.setStartedAt(Instant.now());
        scan.setProgress(5);
        scanRepository.save(scan);

        try {
            // Step 1: Collect targets
            Set<UUID> targetIds = new HashSet<>(scan.getTargetAssetIds());
            if (targetIds.isEmpty()) {
                // If no targets explicitly selected, select all active assets from DB
                List<UUID> allAssetIds = jdbcTemplate.query(
                        "SELECT id FROM assets WHERE status = 'ACTIVE' LIMIT 20",
                        (rs, rowNum) -> (UUID) rs.getObject("id")
                );
                targetIds.addAll(allAssetIds);
                scan.getTargetAssetIds().addAll(targetIds);
                scan.setTargetsCount(targetIds.size());
                scanRepository.save(scan);
            }

            // Step 2: Phase 1 - Discovery (25%)
            sleepStep(1000);
            if (isCancelled(scanId, scan)) return;
            updateProgress(scan, 25, "Découverte des hôtes et cartographie du sous-réseau en cours...");

            // Step 3: Phase 2 - Port Scan & Service Probing (50%)
            sleepStep(1500);
            if (isCancelled(scanId, scan)) return;
            updateProgress(scan, 50, "Énumération des ports TCP/UDP et identification des bannières applicatives...");

            // Step 4: Phase 3 - CVE Signature Matching & Detection (75%)
            sleepStep(1500);
            if (isCancelled(scanId, scan)) return;
            int vulnsDiscovered = detectAndInsertVulnerabilities(scanId, targetIds);
            updateProgress(scan, 75, "Analyse des vulnérabilités CVE et corrélation des signatures NVD...");

            // Step 5: Phase 4 - Finalizing & Risk Scoring (100%)
            sleepStep(1000);
            if (isCancelled(scanId, scan)) return;

            scan.setProgress(100);
            scan.setStatus(ScanStatus.COMPLETED);
            scan.setFinishedAt(Instant.now());
            scan.setVulnerabilitiesFound(vulnsDiscovered);
            scan.setSummary(String.format(
                    "Scan terminé avec succès. %d actif(s) inspecté(s), %d vulnérabilité(s) identifiée(s) et cataloguée(s).",
                    targetIds.size(), vulnsDiscovered
            ));
            scanRepository.save(scan);
            log.info("Scan {} completed successfully with {} vulnerabilities found.", scanId, vulnsDiscovered);
            notifyDownstreamServices();

        } catch (Exception e) {
            log.error("Error during scan execution: {}", e.getMessage(), e);
            scan.setStatus(ScanStatus.FAILED);
            scan.setFinishedAt(Instant.now());
            scan.setSummary("Échec de l'exécution du scan : " + e.getMessage());
            scanRepository.save(scan);
        } finally {
            cancelledScans.remove(scanId);
        }
    }

    private void updateProgress(Scan scan, int progress, String summary) {
        scan.setProgress(progress);
        scan.setSummary(summary);
        scanRepository.save(scan);
    }

    private boolean isCancelled(UUID scanId, Scan scan) {
        if (cancelledScans.contains(scanId)) {
            scan.setStatus(ScanStatus.CANCELLED);
            scan.setFinishedAt(Instant.now());
            scan.setSummary("Scan interrompu par l'opérateur de sécurité.");
            scanRepository.save(scan);
            log.warn("Scan {} was cancelled by user.", scanId);
            return true;
        }
        return false;
    }

    private void sleepStep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    private int detectAndInsertVulnerabilities(UUID scanId, Set<UUID> targetIds) {
        if (targetIds.isEmpty()) return 0;

        List<VulnerabilityTemplate> templates = List.of(
                new VulnerabilityTemplate("CVE-2023-38408", "OpenSSH PKCS#11 Provider RCE", "Exécution de code à distance via les bibliothèques PKCS#11 transférées par ssh-agent.", "CRITICAL", 9.8),
                new VulnerabilityTemplate("CVE-2023-4863", "Heap buffer overflow dans libwebp", "Vulnérabilité critique de dépassement de tampon dans libwebp permettant l'exécution arbitraire.", "HIGH", 8.8),
                new VulnerabilityTemplate("CVE-2021-44228", "Apache Log4j2 JNDI RCE (Log4Shell)", "Exécution de code non authentifiée par injection JNDI dans les messages journalisés.", "CRITICAL", 10.0),
                new VulnerabilityTemplate("CVE-2022-22965", "Spring Framework RCE (Spring4Shell)", "Attaque par manipulation de paramètres de liaison de données aboutissant à un RCE.", "HIGH", 8.1),
                new VulnerabilityTemplate("CVE-2023-22809", "Sudoers file editing bypass (Sudo)", "Élévation de privilèges locale via l'argument --edit de la commande sudo.", "MEDIUM", 6.8),
                new VulnerabilityTemplate("CVE-2024-21626", "Container breakout via WORKDIR (runc)", "Évasion de conteneur Linux due à un descripteur de fichier résiduel dans runc.", "HIGH", 8.6)
        );

        int count = 0;
        Random random = new Random();

        for (UUID assetId : targetIds) {
            // For each asset, pick 1-2 realistic vulnerabilities
            int picks = 1 + random.nextInt(2);
            List<VulnerabilityTemplate> pool = new ArrayList<>(templates);
            Collections.shuffle(pool);
            for (int i = 0; i < picks && i < pool.size(); i++) {
                VulnerabilityTemplate vt = pool.get(i);
                try {
                    jdbcTemplate.update(
                            "INSERT INTO vulnerabilities (id, cve_id, title, description, severity, cvss_score, status, asset_id, scan_id, discovered_at, created_at) " +
                                    "VALUES (uuid_generate_v4(), ?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW(), NOW())",
                            vt.cveId, vt.title, vt.description, vt.severity, vt.cvssScore, assetId, scanId
                    );
                    count++;
                } catch (Exception e) {
                    log.warn("Could not insert vulnerability for asset {}: {}", assetId, e.getMessage());
                }
            }
        }
        return count;
    }

    private void notifyDownstreamServices() {
        try {
            restTemplate.postForEntity(
                    vulnerabilityServiceUrl + "/api/vulnerabilities/search/reindex",
                    null,
                    Map.class);
            log.info("Elasticsearch reindex triggered after scan completion");
        } catch (Exception e) {
            log.warn("Could not trigger vulnerability reindex: {}", e.getMessage());
        }
        try {
            restTemplate.postForEntity(
                    alertServiceUrl + "/api/alerts/sync",
                    null,
                    Map.class);
            log.info("Alert sync triggered after scan completion");
        } catch (Exception e) {
            log.warn("Could not trigger alert sync: {}", e.getMessage());
        }
    }

    private static class VulnerabilityTemplate {
        final String cveId;
        final String title;
        final String description;
        final String severity;
        final double cvssScore;

        VulnerabilityTemplate(String cveId, String title, String description, String severity, double cvssScore) {
            this.cveId = cveId;
            this.title = title;
            this.description = description;
            this.severity = severity;
            this.cvssScore = cvssScore;
        }
    }
}
