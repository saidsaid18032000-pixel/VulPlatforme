import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../core/services/role.service';
import { Role } from '../../core/models/auth.models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="roles-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Rôles & Permissions (RBAC)</h1>
          <p class="page-subtitle">Modèle de contrôle d'accès basé sur les rôles défini dans le cahier des charges</p>
        </div>
      </div>

      <div class="matrix-card">
        <div class="card-header">
          <span class="material-icons card-icon">verified_user</span>
          <h3>Matrice des Droits et Permissions</h3>
        </div>

        <div class="roles-grid">
          @for (role of roles(); track role.id) {
            <div class="role-card">
              <div class="role-card-top">
                <div class="role-icon-box" [class]="getRoleIconClass(role.name)">
                  <span class="material-icons">{{ getRoleIcon(role.name) }}</span>
                </div>
                <div>
                  <h4 class="role-title">{{ role.name }}</h4>
                  <span class="role-badge">{{ formatRoleName(role.name) }}</span>
                </div>
              </div>

              <p class="role-desc">{{ role.description }}</p>

              <div class="permissions-section">
                <span class="perm-title">Permissions accordées :</span>
                <div class="perm-tags">
                  @for (perm of role.permissions; track perm) {
                    <span class="perm-tag" [class.perm-admin]="perm === 'ADMIN'" [class.perm-write]="perm === 'WRITE'">
                      <span class="material-icons perm-icon">
                        {{ perm === 'ADMIN' ? 'security' : (perm === 'WRITE' ? 'edit' : 'visibility') }}
                      </span>
                      {{ perm }}
                    </span>
                  }
                </div>
              </div>

              <div class="scope-box">
                <span class="scope-label">Périmètre d'action :</span>
                <p class="scope-desc">{{ getRoleScope(role.name) }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .roles-container {
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

      .matrix-card {
        background: #111a2e;
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 1.5rem;
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
      }

      .card-icon {
        color: #38bdf8;
      }

      .card-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #ffffff;
      }

      .roles-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.25rem;
      }

      .role-card {
        background: rgba(30, 41, 59, 0.45);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }

      .role-card:hover {
        transform: translateY(-2px);
        border-color: var(--border-color-light);
      }

      .role-card-top {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .role-icon-box {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .icon-admin { background: rgba(220, 38, 38, 0.15); color: #f87171; }
      .icon-analyst { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
      .icon-ssi { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
      .icon-auditor { background: rgba(16, 185, 129, 0.15); color: #34d399; }

      .role-title {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: #ffffff;
      }

      .role-badge {
        font-size: 0.68rem;
        color: #94a3b8;
      }

      .role-desc {
        margin: 0;
        font-size: 0.82rem;
        color: #cbd5e1;
        line-height: 1.45;
      }

      .permissions-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .perm-title {
        font-size: 0.72rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .perm-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }

      .perm-tag {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: rgba(59, 130, 246, 0.15);
        color: #93c5fd;
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 6px;
        padding: 0.2rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 600;
      }

      .perm-icon {
        font-size: 13px;
      }

      .perm-admin {
        background: rgba(220, 38, 38, 0.15);
        color: #fca5a5;
        border-color: rgba(220, 38, 38, 0.35);
      }

      .perm-write {
        background: rgba(245, 158, 11, 0.15);
        color: #fde68a;
        border-color: rgba(245, 158, 11, 0.35);
      }

      .scope-box {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 0.75rem;
        margin-top: auto;
      }

      .scope-label {
        font-size: 0.7rem;
        color: #64748b;
        font-weight: 600;
        display: block;
        margin-bottom: 0.25rem;
      }

      .scope-desc {
        margin: 0;
        font-size: 0.76rem;
        color: #94a3b8;
        line-height: 1.35;
      }
    `,
  ],
})
export class RolesComponent implements OnInit {
  roles = signal<Role[]>([]);

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {
    this.roleService.getRoles().subscribe({
      next: (data) => this.roles.set(data),
      error: () => {},
    });
  }

  formatRoleName(name: string): string {
    return name.replace(/_/g, ' ');
  }

  getRoleIcon(name: string): string {
    switch (name) {
      case 'ADMINISTRATEUR':
        return 'admin_panel_settings';
      case 'ANALYSTE_SOC':
        return 'biotech';
      case 'RESPONSABLE_SSI':
        return 'shield';
      case 'AUDITEUR':
        return 'fact_check';
      default:
        return 'verified_user';
    }
  }

  getRoleIconClass(name: string): string {
    switch (name) {
      case 'ADMINISTRATEUR':
        return 'icon-admin';
      case 'ANALYSTE_SOC':
        return 'icon-analyst';
      case 'RESPONSABLE_SSI':
        return 'icon-ssi';
      case 'AUDITEUR':
        return 'icon-auditor';
      default:
        return 'icon-analyst';
    }
  }

  getRoleScope(name: string): string {
    switch (name) {
      case 'ADMINISTRATEUR':
        return 'Gestion complète des utilisateurs, attribution des rôles, configuration système et audit de sécurité.';
      case 'ANALYSTE_SOC':
        return 'Lancement et planification des scans, analyse des vulnérabilités, triage des alertes et rapports techniques.';
      case 'RESPONSABLE_SSI':
        return 'Supervision des politiques de sécurité, validation des remédiations et indicateurs de conformité ISO 27001.';
      case 'AUDITEUR':
        return 'Accès en consultation seule sur les vulnérabilités, export de rapports d\'audit et historique des événements.';
      default:
        return 'Périmètre standard.';
    }
  }
}
