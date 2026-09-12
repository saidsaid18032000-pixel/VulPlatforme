import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardStats } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <div class="dashboard-header">
        <div>
          <h1 class="page-title">Tableau de bord SOC</h1>
          <p class="page-subtitle">Vue d'ensemble de la posture de sécurité, des actifs et des vulnérabilités</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" (click)="loadStats()" [disabled]="isLoading()">
            <span class="material-icons" [class.rotating]="isLoading()">refresh</span>
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      @if (isLoading() && !stats()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des métriques de sécurité...</p>
        </div>
      }

      @if (stats()) {
        <!-- KPI Cards Grid -->
        <div class="kpi-grid">
          <!-- Total Assets -->
          <div class="kpi-card">
            <div class="kpi-icon-wrapper kpi-blue">
              <span class="material-icons">devices</span>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Actifs Détectés</span>
              <span class="kpi-value">{{ stats()?.assetsCount || 0 }}</span>
              <span class="kpi-subtext">Inventaire cartographié</span>
            </div>
          </div>

          <!-- Total Scans -->
          <div class="kpi-card">
            <div class="kpi-icon-wrapper kpi-teal">
              <span class="material-icons">radar</span>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Scans Réalisés</span>
              <span class="kpi-value">{{ stats()?.scansCount || 0 }}</span>
              <span class="kpi-subtext">Moteur de scan actif</span>
            </div>
          </div>

          <!-- Total Vulnerabilities -->
          <div class="kpi-card">
            <div class="kpi-icon-wrapper kpi-purple">
              <span class="material-icons">bug_report</span>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Total Vulnérabilités</span>
              <span class="kpi-value">{{ stats()?.vulnerabilitiesCount || 0 }}</span>
              <span class="kpi-subtext">Base CVE / NVD</span>
            </div>
          </div>

          <!-- Critical Vulnerabilities -->
          <div class="kpi-card kpi-card-critical">
            <div class="kpi-icon-wrapper kpi-red">
              <span class="material-icons">warning</span>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Alertes Critiques</span>
              <span class="kpi-value text-critical">{{ stats()?.criticalAlertsCount || 0 }}</span>
              <span class="kpi-subtext text-critical-sub">Action immédiate requise</span>
            </div>
          </div>

          <!-- Active Users -->
          <div class="kpi-card">
            <div class="kpi-icon-wrapper kpi-green">
              <span class="material-icons">group</span>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Comptes Actifs</span>
              <span class="kpi-value">{{ stats()?.activeUsersCount || 0 }} / {{ stats()?.usersCount || 0 }}</span>
              <span class="kpi-subtext">Opérateurs habilités</span>
            </div>
          </div>
        </div>

        <!-- Charts and Distributions Row -->
        <div class="analytics-row">
          <!-- Vulnerability Severity Distribution -->
          <div class="dashboard-panel">
            <div class="panel-header">
              <div class="panel-title-group">
                <span class="material-icons panel-icon">pie_chart</span>
                <h3>Répartition des Vulnérabilités par Sévérité</h3>
              </div>
              <span class="panel-badge">{{ stats()?.vulnerabilitiesCount || 0 }} total</span>
            </div>

            <div class="severity-bars">
              <!-- CRITICAL -->
              <div class="severity-item">
                <div class="severity-meta">
                  <span class="badge badge-critical">CRITIQUE</span>
                  <span class="severity-count">{{ getSeverityCount('CRITICAL') }}</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill fill-critical" [style.width.%]="getSeverityPercent('CRITICAL')"></div>
                </div>
              </div>

              <!-- HIGH -->
              <div class="severity-item">
                <div class="severity-meta">
                  <span class="badge badge-high">ÉLEVÉE</span>
                  <span class="severity-count">{{ getSeverityCount('HIGH') }}</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill fill-high" [style.width.%]="getSeverityPercent('HIGH')"></div>
                </div>
              </div>

              <!-- MEDIUM -->
              <div class="severity-item">
                <div class="severity-meta">
                  <span class="badge badge-medium">MOYENNE</span>
                  <span class="severity-count">{{ getSeverityCount('MEDIUM') }}</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill fill-medium" [style.width.%]="getSeverityPercent('MEDIUM')"></div>
                </div>
              </div>

              <!-- LOW -->
              <div class="severity-item">
                <div class="severity-meta">
                  <span class="badge badge-low">FAIBLE</span>
                  <span class="severity-count">{{ getSeverityCount('LOW') }}</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill fill-low" [style.width.%]="getSeverityPercent('LOW')"></div>
                </div>
              </div>

              <!-- INFO -->
              <div class="severity-item">
                <div class="severity-meta">
                  <span class="badge badge-info">INFO</span>
                  <span class="severity-count">{{ getSeverityCount('INFO') }}</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill fill-info" [style.width.%]="getSeverityPercent('INFO')"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Assets by Type -->
          <div class="dashboard-panel">
            <div class="panel-header">
              <div class="panel-title-group">
                <span class="material-icons panel-icon">dns</span>
                <h3>Typologie des Actifs Surveillés</h3>
              </div>
              <span class="panel-badge">{{ stats()?.assetsCount || 0 }} actifs</span>
            </div>

            <div class="assets-type-grid">
              @for (entry of getAssetsList(); track entry.type) {
                <div class="asset-type-card">
                  <div class="asset-type-icon">
                    <span class="material-icons">{{ getAssetIcon(entry.type) }}</span>
                  </div>
                  <div class="asset-type-info">
                    <span class="asset-type-name">{{ formatAssetType(entry.type) }}</span>
                    <span class="asset-type-count">{{ entry.count }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Recent Audit Activity -->
        <div class="dashboard-panel full-width">
          <div class="panel-header">
            <div class="panel-title-group">
              <span class="material-icons panel-icon">history</span>
              <h3>Activité Récente & Événements de Sécurité (Audit)</h3>
            </div>
            <span class="panel-badge">{{ stats()?.recentActivity?.length || 0 }} derniers logs</span>
          </div>

          @if (stats()?.recentActivity && stats()!.recentActivity.length > 0) {
            <div class="table-responsive">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Date / Heure</th>
                    <th>Action</th>
                    <th>Détails</th>
                    <th>Adresse IP</th>
                  </tr>
                </thead>
                <tbody>
                  @for (log of stats()!.recentActivity; track log.id) {
                    <tr>
                      <td class="text-mono">{{ formatDate(log.createdAt) }}</td>
                      <td>
                        <span class="action-tag" [class.action-login]="log.action.includes('LOGIN')" [class.action-user]="log.action.includes('USER')">
                          {{ log.action }}
                        </span>
                      </td>
                      <td>{{ log.details || '—' }}</td>
                      <td class="text-mono">{{ log.ipAddress || '127.0.0.1' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="empty-state">Aucun événement d'audit récent enregistré.</p>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        display: flex;
        flex-direction: column;
        gap: 1.75rem;
      }

      .dashboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .page-title {
        font-size: 1.65rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0;
        letter-spacing: -0.02em;
      }

      .page-subtitle {
        margin: 0.3rem 0 0;
        font-size: 0.85rem;
        color: #94a3b8;
      }

      .btn-refresh {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid var(--border-color);
        color: #cbd5e1;
        padding: 0.5rem 1rem;
        border-radius: 9px;
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-refresh:hover:not(:disabled) {
        background: rgba(56, 189, 248, 0.12);
        border-color: rgba(56, 189, 248, 0.3);
        color: #38bdf8;
      }

      .rotating {
        animation: rotate 1s linear infinite;
      }

      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 1.25rem;
      }

      .kpi-card {
        background: #111a2e;
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 1.35rem 1.25rem;
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
        transition: transform 0.2s ease, border-color 0.2s ease;
      }

      .kpi-card:hover {
        transform: translateY(-2px);
        border-color: var(--border-color-light);
      }

      .kpi-card-critical {
        border-color: rgba(220, 38, 38, 0.35);
        background: linear-gradient(145deg, #181528 0%, #111a2e 100%);
      }

      .kpi-icon-wrapper {
        width: 44px;
        height: 44px;
        border-radius: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .kpi-blue { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
      .kpi-teal { background: rgba(20, 184, 166, 0.15); color: #14b8a6; }
      .kpi-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
      .kpi-red { background: rgba(220, 38, 38, 0.18); color: #f87171; }
      .kpi-green { background: rgba(16, 185, 129, 0.15); color: #34d399; }

      .kpi-content {
        display: flex;
        flex-direction: column;
      }

      .kpi-label {
        font-size: 0.78rem;
        font-weight: 500;
        color: #94a3b8;
      }

      .kpi-value {
        font-size: 1.65rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0.2rem 0 0.15rem;
        letter-spacing: -0.02em;
      }

      .kpi-subtext {
        font-size: 0.72rem;
        color: #64748b;
      }

      .text-critical {
        color: #f87171 !important;
      }

      .text-critical-sub {
        color: #fca5a5 !important;
        font-weight: 500;
      }

      .analytics-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }

      @media (max-width: 900px) {
        .analytics-row {
          grid-template-columns: 1fr;
        }
      }

      .dashboard-panel {
        background: #111a2e;
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 1.5rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      }

      .dashboard-panel.full-width {
        grid-column: 1 / -1;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
        padding-bottom: 0.85rem;
        border-bottom: 1px solid var(--border-color);
      }

      .panel-title-group {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .panel-icon {
        color: #38bdf8;
        font-size: 20px;
      }

      .panel-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #ffffff;
      }

      .panel-badge {
        font-size: 0.72rem;
        background: rgba(255, 255, 255, 0.06);
        color: #94a3b8;
        padding: 0.2rem 0.55rem;
        border-radius: 6px;
      }

      .severity-bars {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .severity-item {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .severity-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .severity-count {
        font-size: 0.82rem;
        font-weight: 600;
        color: #f8fafc;
      }

      .progress-bar-bg {
        height: 8px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 9999px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        border-radius: 9999px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .fill-critical { background: #dc2626; box-shadow: 0 0 10px rgba(220, 38, 38, 0.5); }
      .fill-high { background: #ea580c; }
      .fill-medium { background: #f59e0b; }
      .fill-low { background: #3b82f6; }
      .fill-info { background: #64748b; }

      .assets-type-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 0.85rem;
      }

      .asset-type-card {
        background: rgba(30, 41, 59, 0.45);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
      }

      .asset-type-icon {
        color: #38bdf8;
      }

      .asset-type-name {
        font-size: 0.75rem;
        color: #94a3b8;
        font-weight: 500;
      }

      .asset-type-count {
        font-size: 1.25rem;
        font-weight: 700;
        color: #ffffff;
      }

      .table-responsive {
        overflow-x: auto;
      }

      .custom-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }

      .custom-table th {
        text-align: left;
        padding: 0.75rem 1rem;
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--border-color);
      }

      .custom-table td {
        padding: 0.85rem 1rem;
        color: #cbd5e1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      }

      .custom-table tr:hover td {
        background-color: rgba(255, 255, 255, 0.02);
      }

      .text-mono {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
      }

      .action-tag {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 6px;
        font-size: 0.72rem;
        font-weight: 600;
        background: rgba(99, 102, 241, 0.15);
        color: #a5b4fc;
        border: 1px solid rgba(99, 102, 241, 0.3);
      }

      .action-login {
        background: rgba(16, 185, 129, 0.15);
        color: #6ee7b7;
        border-color: rgba(16, 185, 129, 0.3);
      }

      .action-user {
        background: rgba(56, 189, 248, 0.15);
        color: #7dd3fc;
        border-color: rgba(56, 189, 248, 0.3);
      }

      .empty-state {
        text-align: center;
        color: #64748b;
        font-size: 0.85rem;
        padding: 2rem 0;
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 0;
        gap: 1rem;
        color: #94a3b8;
      }

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(56, 189, 248, 0.2);
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: rotate 0.8s linear infinite;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  isLoading = signal(false);

  constructor(
    private dashboardService: DashboardService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading.set(true);
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  getSeverityCount(severity: string): number {
    const map = this.stats()?.vulnerabilitiesBySeverity;
    return map ? (map[severity] || 0) : 0;
  }

  getSeverityPercent(severity: string): number {
    const total = this.stats()?.vulnerabilitiesCount || 0;
    if (total === 0) return 0;
    const count = this.getSeverityCount(severity);
    return Math.round((count / total) * 100);
  }

  getAssetsList(): { type: string; count: number }[] {
    const map = this.stats()?.assetsByType;
    if (!map) return [];
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }

  formatAssetType(type: string): string {
    const labels: Record<string, string> = {
      SERVEUR: 'Serveur Linux/Win',
      POSTE_CLIENT: 'Poste Client',
      EQUIPEMENT_RESEAU: 'Équip. Réseau',
      APPLICATION_WEB: 'App Web',
      BASE_DE_DONNEES: 'Base Données',
    };
    return labels[type] || type;
  }

  getAssetIcon(type: string): string {
    const icons: Record<string, string> = {
      SERVEUR: 'dns',
      POSTE_CLIENT: 'laptop_chromebook',
      EQUIPEMENT_RESEAU: 'router',
      APPLICATION_WEB: 'public',
      BASE_DE_DONNEES: 'storage',
    };
    return icons[type] || 'computer';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
