package com.vulnplatform.asset.dto;

import com.vulnplatform.asset.entity.AssetStatus;
import com.vulnplatform.asset.entity.AssetType;
import com.vulnplatform.asset.entity.Criticality;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetResponse {

    private UUID id;
    private String name;
    private AssetType assetType;
    private String ipAddress;
    private String hostname;
    private String macAddress;
    private String os;
    private Criticality criticality;
    private AssetStatus status;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
