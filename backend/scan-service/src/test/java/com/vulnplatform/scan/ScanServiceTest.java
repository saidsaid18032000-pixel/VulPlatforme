package com.vulnplatform.scan;

import com.vulnplatform.scan.dto.CreateScanRequest;
import com.vulnplatform.scan.dto.ScanResponse;
import com.vulnplatform.scan.dto.ScanStatsResponse;
import com.vulnplatform.scan.entity.Scan;
import com.vulnplatform.scan.entity.ScanStatus;
import com.vulnplatform.scan.entity.ScanType;
import com.vulnplatform.scan.repository.ScanRepository;
import com.vulnplatform.scan.service.ScanEngineService;
import com.vulnplatform.scan.service.ScanService;
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
class ScanServiceTest {

    @Mock
    private ScanRepository scanRepository;

    @Mock
    private ScanEngineService scanEngineService;

    @InjectMocks
    private ScanService scanService;

    private Scan sampleScan;
    private UUID scanId;

    @BeforeEach
    void setUp() {
        scanId = UUID.randomUUID();
        sampleScan = Scan.builder()
                .id(scanId)
                .name("Scan Périmètre DMZ")
                .scanType(ScanType.NETWORK)
                .status(ScanStatus.PENDING)
                .progress(0)
                .targetsCount(3)
                .vulnerabilitiesFound(0)
                .targetAssetIds(Set.of(UUID.randomUUID(), UUID.randomUUID()))
                .summary("Scan initialisé")
                .createdAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Devrait créer et lancer un scan")
    void shouldCreateAndLaunchScan() {
        CreateScanRequest request = CreateScanRequest.builder()
                .name("Scan Périmètre DMZ")
                .scanType(ScanType.NETWORK)
                .targetAssetIds(Set.of(UUID.randomUUID()))
                .intensity("NORMAL")
                .build();

        when(scanRepository.save(any(Scan.class))).thenReturn(sampleScan);

        ScanResponse response = scanService.createAndLaunchScan(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(scanId);
        assertThat(response.getName()).isEqualTo("Scan Périmètre DMZ");
        assertThat(response.getScanType()).isEqualTo(ScanType.NETWORK);
        verify(scanEngineService, times(1)).executeScanAsync(scanId);
    }

    @Test
    @DisplayName("Devrait récupérer un scan par son ID")
    void shouldGetScanById() {
        when(scanRepository.findById(scanId)).thenReturn(Optional.of(sampleScan));

        ScanResponse response = scanService.getScanById(scanId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(scanId);
        assertThat(response.getName()).isEqualTo("Scan Périmètre DMZ");
    }

    @Test
    @DisplayName("Devrait lancer une exception si le scan n'existe pas")
    void shouldThrowWhenScanNotFound() {
        when(scanRepository.findById(scanId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> scanService.getScanById(scanId))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Scan introuvable");
    }

    @Test
    @DisplayName("Devrait lister tous les scans")
    void shouldGetAllScans() {
        when(scanRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(sampleScan));

        List<ScanResponse> result = scanService.getAllScans(null, ScanType.NETWORK, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Scan Périmètre DMZ");
    }

    @Test
    @DisplayName("Devrait annuler un scan en cours")
    void shouldCancelScan() {
        sampleScan.setStatus(ScanStatus.RUNNING);
        when(scanRepository.findById(scanId)).thenReturn(Optional.of(sampleScan));
        when(scanRepository.save(any(Scan.class))).thenReturn(sampleScan);

        ScanResponse response = scanService.cancelScan(scanId);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(ScanStatus.CANCELLED);
        verify(scanEngineService, times(1)).requestCancellation(scanId);
    }

    @Test
    @DisplayName("Devrait supprimer un scan existant")
    void shouldDeleteScan() {
        when(scanRepository.existsById(scanId)).thenReturn(true);

        scanService.deleteScan(scanId);

        verify(scanRepository, times(1)).deleteById(scanId);
    }

    @Test
    @DisplayName("Devrait calculer les statistiques globales des scans")
    void shouldGetScanStats() {
        when(scanRepository.count()).thenReturn(5L);
        when(scanRepository.countByStatus(ScanStatus.RUNNING)).thenReturn(1L);
        when(scanRepository.countByStatus(ScanStatus.IN_PROGRESS)).thenReturn(0L);
        when(scanRepository.countByStatus(ScanStatus.COMPLETED)).thenReturn(3L);
        when(scanRepository.countByStatus(ScanStatus.FAILED)).thenReturn(1L);

        List<Object[]> typeRows = new ArrayList<>();
        typeRows.add(new Object[]{ScanType.NETWORK, 3L});
        when(scanRepository.countByScanTypeGrouped()).thenReturn(typeRows);

        List<Object[]> statusRows = new ArrayList<>();
        statusRows.add(new Object[]{ScanStatus.COMPLETED, 3L});
        when(scanRepository.countByStatusGrouped()).thenReturn(statusRows);

        sampleScan.setVulnerabilitiesFound(4);
        when(scanRepository.findAll()).thenReturn(List.of(sampleScan));

        ScanStatsResponse stats = scanService.getScanStats();

        assertThat(stats.getTotalScans()).isEqualTo(5L);
        assertThat(stats.getRunningScans()).isEqualTo(1L);
        assertThat(stats.getCompletedScans()).isEqualTo(3L);
        assertThat(stats.getTotalVulnerabilitiesFound()).isEqualTo(4L);
    }
}
