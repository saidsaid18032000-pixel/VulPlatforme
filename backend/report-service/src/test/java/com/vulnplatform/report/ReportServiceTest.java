package com.vulnplatform.report;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vulnplatform.report.dto.CreateReportRequest;
import com.vulnplatform.report.dto.ReportResponse;
import com.vulnplatform.report.dto.ReportStatsResponse;
import com.vulnplatform.report.entity.Report;
import com.vulnplatform.report.entity.ReportStatus;
import com.vulnplatform.report.entity.ReportType;
import com.vulnplatform.report.repository.ReportRepository;
import com.vulnplatform.report.service.PdfReportGenerator;
import com.vulnplatform.report.service.ReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private PdfReportGenerator pdfReportGenerator;

    private ReportService reportService;
    private UUID reportId;
    private Report sample;

    @BeforeEach
    void setUp() {
        reportService = new ReportService(reportRepository, jdbcTemplate, pdfReportGenerator, new ObjectMapper());
        reportId = UUID.randomUUID();
        sample = Report.builder()
                .id(reportId)
                .title("Rapport mensuel SSI")
                .reportType(ReportType.SECURITY_SUMMARY)
                .status(ReportStatus.READY)
                .periodStart(Instant.now().minusSeconds(86400))
                .periodEnd(Instant.now())
                .summaryJson("{\"overallRisk\":\"HIGH\",\"assets\":{\"total\":7}}")
                .createdAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Devrait générer un rapport avec agrégations")
    void shouldCreateReport() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(5L);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> {
            Report r = inv.getArgument(0);
            r.setId(reportId);
            r.setCreatedAt(Instant.now());
            return r;
        });

        CreateReportRequest req = CreateReportRequest.builder()
                .title("Rapport mensuel SSI")
                .reportType(ReportType.SECURITY_SUMMARY)
                .build();

        ReportResponse response = reportService.create(req);

        assertThat(response.getTitle()).isEqualTo("Rapport mensuel SSI");
        assertThat(response.getReportType()).isEqualTo(ReportType.SECURITY_SUMMARY);
        assertThat(response.getSummary()).containsKey("overallRisk");
        verify(reportRepository).save(any(Report.class));
    }

    @Test
    @DisplayName("Devrait lister les rapports")
    void shouldListReports() {
        when(reportRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(sample));

        List<ReportResponse> list = reportService.getAll(null, null);

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getId()).isEqualTo(reportId);
    }

    @Test
    @DisplayName("Devrait exporter un PDF")
    void shouldExportPdf() {
        when(reportRepository.findById(reportId)).thenReturn(Optional.of(sample));
        when(pdfReportGenerator.generate(eq(sample), anyMap())).thenReturn(new byte[]{1, 2, 3});

        byte[] pdf = reportService.exportPdf(reportId);

        assertThat(pdf).hasSize(3);
    }

    @Test
    @DisplayName("Devrait lever une exception si rapport introuvable")
    void shouldThrowWhenNotFound() {
        when(reportRepository.findById(reportId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reportService.getById(reportId))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    @DisplayName("Devrait calculer les statistiques")
    void shouldGetStats() {
        when(reportRepository.count()).thenReturn(4L);
        when(reportRepository.countByReportType(ReportType.SECURITY_SUMMARY)).thenReturn(1L);
        when(reportRepository.countByReportType(ReportType.VULNERABILITY)).thenReturn(1L);
        when(reportRepository.countByReportType(ReportType.ASSET_INVENTORY)).thenReturn(1L);
        when(reportRepository.countByReportType(ReportType.EXECUTIVE)).thenReturn(1L);
        when(reportRepository.countByTypeGrouped()).thenReturn(List.of());

        ReportStatsResponse stats = reportService.getStats();

        assertThat(stats.getTotalReports()).isEqualTo(4L);
        assertThat(stats.getExecutiveCount()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Devrait supprimer un rapport")
    void shouldDelete() {
        when(reportRepository.existsById(reportId)).thenReturn(true);

        reportService.delete(reportId);

        verify(reportRepository).deleteById(reportId);
    }
}
