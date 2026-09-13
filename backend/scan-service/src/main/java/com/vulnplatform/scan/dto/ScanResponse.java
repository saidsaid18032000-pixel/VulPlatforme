package com.vulnplatform.scan.dto;

import com.vulnplatform.scan.entity.ScanStatus;
import com.vulnplatform.scan.entity.ScanType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanResponse {

    private UUID id;
    private String name;
    private ScanType scanType;
    private ScanStatus status;
    private Integer progress;
    private Integer targetsCount;
    private Integer vulnerabilitiesFound;
    private Instant startedAt;
    private Instant finishedAt;
    private UUID createdBy;
    private Set<UUID> targetAssetIds;
    private String summary;
    private Instant createdAt;
}
