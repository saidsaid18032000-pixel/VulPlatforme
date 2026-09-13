package com.vulnplatform.asset.dto;

import com.vulnplatform.asset.entity.AssetStatus;
import com.vulnplatform.asset.entity.AssetType;
import com.vulnplatform.asset.entity.Criticality;
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
public class AssetRequest {

    @NotBlank(message = "Le nom de l'actif est obligatoire")
    @Size(max = 255, message = "Le nom ne doit pas dépasser 255 caractères")
    private String name;

    @NotNull(message = "Le type d'actif est obligatoire")
    private AssetType assetType;

    @Size(max = 45, message = "L'adresse IP ne doit pas dépasser 45 caractères")
    private String ipAddress;

    @Size(max = 255, message = "Le nom d'hôte ne doit pas dépasser 255 caractères")
    private String hostname;

    @Size(max = 50, message = "L'adresse MAC ne doit pas dépasser 50 caractères")
    private String macAddress;

    @Size(max = 100, message = "Le système d'exploitation ne doit pas dépasser 100 caractères")
    private String os;

    private Criticality criticality;

    private AssetStatus status;

    @Size(max = 1000, message = "La description ne doit pas dépasser 1000 caractères")
    private String description;
}
