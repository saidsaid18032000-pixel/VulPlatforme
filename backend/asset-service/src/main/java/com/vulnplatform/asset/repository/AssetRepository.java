package com.vulnplatform.asset.repository;

import com.vulnplatform.asset.entity.Asset;
import com.vulnplatform.asset.entity.AssetStatus;
import com.vulnplatform.asset.entity.AssetType;
import com.vulnplatform.asset.entity.Criticality;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AssetRepository extends JpaRepository<Asset, UUID> {

    List<Asset> findByNameContainingIgnoreCaseOrIpAddressContainingOrHostnameContainingIgnoreCase(
            String name, String ip, String hostname);

    List<Asset> findByAssetType(AssetType assetType);

    List<Asset> findByCriticality(Criticality criticality);

    List<Asset> findByStatus(AssetStatus status);

    long countByStatus(AssetStatus status);

    long countByCriticality(Criticality criticality);

    @Query("SELECT a.assetType, COUNT(a) FROM Asset a GROUP BY a.assetType")
    List<Object[]> countByAssetTypeGrouped();

    @Query("SELECT a.criticality, COUNT(a) FROM Asset a GROUP BY a.criticality")
    List<Object[]> countByCriticalityGrouped();

    @Query("SELECT a.status, COUNT(a) FROM Asset a GROUP BY a.status")
    List<Object[]> countByStatusGrouped();

    boolean existsByIpAddressAndIdNot(String ipAddress, UUID id);
    
    boolean existsByIpAddress(String ipAddress);
}
