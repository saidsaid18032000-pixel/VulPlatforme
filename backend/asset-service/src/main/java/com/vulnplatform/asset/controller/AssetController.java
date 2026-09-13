package com.vulnplatform.asset.controller;

import com.vulnplatform.asset.dto.AssetRequest;
import com.vulnplatform.asset.dto.AssetResponse;
import com.vulnplatform.asset.dto.AssetStatsResponse;
import com.vulnplatform.asset.entity.AssetStatus;
import com.vulnplatform.asset.entity.AssetType;
import com.vulnplatform.asset.entity.Criticality;
import com.vulnplatform.asset.service.AssetService;
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
@RequestMapping("/api/assets")
@Tag(name = "Asset Management", description = "APIs pour la gestion et l'inventaire des actifs")
public class AssetController {

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping("/health")
    @Operation(summary = "Vérification de l'état du service d'actifs")
    public Map<String, String> health() {
        return Map.of("service", "asset-service", "status", "UP");
    }

    @GetMapping
    @Operation(summary = "Lister les actifs avec filtres optionnels")
    public ResponseEntity<List<AssetResponse>> getAllAssets(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "type", required = false) AssetType type,
            @RequestParam(name = "criticality", required = false) Criticality criticality,
            @RequestParam(name = "status", required = false) AssetStatus status) {
        return ResponseEntity.ok(assetService.getAllAssets(search, type, criticality, status));
    }

    @GetMapping("/stats")
    @Operation(summary = "Obtenir les statistiques globales sur les actifs")
    public ResponseEntity<AssetStatsResponse> getStats() {
        return ResponseEntity.ok(assetService.getAssetStats());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir les détails d'un actif par ID")
    public ResponseEntity<AssetResponse> getAssetById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(assetService.getAssetById(id));
    }

    @PostMapping
    @Operation(summary = "Créer un nouvel actif")
    public ResponseEntity<AssetResponse> createAsset(@Valid @RequestBody AssetRequest request) {
        AssetResponse created = assetService.createAsset(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un actif existant")
    public ResponseEntity<AssetResponse> updateAsset(
            @PathVariable("id") UUID id,
            @Valid @RequestBody AssetRequest request) {
        return ResponseEntity.ok(assetService.updateAsset(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un actif")
    public ResponseEntity<Void> deleteAsset(@PathVariable("id") UUID id) {
        assetService.deleteAsset(id);
        return ResponseEntity.noContent().build();
    }
}
