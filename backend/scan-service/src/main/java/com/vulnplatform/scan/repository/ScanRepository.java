package com.vulnplatform.scan.repository;

import com.vulnplatform.scan.entity.Scan;
import com.vulnplatform.scan.entity.ScanStatus;
import com.vulnplatform.scan.entity.ScanType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScanRepository extends JpaRepository<Scan, UUID> {

    List<Scan> findAllByOrderByCreatedAtDesc();

    List<Scan> findByNameContainingIgnoreCaseOrderByCreatedAtDesc(String name);

    List<Scan> findByScanTypeOrderByCreatedAtDesc(ScanType scanType);

    List<Scan> findByStatusOrderByCreatedAtDesc(ScanStatus status);

    long countByStatus(ScanStatus status);

    @Query("SELECT s.scanType, COUNT(s) FROM Scan s GROUP BY s.scanType")
    List<Object[]> countByScanTypeGrouped();

    @Query("SELECT s.status, COUNT(s) FROM Scan s GROUP BY s.status")
    List<Object[]> countByStatusGrouped();
}
