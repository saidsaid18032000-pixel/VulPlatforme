package com.vulnplatform.report.repository;

import com.vulnplatform.report.entity.Report;
import com.vulnplatform.report.entity.ReportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {

    List<Report> findAllByOrderByCreatedAtDesc();

    List<Report> findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(String title);

    long countByReportType(ReportType reportType);

    @Query("SELECT r.reportType, COUNT(r) FROM Report r GROUP BY r.reportType")
    List<Object[]> countByTypeGrouped();
}
