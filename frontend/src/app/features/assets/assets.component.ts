import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AssetService } from '../../core/services/asset.service';
import {
  Asset,
  AssetStats,
  AssetStatus,
  AssetType,
  CreateAssetRequest,
  Criticality,
} from '../../core/models/asset-scan.models';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="assets-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Inventaire des Actifs & Cartographie</h1>
          <p class="page-subtitle">Supervision du parc informatique, des serveurs, bases de données et équipements réseau</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="loadAll()" [disabled]="isLoading()">
            <span class="material-icons" [class.rotating]="isLoading()">refresh</span>
            <span>Actualiser</span>
          </button>
          <button class="btn-primary" (click)="openCreateModal()">
            <span class="material-icons">add_circle</span>
            <span>Nouvel Actif</span>
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

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrapper kpi-blue">
            <span class="material-icons">dns</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Total Actifs</span>
            <span class="kpi-value">{{ stats()?.totalAssets || assets().length }}</span>
            <span class="kpi-subtext">Inventaire exhaustif</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrapper kpi-emerald">
            <span class="material-icons">check_circle</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Actifs Opérationnels</span>
            <span class="kpi-value">{{ stats()?.activeAssets || getActiveCount() }}</span>
            <span class="kpi-subtext">Statut actif en production</span>
          </div>
        </div>

        <div class="kpi-card kpi-card-danger">
          <div class="kpi-icon-wrapper kpi-rose">
            <span class="material-icons">warning</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Périmètre Critique</span>
            <span class="kpi-value critical-text">{{ stats()?.criticalAssets || getCriticalCount() }}</span>
            <span class="kpi-subtext">Actifs niveau CRITIQUE</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrapper kpi-amber">
            <span class="material-icons">priority_high</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Criticité Élevée</span>
            <span class="kpi-value">{{ stats()?.highAssets || getHighCount() }}</span>
            <span class="kpi-subtext">Actifs niveau HIGH</span>
          </div>
        </div>
      </div>

      <!-- Filter Card -->
      <div class="filter-card">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input
            type="text"
            placeholder="Rechercher par nom, adresse IP ou nom d'hôte..."
            [value]="searchTerm()"
            (input)="onSearchChange($event)"
          />
        </div>

        <div class="filters-row">
          <div class="filter-group">
            <label>Type :</label>
            <select [value]="selectedType()" (change)="onTypeChange($event)">
              <option value="ALL">Tous les types</option>
              <option value="SERVER">Serveur</option>
              <option value="DATABASE">Base de données</option>
              <option value="NETWORK">Équipement Réseau</option>
              <option value="WORKSTATION">Poste Client</option>
              <option value="WEB_APPLICATION">Application Web</option>
              <option value="CLOUD_INSTANCE">Instance Cloud</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Criticité :</label>
            <select [value]="selectedCriticality()" (change)="onCriticalityChange($event)">
              <option value="ALL">Toutes criticités</option>
              <option value="CRITICAL">Critique</option>
              <option value="HIGH">Élevée</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="LOW">Faible</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Statut :</label>
            <select [value]="selectedStatus()" (change)="onStatusChange($event)">
              <option value="ALL">Tous statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="DECOMMISSIONED">Déclassé</option>
            </select>
          </div>

          <div class="results-badge">
            <span>{{ filteredAssets().length }} actif(s) affiché(s)</span>
          </div>
        </div>
      </div>

      <!-- Assets Data Table -->
      <div class="table-card">
        @if (isLoading() && assets().length === 0) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Chargement des actifs de sécurité...</span>
          </div>
        } @else if (filteredAssets().length === 0) {
          <div class="empty-state">
            <span class="material-icons empty-icon">devices_other</span>
            <p>Aucun actif ne correspond aux filtres sélectionnés.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nom de l'Actif</th>
                  <th>Typologie</th>
                  <th>Adresse IP</th>
                  <th>Nom d'hôte</th>
                  <th>OS / Système</th>
                  <th>Criticité</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (asset of filteredAssets(); track asset.id) {
                  <tr>
                    <td>
                      <div class="asset-identity">
                        <div class="asset-avatar" [class]="getAssetAvatarClass(asset.assetType)">
                          <span class="material-icons">{{ getAssetIcon(asset.assetType) }}</span>
                        </div>
                        <div class="asset-names">
                          <span class="asset-title">{{ asset.name }}</span>
                          <span class="asset-id-hint">{{ asset.id.substring(0, 8) }}...</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="type-pill">
                        {{ formatAssetType(asset.assetType) }}
                      </span>
                    </td>
                    <td>
                      <span class="code-ip">{{ asset.ipAddress || '—' }}</span>
                    </td>
                    <td>
                      <span class="text-hostname">{{ asset.hostname || '—' }}</span>
                    </td>
                    <td>
                      <span class="text-os">{{ asset.os || '—' }}</span>
                    </td>
                    <td>
                      <span class="badge-crit" [class]="getCriticalityClass(asset.criticality)">
                        <span class="material-icons crit-icon">{{ getCriticalityIcon(asset.criticality) }}</span>
                        {{ asset.criticality }}
                      </span>
                    </td>
                    <td>
                      <span class="badge-status" [class]="getStatusClass(asset.status)">
                        <span class="status-indicator"></span>
                        {{ formatStatus(asset.status) }}
                      </span>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn-icon" title="Détails 360°" (click)="openDetailModal(asset)">
                          <span class="material-icons">visibility</span>
                        </button>
                        <button class="btn-icon" title="Modifier" (click)="openEditModal(asset)">
                          <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-icon danger" title="Supprimer" (click)="confirmDelete(asset)">
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

      <!-- Create / Edit Modal -->
      @if (isModalOpen()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <span class="material-icons">{{ editingAsset() ? 'edit' : 'add_circle' }}</span>
                <h3>{{ editingAsset() ? 'Modifier l\'Actif' : 'Enregistrer un Nouvel Actif' }}</h3>
              </div>
              <button class="btn-close" (click)="closeModal()">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="assetForm" (ngSubmit)="saveAsset()">
              <div class="modal-body">
                <div class="form-row">
                  <div class="form-group flex-2">
                    <label>Nom de l'Actif <span class="required">*</span></label>
                    <input
                      type="text"
                      formControlName="name"
                      placeholder="ex: SRV-PROD-WEB-02"
                      [class.invalid]="isFieldInvalid('name')"
                    />
                    @if (isFieldInvalid('name')) {
                      <span class="field-error">Le nom de l'actif est obligatoire</span>
                    }
                  </div>

                  <div class="form-group flex-1">
                    <label>Type d'Actif <span class="required">*</span></label>
                    <select formControlName="assetType" [class.invalid]="isFieldInvalid('assetType')">
                      <option value="SERVER">Serveur</option>
                      <option value="DATABASE">Base de données</option>
                      <option value="NETWORK">Équipement Réseau</option>
                      <option value="WORKSTATION">Poste Client</option>
                      <option value="WEB_APPLICATION">Application Web</option>
                      <option value="CLOUD_INSTANCE">Instance Cloud</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Adresse IP (v4 / v6)</label>
                    <input
                      type="text"
                      formControlName="ipAddress"
                      placeholder="ex: 192.168.1.50"
                    />
                  </div>

                  <div class="form-group flex-1">
                    <label>Nom d'Hôte (FQDN / Hostname)</label>
                    <input
                      type="text"
                      formControlName="hostname"
                      placeholder="ex: web02.dmz.internal"
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Système d'Exploitation (OS)</label>
                    <input
                      type="text"
                      formControlName="os"
                      placeholder="ex: Debian 12 / Windows Server 2022"
                    />
                  </div>

                  <div class="form-group flex-1">
                    <label>Adresse MAC</label>
                    <input
                      type="text"
                      formControlName="macAddress"
                      placeholder="ex: 00:1A:2B:3C:4D:5E"
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Niveau de Criticité</label>
                    <select formControlName="criticality">
                      <option value="LOW">Faible (LOW)</option>
                      <option value="MEDIUM">Moyenne (MEDIUM)</option>
                      <option value="HIGH">Élevée (HIGH)</option>
                      <option value="CRITICAL">Critique (CRITICAL)</option>
                    </select>
                  </div>

                  <div class="form-group flex-1">
                    <label>Statut Opérationnel</label>
                    <select formControlName="status">
                      <option value="ACTIVE">Actif (En service)</option>
                      <option value="INACTIVE">Inactif (Éteint)</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="DECOMMISSIONED">Déclassé</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label>Description & Notes d'Infrastructure</label>
                  <textarea
                    rows="3"
                    formControlName="description"
                    placeholder="Rôle de la machine, périmètre réseau, propriétaire..."
                  ></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModal()">Annuler</button>
                <button type="submit" class="btn-submit" [disabled]="assetForm.invalid || isSaving()">
                  @if (isSaving()) {
                    <div class="spinner-small"></div>
                    <span>Enregistrement...</span>
                  } @else {
                    <span class="material-icons">save</span>
                    <span>{{ editingAsset() ? 'Mettre à jour' : 'Enregistrer' }}</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Detail 360° Modal -->
      @if (detailAsset()) {
        <div class="modal-backdrop" (click)="closeDetailModal()">
          <div class="modal-card modal-detail" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <span class="material-icons">info</span>
                <h3>Détails de l'Actif : {{ detailAsset()?.name }}</h3>
              </div>
              <button class="btn-close" (click)="closeDetailModal()">
                <span class="material-icons">close</span>
              </button>
            </div>

            <div class="modal-body detail-grid">
              <div class="detail-item">
                <span class="detail-label">Identifiant Unique (UUID)</span>
                <span class="detail-value code">{{ detailAsset()?.id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Type d'Actif</span>
                <span class="detail-value">{{ formatAssetType(detailAsset()!.assetType) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Adresse IP</span>
                <span class="detail-value code">{{ detailAsset()?.ipAddress || 'Non renseignée' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Nom d'Hôte</span>
                <span class="detail-value">{{ detailAsset()?.hostname || 'Non configuré' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Système d'Exploitation</span>
                <span class="detail-value">{{ detailAsset()?.os || 'Inconnu' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Adresse MAC</span>
                <span class="detail-value code">{{ detailAsset()?.macAddress || 'Non renseignée' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Niveau de Criticité</span>
                <span class="badge-crit" [class]="getCriticalityClass(detailAsset()!.criticality)">
                  {{ detailAsset()?.criticality }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Statut Actuel</span>
                <span class="badge-status" [class]="getStatusClass(detailAsset()!.status)">
                  {{ formatStatus(detailAsset()!.status) }}
                </span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Description / Périmètre</span>
                <p class="detail-text">{{ detailAsset()?.description || 'Aucune description fournie.' }}</p>
              </div>
              <div class="detail-item">
                <span class="detail-label">Date de Création</span>
                <span class="detail-value">{{ formatDate(detailAsset()?.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Dernière Modification</span>
                <span class="detail-value">{{ formatDate(detailAsset()?.updatedAt) }}</span>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-cancel" (click)="closeDetailModal()">Fermer</button>
              <button class="btn-primary" (click)="editFromDetail(detailAsset()!)">
                <span class="material-icons">edit</span>
                <span>Modifier cet Actif</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (assetToDelete()) {
        <div class="modal-backdrop" (click)="assetToDelete.set(null)">
          <div class="modal-card modal-confirm" (click)="$event.stopPropagation()">
            <div class="confirm-icon-box">
              <span class="material-icons">warning_amber</span>
            </div>
            <h3 class="confirm-title">Confirmer la suppression</h3>
            <p class="confirm-desc">
              Êtes-vous sûr de vouloir supprimer définitivement l'actif
              <strong>{{ assetToDelete()?.name }}</strong> ({{ assetToDelete()?.ipAddress || 'sans IP' }}) ?
              Cette action est irréversible et supprimera les associations de scan.
            </p>
            <div class="confirm-actions">
              <button class="btn-cancel" (click)="assetToDelete.set(null)">Annuler</button>
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
      .assets-container {
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

      .kpi-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.15);
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

      .kpi-blue {
        background: rgba(14, 165, 233, 0.15);
        color: #38bdf8;
      }

      .kpi-emerald {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }

      .kpi-rose {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
      }

      .kpi-amber {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }

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

      .critical-text {
        color: #f87171;
      }

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

      /* Data Table */
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

      .asset-identity {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .asset-avatar {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .asset-avatar .material-icons {
        font-size: 1.25rem;
      }

      .avatar-server { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
      .avatar-db { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
      .avatar-net { background: rgba(16, 185, 129, 0.15); color: #34d399; }
      .avatar-ws { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
      .avatar-web { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
      .avatar-cloud { background: rgba(99, 102, 241, 0.15); color: #818cf8; }

      .asset-names {
        display: flex;
        flex-direction: column;
      }

      .asset-title {
        font-weight: 600;
        color: #ffffff;
      }

      .asset-id-hint {
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

      .code-ip {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.82rem;
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.1);
        padding: 0.2rem 0.5rem;
        border-radius: 5px;
      }

      .text-hostname {
        color: #94a3b8;
        font-size: 0.8rem;
      }

      .text-os {
        color: #cbd5e1;
        font-size: 0.8rem;
      }

      /* Badges */
      .badge-crit {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.25rem 0.65rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
      }

      .crit-icon {
        font-size: 0.95rem;
      }

      .crit-critical {
        background: rgba(239, 68, 68, 0.18);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.35);
      }

      .crit-high {
        background: rgba(249, 115, 22, 0.18);
        color: #fb923c;
        border: 1px solid rgba(249, 115, 22, 0.35);
      }

      .crit-medium {
        background: rgba(245, 158, 11, 0.18);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.35);
      }

      .crit-low {
        background: rgba(56, 189, 248, 0.18);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.35);
      }

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

      .status-active {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }
      .status-active .status-indicator { background: #10b981; }

      .status-inactive {
        background: rgba(100, 116, 139, 0.15);
        color: #94a3b8;
      }
      .status-inactive .status-indicator { background: #64748b; }

      .status-maint {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }
      .status-maint .status-indicator { background: #f59e0b; }

      .status-decom {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
      }
      .status-decom .status-indicator { background: #ef4444; }

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
        max-width: 640px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        overflow: hidden;
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
        gap: 1rem;
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
      .form-group select,
      .form-group textarea {
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
      .form-group select:focus,
      .form-group textarea:focus {
        border-color: #38bdf8;
      }

      .form-group input.invalid,
      .form-group select.invalid {
        border-color: #f87171;
      }

      .field-error {
        font-size: 0.75rem;
        color: #f87171;
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
export class AssetsComponent implements OnInit {
  assets = signal<Asset[]>([]);
  stats = signal<AssetStats | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);

  // Filters
  searchTerm = signal('');
  selectedType = signal('ALL');
  selectedCriticality = signal('ALL');
  selectedStatus = signal('ALL');

  // Modals
  isModalOpen = signal(false);
  editingAsset = signal<Asset | null>(null);
  detailAsset = signal<Asset | null>(null);
  assetToDelete = signal<Asset | null>(null);

  // Feedback
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  assetForm!: FormGroup;

  filteredAssets = computed(() => {
    const list = this.assets();
    const search = this.searchTerm().toLowerCase().trim();
    const type = this.selectedType();
    const crit = this.selectedCriticality();
    const status = this.selectedStatus();

    return list.filter((a) => {
      const matchSearch =
        !search ||
        a.name.toLowerCase().includes(search) ||
        (a.ipAddress && a.ipAddress.toLowerCase().includes(search)) ||
        (a.hostname && a.hostname.toLowerCase().includes(search));

      const matchType = type === 'ALL' || a.assetType === type;
      const matchCrit = crit === 'ALL' || a.criticality === crit;
      const matchStatus = status === 'ALL' || a.status === status;

      return matchSearch && matchType && matchCrit && matchStatus;
    });
  });

  constructor(
    private assetService: AssetService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadAll();
  }

  private initForm(): void {
    this.assetForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      assetType: ['SERVER', Validators.required],
      ipAddress: ['', Validators.maxLength(45)],
      hostname: ['', Validators.maxLength(255)],
      macAddress: ['', Validators.maxLength(50)],
      os: ['', Validators.maxLength(100)],
      criticality: ['MEDIUM', Validators.required],
      status: ['ACTIVE', Validators.required],
      description: ['', Validators.maxLength(1000)],
    });
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.assetService.getAssets().subscribe({
      next: (data) => {
        this.assets.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showError('Erreur de chargement des actifs.');
      },
    });

    this.assetService.getStats().subscribe({
      next: (st) => this.stats.set(st),
      error: () => {},
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedType.set(select.value);
  }

  onCriticalityChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCriticality.set(select.value);
  }

  onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedStatus.set(select.value);
  }

  openCreateModal(): void {
    this.editingAsset.set(null);
    this.assetForm.reset({
      name: '',
      assetType: 'SERVER',
      ipAddress: '',
      hostname: '',
      macAddress: '',
      os: '',
      criticality: 'MEDIUM',
      status: 'ACTIVE',
      description: '',
    });
    this.isModalOpen.set(true);
  }

  openEditModal(asset: Asset): void {
    this.editingAsset.set(asset);
    this.assetForm.patchValue({
      name: asset.name,
      assetType: asset.assetType,
      ipAddress: asset.ipAddress || '',
      hostname: asset.hostname || '',
      macAddress: asset.macAddress || '',
      os: asset.os || '',
      criticality: asset.criticality,
      status: asset.status,
      description: asset.description || '',
    });
    this.isModalOpen.set(true);
  }

  openDetailModal(asset: Asset): void {
    this.detailAsset.set(asset);
  }

  closeDetailModal(): void {
    this.detailAsset.set(null);
  }

  editFromDetail(asset: Asset): void {
    this.closeDetailModal();
    this.openEditModal(asset);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingAsset.set(null);
  }

  saveAsset(): void {
    if (this.assetForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.assetForm.value as CreateAssetRequest;
    const editing = this.editingAsset();

    if (editing) {
      this.assetService.updateAsset(editing.id, formVal).subscribe({
        next: (updated) => {
          this.assets.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
          this.isSaving.set(false);
          this.closeModal();
          this.showSuccess(`L'actif "${updated.name}" a été mis à jour.`);
          this.refreshStats();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showError(err?.error?.message || 'Erreur lors de la mise à jour.');
        },
      });
    } else {
      this.assetService.createAsset(formVal).subscribe({
        next: (created) => {
          this.assets.update((list) => [created, ...list]);
          this.isSaving.set(false);
          this.closeModal();
          this.showSuccess(`L'actif "${created.name}" a été créé avec succès.`);
          this.refreshStats();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showError(err?.error?.message || 'Erreur lors de la création.');
        },
      });
    }
  }

  confirmDelete(asset: Asset): void {
    this.assetToDelete.set(asset);
  }

  executeDelete(): void {
    const asset = this.assetToDelete();
    if (!asset) return;

    this.assetService.deleteAsset(asset.id).subscribe({
      next: () => {
        this.assets.update((list) => list.filter((a) => a.id !== asset.id));
        this.assetToDelete.set(null);
        this.showSuccess(`L'actif "${asset.name}" a été supprimé.`);
        this.refreshStats();
      },
      error: () => {
        this.assetToDelete.set(null);
        this.showError('Impossible de supprimer cet actif.');
      },
    });
  }

  private refreshStats(): void {
    this.assetService.getStats().subscribe({
      next: (st) => this.stats.set(st),
    });
  }

  getActiveCount(): number {
    return this.assets().filter((a) => a.status === 'ACTIVE').length;
  }

  getCriticalCount(): number {
    return this.assets().filter((a) => a.criticality === 'CRITICAL').length;
  }

  getHighCount(): number {
    return this.assets().filter((a) => a.criticality === 'HIGH').length;
  }

  isFieldInvalid(name: string): boolean {
    const field = this.assetForm.get(name);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  formatAssetType(type: AssetType): string {
    const labels: Record<AssetType, string> = {
      SERVER: 'Serveur',
      DATABASE: 'Base de données',
      NETWORK: 'Équipement Réseau',
      WORKSTATION: 'Poste Client',
      WEB_APPLICATION: 'Application Web',
      CLOUD_INSTANCE: 'Instance Cloud',
    };
    return labels[type] || type;
  }

  getAssetIcon(type: AssetType): string {
    const icons: Record<AssetType, string> = {
      SERVER: 'dns',
      DATABASE: 'storage',
      NETWORK: 'router',
      WORKSTATION: 'laptop_chromebook',
      WEB_APPLICATION: 'public',
      CLOUD_INSTANCE: 'cloud',
    };
    return icons[type] || 'computer';
  }

  getAssetAvatarClass(type: AssetType): string {
    const classes: Record<AssetType, string> = {
      SERVER: 'avatar-server',
      DATABASE: 'avatar-db',
      NETWORK: 'avatar-net',
      WORKSTATION: 'avatar-ws',
      WEB_APPLICATION: 'avatar-web',
      CLOUD_INSTANCE: 'avatar-cloud',
    };
    return classes[type] || '';
  }

  getCriticalityClass(crit: Criticality): string {
    const classes: Record<Criticality, string> = {
      CRITICAL: 'crit-critical',
      HIGH: 'crit-high',
      MEDIUM: 'crit-medium',
      LOW: 'crit-low',
    };
    return classes[crit] || '';
  }

  getCriticalityIcon(crit: Criticality): string {
    const icons: Record<Criticality, string> = {
      CRITICAL: 'report',
      HIGH: 'priority_high',
      MEDIUM: 'fiber_manual_record',
      LOW: 'check_circle_outline',
    };
    return icons[crit] || 'circle';
  }

  formatStatus(status: AssetStatus): string {
    const labels: Record<AssetStatus, string> = {
      ACTIVE: 'Actif',
      INACTIVE: 'Inactif',
      MAINTENANCE: 'Maintenance',
      DECOMMISSIONED: 'Déclassé',
    };
    return labels[status] || status;
  }

  getStatusClass(status: AssetStatus): string {
    const classes: Record<AssetStatus, string> = {
      ACTIVE: 'status-active',
      INACTIVE: 'status-inactive',
      MAINTENANCE: 'status-maint',
      DECOMMISSIONED: 'status-decom',
    };
    return classes[status] || '';
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
