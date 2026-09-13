package com.vulnplatform.asset.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetStatsResponse {

    private long totalAssets;
    private long activeAssets;
    private long criticalAssets;
    private long highAssets;
    private Map<String, Long> assetsByType;
    private Map<String, Long> assetsByCriticality;
    private Map<String, Long> assetsByStatus;
}
