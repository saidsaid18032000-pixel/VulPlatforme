package com.vulnplatform.alert.dto;

import com.vulnplatform.alert.entity.AlertSeverity;
import com.vulnplatform.alert.entity.AlertStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertRequest {

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 500)
    private String title;

    private String message;

    @NotNull(message = "La sévérité est obligatoire")
    private AlertSeverity severity;

    private AlertStatus status;

    private UUID vulnerabilityId;

    private UUID assetId;

    @Size(max = 50)
    private String cveId;
}
