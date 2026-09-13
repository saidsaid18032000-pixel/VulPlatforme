package com.vulnplatform.asset.service;

import com.vulnplatform.asset.dto.AssetRequest;
import com.vulnplatform.asset.dto.AssetResponse;
import com.vulnplatform.asset.dto.AssetStatsResponse;
import com.vulnplatform.asset.entity.Asset;
import com.vulnplatform.asset.entity.AssetStatus;
import com.vulnplatform.asset.entity.AssetType;
import com.vulnplatform.asset.entity.Criticality;
import com.vulnplatform.asset.repository.AssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AssetService {

    private static final Logger log = LoggerFactory.getLogger(AssetService.class);

    private final AssetRepository assetRepository;

    public AssetService(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> getAllAssets(String query, AssetType type, Criticality criticality, AssetStatus status) {
        List<Asset> assets;
        if (query != null && !query.trim().isEmpty()) {
            String term = query.trim();
            assets = assetRepository.findByNameContainingIgnoreCaseOrIpAddressContainingOrHostnameContainingIgnoreCase(
                    term, term, term);
        } else {
            assets = assetRepository.findAll();
        }

        return assets.stream()
                .filter(a -> type == null || a.getAssetType() == type)
                .filter(a -> criticality == null || a.getCriticality() == criticality)
                .filter(a -> status == null || a.getStatus() == status)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AssetResponse getAssetById(UUID id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Actif introuvable avec l'identifiant : " + id));
        return toResponse(asset);
    }

    @Transactional
    public AssetResponse createAsset(AssetRequest request) {
        if (request.getIpAddress() != null && !request.getIpAddress().trim().isEmpty()) {
            if (assetRepository.existsByIpAddress(request.getIpAddress().trim())) {
                log.warn("An asset already exists with IP: {}", request.getIpAddress());
            }
        }

        Asset asset = Asset.builder()
                .name(request.getName().trim())
                .assetType(request.getAssetType())
                .ipAddress(request.getIpAddress() != null ? request.getIpAddress().trim() : null)
                .hostname(request.getHostname() != null ? request.getHostname().trim() : null)
                .macAddress(request.getMacAddress() != null ? request.getMacAddress().trim() : null)
                .os(request.getOs() != null ? request.getOs().trim() : null)
                .criticality(request.getCriticality() != null ? request.getCriticality() : Criticality.MEDIUM)
                .status(request.getStatus() != null ? request.getStatus() : AssetStatus.ACTIVE)
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .build();

        Asset saved = assetRepository.save(asset);
        log.info("Asset created: {} [{}] with ID {}", saved.getName(), saved.getAssetType(), saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public AssetResponse updateAsset(UUID id, AssetRequest request) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Actif introuvable avec l'identifiant : " + id));

        asset.setName(request.getName().trim());
        asset.setAssetType(request.getAssetType());
        if (request.getIpAddress() != null) asset.setIpAddress(request.getIpAddress().trim());
        if (request.getHostname() != null) asset.setHostname(request.getHostname().trim());
        if (request.getMacAddress() != null) asset.setMacAddress(request.getMacAddress().trim());
        if (request.getOs() != null) asset.setOs(request.getOs().trim());
        if (request.getCriticality() != null) asset.setCriticality(request.getCriticality());
        if (request.getStatus() != null) asset.setStatus(request.getStatus());
        if (request.getDescription() != null) asset.setDescription(request.getDescription().trim());

        Asset updated = assetRepository.save(asset);
        log.info("Asset updated: {} with ID {}", updated.getName(), updated.getId());
        return toResponse(updated);
    }

    @Transactional
    public void deleteAsset(UUID id) {
        if (!assetRepository.existsById(id)) {
            throw new NoSuchElementException("Actif introuvable avec l'identifiant : " + id);
        }
        assetRepository.deleteById(id);
        log.info("Asset deleted with ID {}", id);
    }

    @Transactional(readOnly = true)
    public AssetStatsResponse getAssetStats() {
        long total = assetRepository.count();
        long active = assetRepository.countByStatus(AssetStatus.ACTIVE);
        long critical = assetRepository.countByCriticality(Criticality.CRITICAL);
        long high = assetRepository.countByCriticality(Criticality.HIGH);

        Map<String, Long> byType = new HashMap<>();
        for (Object[] row : assetRepository.countByAssetTypeGrouped()) {
            if (row[0] != null) {
                byType.put(row[0].toString(), (Long) row[1]);
            }
        }

        Map<String, Long> byCrit = new HashMap<>();
        for (Object[] row : assetRepository.countByCriticalityGrouped()) {
            if (row[0] != null) {
                byCrit.put(row[0].toString(), (Long) row[1]);
            }
        }

        Map<String, Long> byStatus = new HashMap<>();
        for (Object[] row : assetRepository.countByStatusGrouped()) {
            if (row[0] != null) {
                byStatus.put(row[0].toString(), (Long) row[1]);
            }
        }

        return AssetStatsResponse.builder()
                .totalAssets(total)
                .activeAssets(active)
                .criticalAssets(critical)
                .highAssets(high)
                .assetsByType(byType)
                .assetsByCriticality(byCrit)
                .assetsByStatus(byStatus)
                .build();
    }

    public AssetResponse toResponse(Asset asset) {
        return AssetResponse.builder()
                .id(asset.getId())
                .name(asset.getName())
                .assetType(asset.getAssetType())
                .ipAddress(asset.getIpAddress())
                .hostname(asset.getHostname())
                .macAddress(asset.getMacAddress())
                .os(asset.getOs())
                .criticality(asset.getCriticality())
                .status(asset.getStatus())
                .description(asset.getDescription())
                .createdAt(asset.getCreatedAt())
                .updatedAt(asset.getUpdatedAt())
                .build();
    }
}
