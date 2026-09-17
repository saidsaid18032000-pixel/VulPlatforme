package com.vulnplatform.alert.controller;

import com.vulnplatform.alert.dto.AlertRequest;
import com.vulnplatform.alert.dto.AlertResponse;
import com.vulnplatform.alert.dto.AlertStatsResponse;
import com.vulnplatform.alert.entity.AlertSeverity;
import com.vulnplatform.alert.entity.AlertStatus;
import com.vulnplatform.alert.service.AlertService;
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
@RequestMapping("/api/alerts")
@Tag(name = "Alert Management", description = "APIs pour la gestion des alertes de sécurité")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping("/health")
    @Operation(summary = "Vérification de l'état du service d'alertes")
    public Map<String, String> health() {
        return Map.of("service", "alert-service", "status", "UP");
    }

    @GetMapping
    @Operation(summary = "Lister les alertes avec filtres optionnels")
    public ResponseEntity<List<AlertResponse>> getAll(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "severity", required = false) AlertSeverity severity,
            @RequestParam(name = "status", required = false) AlertStatus status) {
        return ResponseEntity.ok(alertService.getAll(search, severity, status));
    }

    @GetMapping("/stats")
    @Operation(summary = "Obtenir les statistiques globales sur les alertes")
    public ResponseEntity<AlertStatsResponse> getStats() {
        return ResponseEntity.ok(alertService.getStats());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir les détails d'une alerte")
    public ResponseEntity<AlertResponse> getById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(alertService.getById(id));
    }

    @PostMapping
    @Operation(summary = "Créer une alerte manuellement")
    public ResponseEntity<AlertResponse> create(@Valid @RequestBody AlertRequest request) {
        return new ResponseEntity<>(alertService.create(request), HttpStatus.CREATED);
    }

    @PostMapping("/sync")
    @Operation(summary = "Générer des alertes depuis les vulnérabilités CRITICAL/HIGH ouvertes")
    public ResponseEntity<Map<String, Object>> sync() {
        int created = alertService.generateFromCriticalVulnerabilities();
        return ResponseEntity.ok(Map.of(
                "created", created,
                "message", created + " alerte(s) générée(s) depuis les vulnérabilités critiques"
        ));
    }

    @PostMapping("/{id}/acknowledge")
    @Operation(summary = "Acquitter une alerte")
    public ResponseEntity<AlertResponse> acknowledge(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(alertService.acknowledge(id));
    }

    @PostMapping("/{id}/resolve")
    @Operation(summary = "Résoudre une alerte")
    public ResponseEntity<AlertResponse> resolve(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(alertService.resolve(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une alerte")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        alertService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
