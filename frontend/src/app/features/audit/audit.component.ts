import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../core/services/audit.service';
import { AuditLog } from '../../core/models/auth.models';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="audit-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Journal d'Audit & Événements</h1>
          <p class="page-subtitle">Traçabilité complète des accès, connexions et modifications (conformité SOC / SSI)</p>
        </div>
        <button class="btn-refresh" (click)="loadLogs()" [disabled]="isLoading()">
          <span class="material-icons" [class.rotating]="isLoading()">refresh</span>
          <span>Actualiser</span>
        </button>
      </div>

      <div class="filter-card">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input
            type="text"
            placeholder="Filtrer par action, utilisateur ou adresse IP..."
            [value]="filterTerm()"
            (input)="onFilterChange($event)"
          />
        </div>
        <div class="stats-badge">
          <span>Total logs : <strong>{{ logs().length }}</strong></span>
        </div>
      </div>

      <div class="table-card">
        @if (isLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Récupération du journal d'audit...</span>
          </div>
        } @else if (filteredLogs().length === 0) {
          <div class="empty-state">
            <span class="material-icons empty-icon">history_toggle_off</span>
            <p>Aucun événement d'audit ne correspond aux critères.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Horodatage (UTC)</th>
                  <th>Action Détectée</th>
                  <th>Détails & Périmètre</th>
                  <th>Identifiant Utilisateur</th>
                  <th>Adresse IP Source</th>
                </tr>
              </thead>
              <tbody>
                @for (log of filteredLogs(); track log.id) {
                  <tr>
                    <td class="text-mono">{{ formatDate(log.createdAt) }}</td>
                    <td>
                      <span class="action-badge" [class]="getActionClass(log.action)">
                        <span class="material-icons action-icon">{{ getActionIcon(log.action) }}</span>
                        {{ log.action }}
                      </span>
                    </td>
                    <td>{{ log.details || '—' }}</td>
                    <td class="text-mono text-dim">{{ log.userId || 'Système / Anonyme' }}</td>
                    <td class="text-mono">{{ log.ipAddress || '127.0.0.1' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .audit-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .page-header {
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
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-refresh:hover:not(:disabled) {
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
      }

      .rotating {
        animation: spin 0.8s linear infinite;
      }

      .filter-card {
        background: #111a2e;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1rem 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .search-box {
        position: relative;
        flex: 1;
        max-width: 450px;
        display: flex;
        align-items: center;
      }

      .search-box .material-icons {
        position: absolute;
        left: 0.85rem;
        font-size: 19px;
        color: #64748b;
      }

      .search-box input {
        width: 100%;
        padding: 0.6rem 0.85rem 0.6rem 2.5rem;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: #ffffff;
        font-size: 0.85rem;
        outline: none;
      }

      .search-box input:focus {
        border-color: #38bdf8;
      }

      .stats-badge {
        font-size: 0.82rem;
        color: #94a3b8;
      }

      .stats-badge strong {
        color: #38bdf8;
      }

      .table-card {
        background: #111a2e;
        border: 1px solid var(--border-color);
        border-radius: 14px;
        overflow: hidden;
      }

      .table-responsive {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }

      .data-table th {
        background: #0d1525;
        padding: 0.85rem 1.25rem;
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--border-color);
        text-align: left;
      }

      .data-table td {
        padding: 0.95rem 1.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        color: #cbd5e1;
      }

      .data-table tr:hover td {
        background-color: rgba(255, 255, 255, 0.02);
      }

      .text-mono {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8rem;
      }

      .text-dim {
        color: #64748b !important;
      }

      .action-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.25rem 0.65rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .action-icon {
        font-size: 14px;
      }

      .badge-login {
        background: rgba(16, 185, 129, 0.15);
        color: #6ee7b7;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      .badge-create {
        background: rgba(56, 189, 248, 0.15);
        color: #7dd3fc;
        border: 1px solid rgba(56, 189, 248, 0.3);
      }

      .badge-update {
        background: rgba(245, 158, 11, 0.15);
        color: #fde68a;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }

      .badge-delete {
        background: rgba(239, 68, 68, 0.15);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .badge-generic {
        background: rgba(99, 102, 241, 0.15);
        color: #c7d2fe;
        border: 1px solid rgba(99, 102, 241, 0.3);
      }

      .loading-state, .empty-state {
        padding: 3rem;
        text-align: center;
        color: #94a3b8;
      }

      .empty-icon {
        font-size: 40px;
        color: #475569;
        margin-bottom: 0.5rem;
      }

      .spinner {
        width: 28px;
        height: 28px;
        border: 3px solid rgba(56, 189, 248, 0.2);
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 0.75rem;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class AuditComponent implements OnInit {
  logs = signal<AuditLog[]>([]);
  isLoading = signal(false);
  filterTerm = signal('');

  filteredLogs = computed(() => {
    const term = this.filterTerm().trim().toLowerCase();
    if (!term) return this.logs();
    return this.logs().filter(
      (l) =>
        l.action?.toLowerCase().includes(term) ||
        l.details?.toLowerCase().includes(term) ||
        l.ipAddress?.toLowerCase().includes(term) ||
        l.userId?.toLowerCase().includes(term)
    );
  });

  constructor(private auditService: AuditService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.auditService.getAuditLogs().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.filterTerm.set(val);
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

  getActionClass(action: string): string {
    if (action.includes('LOGIN')) return 'badge-login';
    if (action.includes('CREATE')) return 'badge-create';
    if (action.includes('UPDATE') || action.includes('STATUS')) return 'badge-update';
    if (action.includes('DELETE')) return 'badge-delete';
    return 'badge-generic';
  }

  getActionIcon(action: string): string {
    if (action.includes('LOGIN')) return 'login';
    if (action.includes('CREATE')) return 'add_circle';
    if (action.includes('UPDATE')) return 'edit';
    if (action.includes('STATUS')) return 'toggle_on';
    if (action.includes('DELETE')) return 'delete_forever';
    return 'info';
  }
}
