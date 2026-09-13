import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ScanService } from '../../core/services/scan.service';
import { AssetService } from '../../core/services/asset.service';
import {
  CreateScanRequest,
  Scan,
  ScanStats,
  ScanStatus,
  ScanType,
  Asset,
} from '../../core/models/asset-scan.models';

@Component({
  selector: 'app-scans',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="scans-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Moteur de Scans & Détection Réseau</h1>
          <p class="page-subtitle">Orchestration des analyses Nmap/OpenVAS, inspection des ports et corrélation des vulnérabilités</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="loadAll()" [disabled]="isLoading()">
            <span class="material-icons" [class.rotating]="isLoading()">refresh</span>
            <span>Actualiser</span>
          </button>
          <button class="btn-primary" (click)="openCreateModal()">
            <span class="material-icons">radar</span>
            <span>Nouveau Scan</span>
          </button>
        </div>
      </div>

      <!-- Feedback notifications -->
      @if (successMessage()) {
        <div class="notification-banner success">
          <span class="material-icons">check_circle</span>
          <span>{{ successMessage() }}</span>
        </div>
      }
      @if (errorMessage()) {
        <div class="notification-banner danger">
          <span class="material-icons">error</span>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <!-- Running scan live alert -->
      @if (hasRunningScans()) {
        <div class="live-scan-banner">
          <div class="pulse-indicator"></div>
          <span>Un ou plusieurs scans sont actuellement en cours d'exécution. Actualisation en temps réel active.</span>
        </div>
      }

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrapper kpi-teal">
            <span class="material-icons">radar</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Total Scans</span>
            <span class="kpi-value">{{ stats()?.totalScans || scans().length }}</span>
            <span class="kpi-subtext">Historique des analyses</span>
          </div>
        </div>

        <div class="kpi-card" [class.kpi-card-active]="getRunningCount() > 0">
          <div class="kpi-icon-wrapper kpi-amber">
            <span class="material-icons" [class.rotating]="getRunningCount() > 0">sync</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Scans En Cours</span>
            <span class="kpi-value">{{ stats()?.runningScans || getRunningCount() }}</span>
            <span class="kpi-subtext">Moteurs actifs</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrapper kpi-emerald">
            <span class="material-icons">task_alt</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Scans Terminés</span>
            <span class="kpi-value">{{ stats()?.completedScans || getCompletedCount() }}</span>
            <span class="kpi-subtext">Analyses réussies</span>
          </div>
        </div>

        <div class="kpi-card kpi-card-danger">
          <div class="kpi-icon-wrapper kpi-rose">
            <span class="material-icons">bug_report</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Vulnérabilités Trouvées</span>
            <span class="kpi-value critical-text">{{ stats()?.totalVulnerabilitiesFound || getTotalVulns() }}</span>
            <span class="kpi-subtext">Signatures identifiées</span>
          </div>
        </div>
      </div>

      <!-- Filter Card -->
      <div class="filter-card">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input
            type="text"
            placeholder="Rechercher une tâche de scan par nom..."
            [value]="searchTerm()"
            (input)="onSearchChange($event)"
          />
        </div>

        <div class="filters-row">
          <div class="filter-group">
            <label>Type :</label>
            <select [value]="selectedType()" (change)="onTypeChange($event)">
              <option value="ALL">Tous les types</option>
              <option value="NETWORK">Scan Réseau (Ports & Hôtes)</option>
              <option value="WEB_APPLICATION">Applicatif Web & APIs</option>
              <option value="PORT_SCAN">Énumération de Ports</option>
              <option value="COMPLIANCE">Conformité & Durcissement</option>
              <option value="CVE_SCAN">Vérification Signatures CVE</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Statut :</label>
            <select [value]="selectedStatus()" (change)="onStatusChange($event)">
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="RUNNING">En cours (RUNNING)</option>
              <option value="COMPLETED">Terminé avec succès</option>
              <option value="FAILED">Échoué</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>

          <div class="results-badge">
            <span>{{ filteredScans().length }} scan(s) affiché(s)</span>
          </div>
        </div>
      </div>

      <!-- Scans Data Table -->
      <div class="table-card">
        @if (isLoading() && scans().length === 0) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Chargement des sessions de scan...</span>
          </div>
        } @else if (filteredScans().length === 0) {
          <div class="empty-state">
            <span class="material-icons empty-icon">radar</span>
            <p>Aucune session de scan ne correspond aux critères.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nom du Scan</th>
                  <th>Typologie</th>
                  <th>Progression</th>
                  <th>Statut</th>
                  <th>Cibles</th>
                  <th>Vulnérabilités</th>
                  <th>Date & Durée</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (scan of filteredScans(); track scan.id) {
                  <tr>
                    <td>
                      <div class="scan-identity">
                        <div class="scan-avatar" [class]="getScanAvatarClass(scan.scanType)">
                          <span class="material-icons">{{ getScanIcon(scan.scanType) }}</span>
                        </div>
                        <div class="scan-names">
                          <span class="scan-title">{{ scan.name }}</span>
                          <span class="scan-id-hint">{{ scan.id.substring(0, 8) }}...</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="type-pill">
                        {{ formatScanType(scan.scanType) }}
                      </span>
                    </td>
                    <td>
                      <div class="progress-col">
                        <div class="progress-bar-bg">
                          <div
                            class="progress-bar-fill"
                            [class.pulse-glow]="scan.status === 'RUNNING'"
                            [style.width.%]="scan.progress"
                            [style.background]="getProgressColor(scan.status)"
                          ></div>
                        </div>
                        <span class="progress-text">{{ scan.progress }}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge-status" [class]="getStatusClass(scan.status)">
                        @if (scan.status === 'RUNNING') {
                          <span class="status-indicator-pulse"></span>
                        } @else {
                          <span class="status-indicator"></span>
                        }
                        {{ formatStatus(scan.status) }}
                      </span>
                    </td>
                    <td>
                      <span class="badge-targets">
                        <span class="material-icons">devices</span>
                        {{ scan.targetsCount || scan.targetAssetIds.length || 0 }}
                      </span>
                    </td>
                    <td>
                      @if (scan.vulnerabilitiesFound && scan.vulnerabilitiesFound > 0) {
                        <span class="badge-vulns-found">
                          <span class="material-icons">warning</span>
                          {{ scan.vulnerabilitiesFound }}
                        </span>
                      } @else {
                        <span class="badge-vulns-zero">0</span>
                      }
                    </td>
                    <td>
                      <div class="time-col">
                        <span class="time-main">{{ formatDate(scan.createdAt) }}</span>
                        @if (scan.finishedAt && scan.startedAt) {
                          <span class="time-sub">{{ getDuration(scan.startedAt, scan.finishedAt) }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn-icon" title="Rapport & Détails" (click)="openDetailModal(scan)">
                          <span class="material-icons">assessment</span>
                        </button>
                        @if (scan.status === 'RUNNING' || scan.status === 'PENDING') {
                          <button class="btn-icon danger" title="Interrompre le scan" (click)="cancelScan(scan)">
                            <span class="material-icons">stop_circle</span>
                          </button>
                        }
                        <button class="btn-icon danger" title="Supprimer" (click)="confirmDelete(scan)">
                          <span class="material-icons">delete_outline</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create New Scan Modal -->
      @if (isModalOpen()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-card modal-scan" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <span class="material-icons">radar</span>
                <h3>Lancement d'un Nouveau Scan</h3>
              </div>
              <button class="btn-close" (click)="closeModal()">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="scanForm" (ngSubmit)="launchScan()">
              <div class="modal-body">
                <div class="form-row">
                  <div class="form-group flex-2">
                    <label>Nom de la Tâche de Scan <span class="required">*</span></label>
                    <input
                      type="text"
                      formControlName="name"
                      placeholder="ex: Scan Audit Vulnérabilités Infrastructure"
                      [class.invalid]="isFieldInvalid('name')"
                    />
                    @if (isFieldInvalid('name')) {
                      <span class="field-error">Le nom du scan est obligatoire</span>
                    }
                  </div>

                  <div class="form-group flex-1">
                    <label>Type d'Analyse <span class="required">*</span></label>
                    <select formControlName="scanType">
                      <option value="NETWORK">Scan Réseau (Ports & Hôtes)</option>
                      <option value="WEB_APPLICATION">Applicatif Web & APIs</option>
                      <option value="PORT_SCAN">Énumération de Ports</option>
                      <option value="COMPLIANCE">Conformité & Durcissement</option>
                      <option value="CVE_SCAN">Vérification Signatures CVE</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label>Intensité du Moteur de Scan</label>
                  <div class="intensity-picker">
                    <label class="intensity-option" [class.selected]="scanForm.get('intensity')?.value === 'STEALTH'">
                      <input type="radio" formControlName="intensity" value="STEALTH" />
                      <div>
                        <strong>Discret (Stealth)</strong>
                        <span>Ralentit le débit des paquets pour échapper aux IDS/IPS</span>
                      </div>
                    </label>

                    <label class="intensity-option" [class.selected]="scanForm.get('intensity')?.value === 'NORMAL'">
                      <input type="radio" formControlName="intensity" value="NORMAL" />
                      <div>
                        <strong>Normal (Recommandé)</strong>
                        <span>Équilibré entre vitesse et détection complète des services</span>
                      </div>
                    </label>

                    <label class="intensity-option" [class.selected]="scanForm.get('intensity')?.value === 'AGGRESSIVE'">
                      <input type="radio" formControlName="intensity" value="AGGRESSIVE" />
                      <div>
                        <strong>Agressif (Exhaustif)</strong>
                        <span>Analyse approfondie de tous les scripts NSE & CVEs</span>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Target Assets Selection -->
                <div class="form-group">
                  <div class="targets-header">
                    <label>Actifs Cibles à Inspecter ({{ selectedTargetIds().size }} sélectionné(s))</label>
                    <button type="button" class="btn-text-action" (click)="toggleAllTargets()">
                      {{ selectedTargetIds().size === availableAssets().length ? 'Tout désélectionner' : 'Sélectionner tous les actifs' }}
                    </button>
                  </div>

                  <div class="targets-list">
                    @for (asset of availableAssets(); track asset.id) {
                      <label class="target-checkbox-item" [class.checked]="selectedTargetIds().has(asset.id)">
                        <input
                          type="checkbox"
                          [checked]="selectedTargetIds().has(asset.id)"
                          (change)="toggleTarget(asset.id)"
                        />
                        <span class="target-name">{{ asset.name }}</span>
                        <span class="target-ip">{{ asset.ipAddress || 'Pas d\'IP' }}</span>
                        <span class="target-badge">{{ asset.assetType }}</span>
                      </label>
                    }
                    @if (availableAssets().length === 0) {
                      <p class="no-assets-hint">Aucun actif enregistré. Le scan s'exécutera sur le sous-réseau par défaut.</p>
                    }
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModal()">Annuler</button>
                <button type="submit" class="btn-submit" [disabled]="scanForm.invalid || isSaving()">
                  @if (isSaving()) {
                    <div class="spinner-small"></div>
                    <span>Démarrage...</span>
                  } @else {
                    <span class="material-icons">play_arrow</span>
                    <span>Lancer le Scan</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Scan Report & Details Modal -->
      @if (detailScan()) {
        <div class="modal-backdrop" (click)="closeDetailModal()">
          <div class="modal-card modal-detail" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <span class="material-icons">assessment</span>
                <h3>Rapport de Scan : {{ detailScan()?.name }}</h3>
              </div>
              <button class="btn-close" (click)="closeDetailModal()">
                <span class="material-icons">close</span>
              </button>
            </div>

            <div class="modal-body detail-grid">
              <div class="detail-item">
                <span class="detail-label">Identifiant du Scan</span>
                <span class="detail-value code">{{ detailScan()?.id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Type d'Analyse</span>
                <span class="detail-value">{{ formatScanType(detailScan()!.scanType) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Statut d'Exécution</span>
                <span class="badge-status" [class]="getStatusClass(detailScan()!.status)">
                  {{ formatStatus(detailScan()!.status) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Progression Atteinte</span>
                <span class="detail-value">{{ detailScan()?.progress }}%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Nombre d'Actifs Ciblés</span>
                <span class="detail-value">{{ detailScan()?.targetsCount || detailScan()?.targetAssetIds?.length || 0 }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Vulnérabilités Remontées</span>
                <span class="badge-vulns-found large">{{ detailScan()?.vulnerabilitiesFound || 0 }} trouvée(s)</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Date de Démarrage</span>
                <span class="detail-value">{{ formatDate(detailScan()?.startedAt || detailScan()?.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Date de Clôture</span>
                <span class="detail-value">{{ formatDate(detailScan()?.finishedAt) }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Journal d'Événements & Résumé d'Analyse</span>
                <p class="detail-text">{{ detailScan()?.summary || 'Aucun résumé disponible pour ce scan.' }}</p>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-cancel" (click)="closeDetailModal()">Fermer</button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (scanToDelete()) {
        <div class="modal-backdrop" (click)="scanToDelete.set(null)">
          <div class="modal-card modal-confirm" (click)="$event.stopPropagation()">
            <div class="confirm-icon-box">
              <span class="material-icons">warning_amber</span>
            </div>
            <h3 class="confirm-title">Supprimer l'historique de scan</h3>
            <p class="confirm-desc">
              Êtes-vous sûr de vouloir supprimer le scan
              <strong>{{ scanToDelete()?.name }}</strong> ?
              Cette action supprimera l'historique et le rapport associé.
            </p>
            <div class="confirm-actions">
              <button class="btn-cancel" (click)="scanToDelete.set(null)">Annuler</button>
              <button class="btn-delete-confirm" (click)="executeDelete()">
                <span class="material-icons">delete_forever</span>
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .scans-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
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

      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .btn-primary {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
        border: none;
        color: #ffffff;
        padding: 0.65rem 1.25rem;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
      }

      .btn-primary:hover:not(:disabled) {
        opacity: 0.95;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(2, 132, 199, 0.45);
      }

      .btn-secondary {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #94a3b8;
        padding: 0.65rem 1.1rem;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary:hover:not(:disabled) {
        background: rgba(51, 65, 85, 0.9);
        color: #ffffff;
        border-color: rgba(56, 189, 248, 0.4);
      }

      /* Live Banner */
      .live-scan-banner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.25rem;
        background: rgba(14, 165, 233, 0.12);
        border: 1px solid rgba(14, 165, 233, 0.35);
        border-radius: 10px;
        color: #38bdf8;
        font-size: 0.85rem;
        font-weight: 500;
      }

      .pulse-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #38bdf8;
        box-shadow: 0 0 10px #38bdf8;
        animation: pulse 1.2s infinite;
      }

      @keyframes pulse {
        0% { transform: scale(0.95); opacity: 0.7; }
        50% { transform: scale(1.25); opacity: 1; }
        100% { transform: scale(0.95); opacity: 0.7; }
      }

      /* KPI Cards */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1.25rem;
      }

      .kpi-card {
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 1.25rem;
        display: flex;
        align-items: center;
        gap: 1.25rem;
        backdrop-filter: blur(10px);
        transition: transform 0.2s, border-color 0.2s;
      }

      .kpi-card-active {
        border-color: rgba(245, 158, 11, 0.4);
        box-shadow: 0 0 15px rgba(245, 158, 11, 0.1);
      }

      .kpi-card-danger {
        border-color: rgba(239, 68, 68, 0.3);
      }

      .kpi-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .kpi-icon-wrapper .material-icons {
        font-size: 1.6rem;
      }

      .kpi-teal { background: rgba(20, 184, 166, 0.15); color: #2dd4bf; }
      .kpi-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
      .kpi-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
      .kpi-rose { background: rgba(239, 68, 68, 0.15); color: #f87171; }

      .kpi-content {
        display: flex;
        flex-direction: column;
      }

      .kpi-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        font-weight: 600;
      }

      .kpi-value {
        font-size: 1.65rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0.15rem 0;
        font-family: 'JetBrains Mono', monospace;
      }

      .critical-text { color: #f87171; }

      .kpi-subtext {
        font-size: 0.75rem;
        color: #64748b;
      }

      /* Filter Card */
      .filter-card {
        background: rgba(30, 41, 59, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 1.1rem 1.4rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .search-box {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 0.6rem 1rem;
        color: #94a3b8;
      }

      .search-box input {
        background: transparent;
        border: none;
        outline: none;
        color: #ffffff;
        font-size: 0.9rem;
        width: 100%;
      }

      .filters-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 1.5rem;
      }

      .filter-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .filter-group label {
        font-size: 0.8rem;
        color: #94a3b8;
        font-weight: 500;
      }

      .filter-group select {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        padding: 0.45rem 0.9rem;
        border-radius: 8px;
        font-size: 0.82rem;
        outline: none;
        cursor: pointer;
      }

      .results-badge {
        margin-left: auto;
        font-size: 0.8rem;
        color: #64748b;
        font-family: 'JetBrains Mono', monospace;
      }

      /* Table Card */
      .table-card {
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        overflow: hidden;
      }

      .table-responsive {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }

      .data-table th {
        background: rgba(15, 23, 42, 0.7);
        padding: 0.9rem 1.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .data-table td {
        padding: 1rem 1.25rem;
        font-size: 0.85rem;
        color: #e2e8f0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        vertical-align: middle;
      }

      .data-table tr:hover td {
        background: rgba(51, 65, 85, 0.3);
      }

      .scan-identity {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .scan-avatar {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .scan-avatar .material-icons {
        font-size: 1.25rem;
      }

      .avatar-network { background: rgba(14, 165, 233, 0.15); color: #38bdf8; }
      .avatar-web { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
      .avatar-ports { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
      .avatar-compliance { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
      .avatar-cve { background: rgba(239, 68, 68, 0.15); color: #f87171; }

      .scan-names {
        display: flex;
        flex-direction: column;
      }

      .scan-title {
        font-weight: 600;
        color: #ffffff;
      }

      .scan-id-hint {
        font-size: 0.72rem;
        color: #64748b;
        font-family: 'JetBrains Mono', monospace;
      }

      .type-pill {
        display: inline-block;
        padding: 0.25rem 0.65rem;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;
        font-size: 0.75rem;
        font-weight: 500;
      }

      /* Progress Bar */
      .progress-col {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 140px;
      }

      .progress-bar-bg {
        flex: 1;
        height: 8px;
        background: rgba(15, 23, 42, 0.8);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.4s ease;
      }

      .pulse-glow {
        animation: glow 1.5s infinite alternate;
      }

      @keyframes glow {
        from { filter: brightness(1); }
        to { filter: brightness(1.3); }
      }

      .progress-text {
        font-size: 0.78rem;
        font-family: 'JetBrains Mono', monospace;
        color: #94a3b8;
        font-weight: 600;
        min-width: 38px;
      }

      /* Badges */
      .badge-status {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.25rem 0.65rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .status-indicator {
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }

      .status-indicator-pulse {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #fbbf24;
        animation: pulse 1s infinite;
      }

      .status-running {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }

      .status-completed {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }
      .status-completed .status-indicator { background: #10b981; }

      .status-pending {
        background: rgba(100, 116, 139, 0.15);
        color: #94a3b8;
      }
      .status-pending .status-indicator { background: #64748b; }

      .status-failed {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
      }
      .status-failed .status-indicator { background: #ef4444; }

      .status-cancelled {
        background: rgba(148, 163, 184, 0.15);
        color: #94a3b8;
      }
      .status-cancelled .status-indicator { background: #94a3b8; }

      .badge-targets {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8rem;
        color: #38bdf8;
      }

      .badge-targets .material-icons {
        font-size: 1rem;
      }

      .badge-vulns-found {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: rgba(239, 68, 68, 0.18);
        border: 1px solid rgba(239, 68, 68, 0.35);
        color: #f87171;
        padding: 0.2rem 0.55rem;
        border-radius: 6px;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
      }

      .badge-vulns-found.large {
        font-size: 0.9rem;
        padding: 0.35rem 0.75rem;
      }

      .badge-vulns-zero {
        color: #64748b;
        font-family: 'JetBrains Mono', monospace;
      }

      .time-col {
        display: flex;
        flex-direction: column;
      }

      .time-main {
        font-size: 0.8rem;
        color: #cbd5e1;
      }

      .time-sub {
        font-size: 0.72rem;
        color: #64748b;
      }

      /* Actions */
      .action-buttons {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      .btn-icon {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #94a3b8;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-icon:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }

      .btn-icon.danger:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border-color: rgba(239, 68, 68, 0.4);
      }

      .btn-icon .material-icons {
        font-size: 1.1rem;
      }

      /* Modals */
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(10, 15, 29, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1.5rem;
      }

      .modal-card {
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        width: 100%;
        max-width: 650px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }

      .modal-scan {
        max-width: 680px;
      }

      .modal-detail {
        max-width: 700px;
      }

      .modal-confirm {
        max-width: 440px;
        text-align: center;
        padding: 2rem 1.5rem;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        background: rgba(15, 23, 42, 0.5);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .modal-title-box {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        color: #38bdf8;
      }

      .modal-title-box h3 {
        margin: 0;
        font-size: 1.15rem;
        color: #ffffff;
      }

      .btn-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
      }

      .btn-close:hover {
        color: #ffffff;
      }

      .modal-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        max-height: 70vh;
        overflow-y: auto;
      }

      .form-row {
        display: flex;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .flex-1 { flex: 1; }
      .flex-2 { flex: 2; }

      .form-group label {
        font-size: 0.8rem;
        font-weight: 500;
        color: #94a3b8;
      }

      .required { color: #f87171; }

      .form-group input,
      .form-group select {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.6rem 0.9rem;
        color: #ffffff;
        font-size: 0.88rem;
        outline: none;
        transition: border-color 0.2s;
      }

      .form-group input:focus,
      .form-group select:focus {
        border-color: #38bdf8;
      }

      .form-group input.invalid {
        border-color: #f87171;
      }

      .field-error {
        font-size: 0.75rem;
        color: #f87171;
      }

      /* Intensity Picker */
      .intensity-picker {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .intensity-option {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 0.7rem 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .intensity-option:hover {
        background: rgba(30, 41, 59, 0.6);
      }

      .intensity-option.selected {
        border-color: #38bdf8;
        background: rgba(56, 189, 248, 0.1);
      }

      .intensity-option input {
        margin-top: 0.2rem;
      }

      .intensity-option div {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .intensity-option strong {
        color: #ffffff;
        font-size: 0.85rem;
      }

      .intensity-option span {
        color: #94a3b8;
        font-size: 0.75rem;
      }

      /* Targets list */
      .targets-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .btn-text-action {
        background: transparent;
        border: none;
        color: #38bdf8;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
      }

      .btn-text-action:hover {
        text-decoration: underline;
      }

      .targets-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        max-height: 160px;
        overflow-y: auto;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.5rem;
      }

      .target-checkbox-item {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.4rem 0.6rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.82rem;
      }

      .target-checkbox-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .target-checkbox-item.checked {
        background: rgba(56, 189, 248, 0.1);
      }

      .target-name {
        color: #ffffff;
        font-weight: 500;
      }

      .target-ip {
        font-family: 'JetBrains Mono', monospace;
        color: #38bdf8;
        font-size: 0.75rem;
      }

      .target-badge {
        margin-left: auto;
        font-size: 0.7rem;
        color: #94a3b8;
        background: rgba(255, 255, 255, 0.05);
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
      }

      .no-assets-hint {
        color: #94a3b8;
        font-size: 0.8rem;
        margin: 0.5rem;
      }

      .modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        background: rgba(15, 23, 42, 0.5);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .btn-cancel {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #94a3b8;
        padding: 0.55rem 1.1rem;
        border-radius: 8px;
        font-size: 0.85rem;
        cursor: pointer;
      }

      .btn-cancel:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
      }

      .btn-submit {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
        border: none;
        color: #ffffff;
        padding: 0.55rem 1.25rem;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }

      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Detail grid */
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      .detail-item.full-width {
        grid-column: 1 / -1;
      }

      .detail-label {
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.05em;
      }

      .detail-value {
        font-size: 0.95rem;
        color: #ffffff;
        font-weight: 500;
      }

      .detail-value.code {
        font-family: 'JetBrains Mono', monospace;
        color: #38bdf8;
      }

      .detail-text {
        margin: 0;
        font-size: 0.88rem;
        color: #cbd5e1;
        line-height: 1.5;
        background: rgba(15, 23, 42, 0.4);
        padding: 0.75rem;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      /* Confirm delete */
      .confirm-icon-box {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
      }

      .confirm-icon-box .material-icons {
        font-size: 2rem;
      }

      .confirm-title {
        color: #ffffff;
        margin: 0 0 0.5rem;
        font-size: 1.2rem;
      }

      .confirm-desc {
        color: #94a3b8;
        font-size: 0.88rem;
        line-height: 1.5;
        margin: 0 0 1.5rem;
      }

      .confirm-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
      }

      .btn-delete-confirm {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: #ef4444;
        border: none;
        color: #ffffff;
        padding: 0.6rem 1.3rem;
        border-radius: 8px;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
      }

      .btn-delete-confirm:hover {
        background: #dc2626;
      }

      /* Common States */
      .notification-banner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem 1.25rem;
        border-radius: 10px;
        font-size: 0.88rem;
      }

      .notification-banner.success {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #34d399;
      }

      .notification-banner.danger {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.35);
        color: #f87171;
      }

      .loading-state, .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3.5rem 1.5rem;
        color: #94a3b8;
        gap: 0.75rem;
      }

      .empty-icon {
        font-size: 3rem;
        color: #475569;
      }

      .spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      .spinner-small {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      .rotating {
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class ScansComponent implements OnInit, OnDestroy {
  scans = signal<Scan[]>([]);
  stats = signal<ScanStats | null>(null);
  availableAssets = signal<Asset[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);

  // Filters
  searchTerm = signal('');
  selectedType = signal('ALL');
  selectedStatus = signal('ALL');

  // Modals
  isModalOpen = signal(false);
  detailScan = signal<Scan | null>(null);
  scanToDelete = signal<Scan | null>(null);
  selectedTargetIds = signal<Set<string>>(new Set());

  // Feedback
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  scanForm!: FormGroup;
  private pollIntervalId: any = null;

  filteredScans = computed(() => {
    const list = this.scans();
    const search = this.searchTerm().toLowerCase().trim();
    const type = this.selectedType();
    const status = this.selectedStatus();

    return list.filter((s) => {
      const matchSearch = !search || s.name.toLowerCase().includes(search);
      const matchType = type === 'ALL' || s.scanType === type;
      const matchStatus = status === 'ALL' || s.status === status;
      return matchSearch && matchType && matchStatus;
    });
  });

  hasRunningScans = computed(() => {
    return this.scans().some((s) => s.status === 'RUNNING' || s.status === 'PENDING');
  });

  constructor(
    private scanService: ScanService,
    private assetService: AssetService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadAll();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private initForm(): void {
    this.scanForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      scanType: ['NETWORK', Validators.required],
      intensity: ['NORMAL'],
    });
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.scanService.getScans().subscribe({
      next: (data) => {
        this.scans.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showError('Erreur de chargement des scans.');
      },
    });

    this.scanService.getStats().subscribe({
      next: (st) => this.stats.set(st),
      error: () => {},
    });
  }

  private startPolling(): void {
    this.pollIntervalId = setInterval(() => {
      if (this.hasRunningScans()) {
        this.scanService.getScans().subscribe({
          next: (data) => {
            this.scans.set(data);
          },
        });
        this.scanService.getStats().subscribe({
          next: (st) => this.stats.set(st),
        });
      }
    }, 2500);
  }

  private stopPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedType.set(select.value);
  }

  onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedStatus.set(select.value);
  }

  openCreateModal(): void {
    this.scanForm.reset({
      name: 'Scan Sécurité ' + new Date().toLocaleDateString('fr-FR'),
      scanType: 'NETWORK',
      intensity: 'NORMAL',
    });
    this.selectedTargetIds.set(new Set());

    // Load active assets to select targets
    this.assetService.getAssets().subscribe({
      next: (assets) => {
        this.availableAssets.set(assets);
        // Pre-select all by default
        const allIds = new Set(assets.map((a) => a.id));
        this.selectedTargetIds.set(allIds);
      },
    });

    this.isModalOpen.set(true);
  }

  toggleTarget(id: string): void {
    const current = new Set(this.selectedTargetIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedTargetIds.set(current);
  }

  toggleAllTargets(): void {
    const current = this.selectedTargetIds();
    const all = this.availableAssets();
    if (current.size === all.length) {
      this.selectedTargetIds.set(new Set());
    } else {
      this.selectedTargetIds.set(new Set(all.map((a) => a.id)));
    }
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  launchScan(): void {
    if (this.scanForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.scanForm.value;
    const payload: CreateScanRequest = {
      name: formVal.name,
      scanType: formVal.scanType,
      intensity: formVal.intensity,
      targetAssetIds: Array.from(this.selectedTargetIds()),
    };

    this.scanService.createScan(payload).subscribe({
      next: (created) => {
        this.scans.update((list) => [created, ...list]);
        this.isSaving.set(false);
        this.closeModal();
        this.showSuccess(`Le scan "${created.name}" a été lancé avec succès !`);
        this.refreshStats();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showError(err?.error?.message || 'Erreur lors du lancement du scan.');
      },
    });
  }

  cancelScan(scan: Scan): void {
    this.scanService.cancelScan(scan.id).subscribe({
      next: (updated) => {
        this.scans.update((list) => list.map((s) => (s.id === updated.id ? updated : s)));
        this.showSuccess(`Le scan "${scan.name}" a été interrompu.`);
        this.refreshStats();
      },
      error: () => {
        this.showError('Impossible d\'interrompre ce scan.');
      },
    });
  }

  openDetailModal(scan: Scan): void {
    this.detailScan.set(scan);
  }

  closeDetailModal(): void {
    this.detailScan.set(null);
  }

  confirmDelete(scan: Scan): void {
    this.scanToDelete.set(scan);
  }

  executeDelete(): void {
    const scan = this.scanToDelete();
    if (!scan) return;

    this.scanService.deleteScan(scan.id).subscribe({
      next: () => {
        this.scans.update((list) => list.filter((s) => s.id !== scan.id));
        this.scanToDelete.set(null);
        this.showSuccess(`L'historique du scan "${scan.name}" a été supprimé.`);
        this.refreshStats();
      },
      error: () => {
        this.scanToDelete.set(null);
        this.showError('Impossible de supprimer ce scan.');
      },
    });
  }

  private refreshStats(): void {
    this.scanService.getStats().subscribe({
      next: (st) => this.stats.set(st),
    });
  }

  getRunningCount(): number {
    return this.scans().filter((s) => s.status === 'RUNNING').length;
  }

  getCompletedCount(): number {
    return this.scans().filter((s) => s.status === 'COMPLETED').length;
  }

  getTotalVulns(): number {
    return this.scans().reduce((acc, s) => acc + (s.vulnerabilitiesFound || 0), 0);
  }

  isFieldInvalid(name: string): boolean {
    const field = this.scanForm.get(name);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  formatScanType(type: ScanType): string {
    const labels: Record<ScanType, string> = {
      NETWORK: 'Scan Réseau',
      WEB_APPLICATION: 'App Web & API',
      PORT_SCAN: 'Scan de Ports',
      COMPLIANCE: 'Conformité',
      CVE_SCAN: 'Signatures CVE',
    };
    return labels[type] || type;
  }

  getScanIcon(type: ScanType): string {
    const icons: Record<ScanType, string> = {
      NETWORK: 'radar',
      WEB_APPLICATION: 'public',
      PORT_SCAN: 'settings_ethernet',
      COMPLIANCE: 'gavel',
      CVE_SCAN: 'bug_report',
    };
    return icons[type] || 'search';
  }

  getScanAvatarClass(type: ScanType): string {
    const classes: Record<ScanType, string> = {
      NETWORK: 'avatar-network',
      WEB_APPLICATION: 'avatar-web',
      PORT_SCAN: 'avatar-ports',
      COMPLIANCE: 'avatar-compliance',
      CVE_SCAN: 'avatar-cve',
    };
    return classes[type] || '';
  }

  formatStatus(status: ScanStatus): string {
    const labels: Record<ScanStatus, string> = {
      PENDING: 'En attente',
      RUNNING: 'En cours',
      COMPLETED: 'Terminé',
      FAILED: 'Échoué',
      CANCELLED: 'Annulé',
    };
    return labels[status] || status;
  }

  getStatusClass(status: ScanStatus): string {
    const classes: Record<ScanStatus, string> = {
      PENDING: 'status-pending',
      RUNNING: 'status-running',
      COMPLETED: 'status-completed',
      FAILED: 'status-failed',
      CANCELLED: 'status-cancelled',
    };
    return classes[status] || '';
  }

  getProgressColor(status: ScanStatus): string {
    switch (status) {
      case 'COMPLETED':
        return 'linear-gradient(90deg, #10b981, #059669)';
      case 'RUNNING':
        return 'linear-gradient(90deg, #38bdf8, #6366f1)';
      case 'FAILED':
        return 'linear-gradient(90deg, #ef4444, #dc2626)';
      default:
        return 'rgba(255, 255, 255, 0.2)';
    }
  }

  getDuration(startStr?: string, endStr?: string): string {
    if (!startStr || !endStr) return '';
    try {
      const start = new Date(startStr).getTime();
      const end = new Date(endStr).getTime();
      const diffSec = Math.round((end - start) / 1000);
      if (diffSec < 60) return `${diffSec}s`;
      const min = Math.floor(diffSec / 60);
      const sec = diffSec % 60;
      return `${min}m ${sec}s`;
    } catch {
      return '';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 5000);
  }

  private showError(msg: string): void {
    this.errorMessage.set(msg);
    setTimeout(() => this.errorMessage.set(null), 5000);
  }
}
