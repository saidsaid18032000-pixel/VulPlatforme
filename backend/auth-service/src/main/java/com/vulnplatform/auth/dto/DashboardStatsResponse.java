package com.vulnplatform.auth.dto;

import java.util.List;
import java.util.Map;

public class DashboardStatsResponse {

    private long usersCount;
    private long activeUsersCount;
    private long assetsCount;
    private long scansCount;
    private long vulnerabilitiesCount;
    private long criticalAlertsCount;

    private Map<String, Long> vulnerabilitiesBySeverity;
    private Map<String, Long> assetsByType;
    private Map<String, Long> vulnerabilitiesByStatus;
    private List<AuditLogResponse> recentActivity;

    public DashboardStatsResponse() {}

    public long getUsersCount() { return usersCount; }
    public void setUsersCount(long usersCount) { this.usersCount = usersCount; }

    public long getActiveUsersCount() { return activeUsersCount; }
    public void setActiveUsersCount(long activeUsersCount) { this.activeUsersCount = activeUsersCount; }

    public long getAssetsCount() { return assetsCount; }
    public void setAssetsCount(long assetsCount) { this.assetsCount = assetsCount; }

    public long getScansCount() { return scansCount; }
    public void setScansCount(long scansCount) { this.scansCount = scansCount; }

    public long getVulnerabilitiesCount() { return vulnerabilitiesCount; }
    public void setVulnerabilitiesCount(long vulnerabilitiesCount) { this.vulnerabilitiesCount = vulnerabilitiesCount; }

    public long getCriticalAlertsCount() { return criticalAlertsCount; }
    public void setCriticalAlertsCount(long criticalAlertsCount) { this.criticalAlertsCount = criticalAlertsCount; }

    public Map<String, Long> getVulnerabilitiesBySeverity() { return vulnerabilitiesBySeverity; }
    public void setVulnerabilitiesBySeverity(Map<String, Long> vulnerabilitiesBySeverity) { this.vulnerabilitiesBySeverity = vulnerabilitiesBySeverity; }

    public Map<String, Long> getAssetsByType() { return assetsByType; }
    public void setAssetsByType(Map<String, Long> assetsByType) { this.assetsByType = assetsByType; }

    public Map<String, Long> getVulnerabilitiesByStatus() { return vulnerabilitiesByStatus; }
    public void setVulnerabilitiesByStatus(Map<String, Long> vulnerabilitiesByStatus) { this.vulnerabilitiesByStatus = vulnerabilitiesByStatus; }

    public List<AuditLogResponse> getRecentActivity() { return recentActivity; }
    public void setRecentActivity(List<AuditLogResponse> recentActivity) { this.recentActivity = recentActivity; }
}
