package com.vulnplatform.scan.service;

import com.vulnplatform.scan.dto.CreateScanRequest;
import com.vulnplatform.scan.dto.ScanResponse;
import com.vulnplatform.scan.dto.ScanStatsResponse;
import com.vulnplatform.scan.entity.Scan;
import com.vulnplatform.scan.entity.ScanStatus;
import com.vulnplatform.scan.entity.ScanType;
import com.vulnplatform.scan.repository.ScanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ScanService {

    private static final Logger log = LoggerFactory.getLogger(ScanService.class);

    private final ScanRepository scanRepository;
    private final ScanEngineService scanEngineService;

    public ScanService(ScanRepository scanRepository, ScanEngineService scanEngineService) {
        this.scanRepository = scanRepository;
        this.scanEngineService = scanEngineService;
    }

    @Transactional(readOnly = true)
    public List<ScanResponse> getAllScans(String name, ScanType type, ScanStatus status) {
        List<Scan> scans;
        if (name != null && !name.trim().isEmpty()) {
            scans = scanRepository.findByNameContainingIgnoreCaseOrderByCreatedAtDesc(name.trim());
        } else {
            scans = scanRepository.findAllByOrderByCreatedAtDesc();
        }

        return scans.stream()
                .filter(s -> type == null || s.getScanType() == type)
                .filter(s -> status == null || s.getStatus() == status)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ScanResponse getScanById(UUID id) {
        Scan scan = scanRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Scan introuvable avec l'identifiant : " + id));
        return toResponse(scan);
    }

    @Transactional
    public Scan createScanInternal(CreateScanRequest request) {
        Set<UUID> targetIds = request.getTargetAssetIds() != null ? new HashSet<>(request.getTargetAssetIds()) : new HashSet<>();

        Scan scan = Scan.builder()
                .name(request.getName().trim())
                .scanType(request.getScanType())
                .status(ScanStatus.PENDING)
                .progress(0)
                .targetsCount(targetIds.size())
                .vulnerabilitiesFound(0)
                .targetAssetIds(targetIds)
                .summary("Scan initialisé, en attente d'exécution...")
                .build();

        Scan saved = scanRepository.save(scan);
        log.info("Scan created: {} [{}] with ID {}", saved.getName(), saved.getScanType(), saved.getId());
        return saved;
    }

    public ScanResponse createAndLaunchScan(CreateScanRequest request) {
        Scan saved = createScanInternal(request);
        // Launch execution asynchronously after commit/flush
        scanEngineService.executeScanAsync(saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public ScanResponse cancelScan(UUID id) {
        Scan scan = scanRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Scan introuvable avec l'identifiant : " + id));

        if (scan.getStatus() == ScanStatus.RUNNING || scan.getStatus() == ScanStatus.PENDING) {
            scanEngineService.requestCancellation(id);
            scan.setStatus(ScanStatus.CANCELLED);
            scan.setSummary("Annulation demandée par l'opérateur.");
            scan = scanRepository.save(scan);
            log.info("Scan {} cancellation requested.", id);
        }
        return toResponse(scan);
    }

    @Transactional
    public void deleteScan(UUID id) {
        if (!scanRepository.existsById(id)) {
            throw new NoSuchElementException("Scan introuvable avec l'identifiant : " + id);
        }
        scanRepository.deleteById(id);
        log.info("Scan deleted with ID {}", id);
    }

    @Transactional(readOnly = true)
    public ScanStatsResponse getScanStats() {
        long total = scanRepository.count();
        long running = scanRepository.countByStatus(ScanStatus.RUNNING) + scanRepository.countByStatus(ScanStatus.IN_PROGRESS);
        long completed = scanRepository.countByStatus(ScanStatus.COMPLETED);
        long failed = scanRepository.countByStatus(ScanStatus.FAILED);

        Map<String, Long> byType = new HashMap<>();
        for (Object[] row : scanRepository.countByScanTypeGrouped()) {
            if (row[0] != null) {
                byType.put(row[0].toString(), (Long) row[1]);
            }
        }

        Map<String, Long> byStatus = new HashMap<>();
        for (Object[] row : scanRepository.countByStatusGrouped()) {
            if (row[0] != null) {
                byStatus.put(row[0].toString(), (Long) row[1]);
            }
        }

        long totalVulns = scanRepository.findAll().stream()
                .mapToLong(s -> s.getVulnerabilitiesFound() != null ? s.getVulnerabilitiesFound() : 0)
                .sum();

        return ScanStatsResponse.builder()
                .totalScans(total)
                .runningScans(running)
                .completedScans(completed)
                .failedScans(failed)
                .totalVulnerabilitiesFound(totalVulns)
                .scansByType(byType)
                .scansByStatus(byStatus)
                .build();
    }

    public ScanResponse toResponse(Scan scan) {
        return ScanResponse.builder()
                .id(scan.getId())
                .name(scan.getName())
                .scanType(scan.getScanType())
                .status(scan.getStatus())
                .progress(scan.getProgress())
                .targetsCount(scan.getTargetsCount())
                .vulnerabilitiesFound(scan.getVulnerabilitiesFound())
                .startedAt(scan.getStartedAt())
                .finishedAt(scan.getFinishedAt())
                .createdBy(scan.getCreatedBy())
                .targetAssetIds(new HashSet<>(scan.getTargetAssetIds()))
                .summary(scan.getSummary())
                .createdAt(scan.getCreatedAt())
                .build();
    }
}
