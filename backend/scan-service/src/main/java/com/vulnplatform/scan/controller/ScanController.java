package com.vulnplatform.scan.controller;

import com.vulnplatform.scan.dto.CreateScanRequest;
import com.vulnplatform.scan.dto.ScanResponse;
import com.vulnplatform.scan.dto.ScanStatsResponse;
import com.vulnplatform.scan.entity.ScanStatus;
import com.vulnplatform.scan.entity.ScanType;
import com.vulnplatform.scan.service.ScanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/scans")
@Tag(name = "Scan Management", description = "APIs pour l'orchestration et le suivi des scans de sécurité")
public class ScanController {

    private final ScanService scanService;

    public ScanController(ScanService scanService) {
        this.scanService = scanService;
    }

    @GetMapping("/health")
    @Operation(summary = "Vérification de l'état du service de scans")
    public Map<String, String> health() {
        return Map.of("service", "scan-service", "status", "UP");
    }

    @GetMapping
    @Operation(summary = "Lister les scans avec filtres optionnels")
    public ResponseEntity<List<ScanResponse>> getAllScans(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "type", required = false) ScanType type,
            @RequestParam(name = "status", required = false) ScanStatus status) {
        return ResponseEntity.ok(scanService.getAllScans(search, type, status));
    }

    @GetMapping("/stats")
    @Operation(summary = "Obtenir les statistiques globales sur les scans")
    public ResponseEntity<ScanStatsResponse> getStats() {
        return ResponseEntity.ok(scanService.getScanStats());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir les détails d'un scan par son ID")
    public ResponseEntity<ScanResponse> getScanById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(scanService.getScanById(id));
    }

    @PostMapping
    @Operation(summary = "Lancer un nouveau scan de sécurité")
    public ResponseEntity<ScanResponse> createScan(@Valid @RequestBody CreateScanRequest request) {
        ScanResponse created = scanService.createAndLaunchScan(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Interrompre un scan en cours d'exécution")
    public ResponseEntity<ScanResponse> cancelScan(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(scanService.cancelScan(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer l'historique d'un scan")
    public ResponseEntity<Void> deleteScan(@PathVariable("id") UUID id) {
        scanService.deleteScan(id);
        return ResponseEntity.noContent().build();
    }
}
