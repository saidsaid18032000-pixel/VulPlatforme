package com.vulnplatform.report.controller;

import com.vulnplatform.report.dto.CreateReportRequest;
import com.vulnplatform.report.dto.ReportResponse;
import com.vulnplatform.report.dto.ReportStatsResponse;
import com.vulnplatform.report.entity.ReportType;
import com.vulnplatform.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Report Management", description = "APIs pour la génération et l'export de rapports SOC")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/health")
    @Operation(summary = "Vérification de l'état du service de rapports")
    public Map<String, String> health() {
        return Map.of("service", "report-service", "status", "UP");
    }

    @GetMapping
    @Operation(summary = "Lister les rapports générés")
    public ResponseEntity<List<ReportResponse>> getAll(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "type", required = false) ReportType type) {
        return ResponseEntity.ok(reportService.getAll(search, type));
    }

    @GetMapping("/stats")
    @Operation(summary = "Statistiques des rapports")
    public ResponseEntity<ReportStatsResponse> getStats() {
        return ResponseEntity.ok(reportService.getStats());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détails d'un rapport")
    public ResponseEntity<ReportResponse> getById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(reportService.getById(id));
    }

    @PostMapping
    @Operation(summary = "Générer un nouveau rapport")
    public ResponseEntity<ReportResponse> create(@Valid @RequestBody CreateReportRequest request) {
        return new ResponseEntity<>(reportService.create(request), HttpStatus.CREATED);
    }

    @GetMapping("/{id}/pdf")
    @Operation(summary = "Télécharger le rapport en PDF")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable("id") UUID id) {
        byte[] pdf = reportService.exportPdf(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"rapport-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un rapport")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        reportService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
