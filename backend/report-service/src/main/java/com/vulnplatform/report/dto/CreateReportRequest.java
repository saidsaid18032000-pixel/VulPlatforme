package com.vulnplatform.report.dto;

import com.vulnplatform.report.entity.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReportRequest {

    @NotBlank(message = "Le titre du rapport est obligatoire")
    @Size(max = 255)
    private String title;

    @NotNull(message = "Le type de rapport est obligatoire")
    private ReportType reportType;
}
