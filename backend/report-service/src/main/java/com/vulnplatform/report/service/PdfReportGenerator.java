package com.vulnplatform.report.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.vulnplatform.report.entity.Report;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class PdfReportGenerator {

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'").withZone(ZoneOffset.UTC);

    public byte[] generate(Report report, Map<String, Object> summary) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 48, 48, 48, 48);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.DARK_GRAY);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(14, 165, 233));
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
            Font monoFont = FontFactory.getFont(FontFactory.COURIER, 9, Color.GRAY);

            document.add(new Paragraph("VulnPlatform — Rapport SOC", titleFont));
            document.add(Chunk.NEWLINE);
            document.add(new Paragraph(report.getTitle(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14)));
            document.add(new Paragraph("Type : " + report.getReportType(), bodyFont));
            document.add(new Paragraph("Généré le : " + FMT.format(report.getCreatedAt()), monoFont));
            if (report.getPeriodStart() != null && report.getPeriodEnd() != null) {
                document.add(new Paragraph(
                        "Période : " + FMT.format(report.getPeriodStart()) + " → " + FMT.format(report.getPeriodEnd()),
                        monoFont));
            }
            document.add(Chunk.NEWLINE);

            Object risk = summary.get("overallRisk");
            document.add(new Paragraph("Niveau de risque global : " + (risk != null ? risk : "N/A"), sectionFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Indicateurs clés", sectionFont));
            document.add(Chunk.NEWLINE);
            document.add(buildKpiTable(summary, bodyFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Top vulnérabilités", sectionFont));
            document.add(Chunk.NEWLINE);
            document.add(buildVulnTable(summary, bodyFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Recommandations", sectionFont));
            Object recs = summary.get("recommendations");
            if (recs instanceof List<?> list) {
                for (Object item : list) {
                    document.add(new Paragraph("• " + String.valueOf(item), bodyFont));
                }
            }

            document.add(Chunk.NEWLINE);
            document.add(new Paragraph(
                    "Document généré automatiquement par VulnPlatform — usage interne SSI/SOC.",
                    monoFont));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Échec de génération PDF: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private PdfPTable buildKpiTable(Map<String, Object> summary, Font font) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2f, 3f});

        Map<String, Object> assets = asMap(summary.get("assets"));
        Map<String, Object> scans = asMap(summary.get("scans"));
        Map<String, Object> vulns = asMap(summary.get("vulnerabilities"));
        Map<String, Object> alerts = asMap(summary.get("alerts"));

        addRow(table, "Actifs", assets.getOrDefault("total", 0) + " (actifs: "
                + assets.getOrDefault("active", 0) + ", critiques: "
                + assets.getOrDefault("critical", 0) + ")", font);
        addRow(table, "Scans", scans.getOrDefault("total", 0) + " (terminés: "
                + scans.getOrDefault("completed", 0) + ")", font);
        addRow(table, "Vulnérabilités", vulns.getOrDefault("total", 0) + " (ouvertes: "
                + vulns.getOrDefault("open", 0) + ", CRITICAL: "
                + vulns.getOrDefault("critical", 0) + ", HIGH: "
                + vulns.getOrDefault("high", 0) + ")", font);
        addRow(table, "Alertes", alerts.getOrDefault("total", 0) + " (NEW: "
                + alerts.getOrDefault("new", 0) + ")", font);
        return table;
    }

    @SuppressWarnings("unchecked")
    private PdfPTable buildVulnTable(Map<String, Object> summary, Font font) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2f, 4f, 1.5f, 1.2f});
        addHeader(table, "CVE", font);
        addHeader(table, "Titre", font);
        addHeader(table, "Sévérité", font);
        addHeader(table, "CVSS", font);

            Object top = summary.get("topVulnerabilities");
        if (top instanceof List<?> list) {
            for (Object rowObj : list) {
                if (rowObj instanceof Map<?, ?> raw) {
                    Map<String, Object> row = new HashMap<>();
                    raw.forEach((k, v) -> row.put(String.valueOf(k), v));
                    addCell(table, String.valueOf(row.getOrDefault("cve_id", "N/A")), font);
                    addCell(table, String.valueOf(row.getOrDefault("title", "")), font);
                    addCell(table, String.valueOf(row.getOrDefault("severity", "")), font);
                    addCell(table, String.valueOf(row.getOrDefault("cvss_score", "—")), font);
                }
            }
        }
        if (table.getRows().size() <= 1) {
            PdfPCell empty = new PdfPCell(new Phrase("Aucune vulnérabilité", font));
            empty.setColspan(4);
            empty.setPadding(6);
            table.addCell(empty);
        }
        return table;
    }

    private void addRow(PdfPTable table, String label, String value, Font font) {
        addCell(table, label, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10));
        addCell(table, value, font);
    }

    private void addHeader(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE)));
        cell.setBackgroundColor(new Color(30, 41, 59));
        cell.setPadding(6);
        table.addCell(cell);
    }

    private void addCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text == null || "null".equals(text) ? "—" : text, font));
        cell.setPadding(6);
        table.addCell(cell);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }
}
