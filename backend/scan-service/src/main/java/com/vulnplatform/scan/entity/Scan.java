package com.vulnplatform.scan.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "scans", indexes = {
    @Index(name = "idx_scans_status", columnList = "status"),
    @Index(name = "idx_scans_type", columnList = "scan_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Scan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "scan_type", nullable = false, length = 50)
    private ScanType scanType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ScanStatus status = ScanStatus.PENDING;

    @Column(nullable = false)
    @Builder.Default
    private Integer progress = 0;

    @Column(name = "targets_count")
    @Builder.Default
    private Integer targetsCount = 0;

    @Column(name = "vulnerabilities_found")
    @Builder.Default
    private Integer vulnerabilitiesFound = 0;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "scan_assets", joinColumns = @JoinColumn(name = "scan_id"))
    @Column(name = "asset_id")
    @Builder.Default
    private Set<UUID> targetAssetIds = new HashSet<>();

    @Column(length = 2000)
    private String summary;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
