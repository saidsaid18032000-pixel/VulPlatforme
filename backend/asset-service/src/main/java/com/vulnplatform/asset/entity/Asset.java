package com.vulnplatform.asset.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assets", indexes = {
    @Index(name = "idx_assets_status", columnList = "status"),
    @Index(name = "idx_assets_type", columnList = "asset_type"),
    @Index(name = "idx_assets_criticality", columnList = "criticality")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false, length = 50)
    private AssetType assetType;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(length = 255)
    private String hostname;

    @Column(name = "mac_address", length = 50)
    private String macAddress;

    @Column(length = 100)
    private String os;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private Criticality criticality = Criticality.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private AssetStatus status = AssetStatus.ACTIVE;

    @Column(length = 1000)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
