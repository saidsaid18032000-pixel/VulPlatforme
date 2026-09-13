package com.vulnplatform.scan.dto;

import com.vulnplatform.scan.entity.ScanType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateScanRequest {

    @NotBlank(message = "Le nom du scan est obligatoire")
    @Size(max = 255, message = "Le nom ne doit pas dépasser 255 caractères")
    private String name;

    @NotNull(message = "Le type de scan est obligatoire")
    private ScanType scanType;

    private Set<UUID> targetAssetIds;

    @Builder.Default
    private String intensity = "NORMAL";
}
