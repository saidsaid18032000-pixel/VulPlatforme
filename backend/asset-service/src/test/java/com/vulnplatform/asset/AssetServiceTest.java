package com.vulnplatform.asset;

import com.vulnplatform.asset.dto.AssetRequest;
import com.vulnplatform.asset.dto.AssetResponse;
import com.vulnplatform.asset.dto.AssetStatsResponse;
import com.vulnplatform.asset.entity.Asset;
import com.vulnplatform.asset.entity.AssetStatus;
import com.vulnplatform.asset.entity.AssetType;
import com.vulnplatform.asset.entity.Criticality;
import com.vulnplatform.asset.repository.AssetRepository;
import com.vulnplatform.asset.service.AssetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock
    private AssetRepository assetRepository;

    @InjectMocks
    private AssetService assetService;

    private Asset sampleAsset;
    private UUID assetId;

    @BeforeEach
    void setUp() {
        assetId = UUID.randomUUID();
        sampleAsset = Asset.builder()
                .id(assetId)
                .name("SRV-PROD-WEB")
                .assetType(AssetType.SERVER)
                .ipAddress("192.168.1.50")
                .hostname("web01.corp.local")
                .os("Ubuntu 22.04 LTS")
                .criticality(Criticality.HIGH)
                .status(AssetStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Devrait créer un actif avec succès")
    void shouldCreateAssetSuccessfully() {
        AssetRequest req = AssetRequest.builder()
                .name("SRV-PROD-WEB")
                .assetType(AssetType.SERVER)
                .ipAddress("192.168.1.50")
                .hostname("web01.corp.local")
                .os("Ubuntu 22.04 LTS")
                .criticality(Criticality.HIGH)
                .status(AssetStatus.ACTIVE)
                .build();

        when(assetRepository.save(any(Asset.class))).thenReturn(sampleAsset);

        AssetResponse response = assetService.createAsset(req);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(assetId);
        assertThat(response.getName()).isEqualTo("SRV-PROD-WEB");
        assertThat(response.getAssetType()).isEqualTo(AssetType.SERVER);
        verify(assetRepository, times(1)).save(any(Asset.class));
    }

    @Test
    @DisplayName("Devrait récupérer un actif par son identifiant")
    void shouldGetAssetById() {
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(sampleAsset));

        AssetResponse response = assetService.getAssetById(assetId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(assetId);
        assertThat(response.getIpAddress()).isEqualTo("192.168.1.50");
    }

    @Test
    @DisplayName("Devrait lancer une exception si l'actif est introuvable")
    void shouldThrowWhenAssetNotFound() {
        when(assetRepository.findById(assetId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assetService.getAssetById(assetId))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Actif introuvable");
    }

    @Test
    @DisplayName("Devrait lister et filtrer les actifs")
    void shouldGetAllAssetsWithFilter() {
        when(assetRepository.findAll()).thenReturn(List.of(sampleAsset));

        List<AssetResponse> list = assetService.getAllAssets(null, AssetType.SERVER, Criticality.HIGH, AssetStatus.ACTIVE);

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getName()).isEqualTo("SRV-PROD-WEB");
    }

    @Test
    @DisplayName("Devrait mettre à jour un actif existant")
    void shouldUpdateAssetSuccessfully() {
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(sampleAsset));
        when(assetRepository.save(any(Asset.class))).thenReturn(sampleAsset);

        AssetRequest updateReq = AssetRequest.builder()
                .name("SRV-PROD-WEB-RENAMED")
                .assetType(AssetType.SERVER)
                .criticality(Criticality.CRITICAL)
                .build();

        AssetResponse response = assetService.updateAsset(assetId, updateReq);

        assertThat(response).isNotNull();
        verify(assetRepository, times(1)).save(sampleAsset);
    }

    @Test
    @DisplayName("Devrait supprimer un actif existant")
    void shouldDeleteAsset() {
        when(assetRepository.existsById(assetId)).thenReturn(true);

        assetService.deleteAsset(assetId);

        verify(assetRepository, times(1)).deleteById(assetId);
    }

    @Test
    @DisplayName("Devrait calculer les statistiques globales des actifs")
    void shouldCalculateAssetStats() {
        when(assetRepository.count()).thenReturn(10L);
        when(assetRepository.countByStatus(AssetStatus.ACTIVE)).thenReturn(8L);
        when(assetRepository.countByCriticality(Criticality.CRITICAL)).thenReturn(2L);
        when(assetRepository.countByCriticality(Criticality.HIGH)).thenReturn(3L);
        List<Object[]> typeRows = new ArrayList<>();
        typeRows.add(new Object[]{AssetType.SERVER, 5L});
        when(assetRepository.countByAssetTypeGrouped()).thenReturn(typeRows);

        List<Object[]> critRows = new ArrayList<>();
        critRows.add(new Object[]{Criticality.CRITICAL, 2L});
        when(assetRepository.countByCriticalityGrouped()).thenReturn(critRows);

        List<Object[]> statusRows = new ArrayList<>();
        statusRows.add(new Object[]{AssetStatus.ACTIVE, 8L});
        when(assetRepository.countByStatusGrouped()).thenReturn(statusRows);

        AssetStatsResponse stats = assetService.getAssetStats();

        assertThat(stats.getTotalAssets()).isEqualTo(10L);
        assertThat(stats.getActiveAssets()).isEqualTo(8L);
        assertThat(stats.getCriticalAssets()).isEqualTo(2L);
        assertThat(stats.getHighAssets()).isEqualTo(3L);
    }
}
