import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout-container">
      <!-- Top Navigation Bar -->
      <header class="top-navbar">
        <div class="nav-brand">
          <div class="logo-box">
            <span class="material-icons logo-icon">security</span>
          </div>
          <div class="brand-text">
            <span class="brand-title">VulnPlatform</span>
            <span class="brand-badge">SOC INTELLIGENCE</span>
          </div>
        </div>

        <div class="nav-actions">
          <div class="status-indicator">
            <span class="pulse-indicator"></span>
            <span>Microservices UP</span>
          </div>

          <div class="user-profile-menu">
            <div class="user-avatar">
              {{ getUserInitial() }}
            </div>
            <div class="user-details">
              <span class="user-name">{{ getUserFullName() }}</span>
              <span class="user-role badge badge-role">{{ getMainRole() }}</span>
            </div>
            <button class="logout-btn" (click)="onLogout()" title="Se déconnecter">
              <span class="material-icons">logout</span>
              <span class="logout-text">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div class="layout-body">
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
          <div class="sidebar-section">
            <span class="section-title">NAVIGATION</span>
            <nav class="nav-list">
              <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
                <span class="material-icons">dashboard</span>
                <span>Tableau de bord</span>
              </a>

              <a routerLink="/assets" routerLinkActive="active" class="nav-item">
                <span class="material-icons">dns</span>
                <span>Actifs & Cartographie</span>
              </a>

              <a routerLink="/scans" routerLinkActive="active" class="nav-item">
                <span class="material-icons">radar</span>
                <span>Moteur de Scans</span>
              </a>

              @if (canManageUsers()) {
                <a routerLink="/users" routerLinkActive="active" class="nav-item">
                  <span class="material-icons">manage_accounts</span>
                  <span>Utilisateurs RBAC</span>
                </a>

                <a routerLink="/roles" routerLinkActive="active" class="nav-item">
                  <span class="material-icons">admin_panel_settings</span>
                  <span>Rôles & Permissions</span>
                </a>
              }

              <a routerLink="/audit" routerLinkActive="active" class="nav-item">
                <span class="material-icons">history</span>
                <span>Journal d'audit</span>
              </a>

              <a routerLink="/profile" routerLinkActive="active" class="nav-item">
                <span class="material-icons">account_circle</span>
                <span>Mon profil</span>
              </a>
            </nav>
          </div>

          <div class="sidebar-footer">
            <div class="sprint-info-card">
              <span class="sprint-tag">Sprint 2</span>
              <p>Actifs & Moteur de Scans actif</p>
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .layout-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
        background-color: var(--bg-primary);
      }

      .top-navbar {
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.5rem;
        background-color: #0f172a;
        border-bottom: 1px solid var(--border-color);
        z-index: 10;
        flex-shrink: 0;
      }

      .nav-brand {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .logo-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
        color: #ffffff;
      }

      .logo-icon {
        font-size: 22px;
      }

      .brand-text {
        display: flex;
        flex-direction: column;
      }

      .brand-title {
        font-weight: 700;
        font-size: 1.1rem;
        letter-spacing: -0.01em;
        color: #ffffff;
      }

      .brand-badge {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #38bdf8;
      }

      .nav-actions {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: #10b981;
        background: rgba(16, 185, 129, 0.1);
        padding: 0.3rem 0.65rem;
        border-radius: 9999px;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }

      .pulse-indicator {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background-color: #10b981;
        box-shadow: 0 0 8px #10b981;
      }

      .user-profile-menu {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        background: rgba(30, 41, 59, 0.6);
        padding: 0.35rem 0.5rem 0.35rem 0.85rem;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #3b82f6;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.85rem;
      }

      .user-details {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .user-name {
        font-size: 0.82rem;
        font-weight: 600;
        color: #ffffff;
      }

      .user-role {
        font-size: 0.65rem;
        padding: 0.1rem 0.4rem;
      }

      .logout-btn {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        background: rgba(239, 68, 68, 0.12);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.25);
        padding: 0.35rem 0.75rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.78rem;
        font-weight: 500;
        transition: all 0.2s ease;
        margin-left: 0.5rem;
      }

      .logout-btn:hover {
        background: rgba(239, 68, 68, 0.25);
        color: #ffffff;
      }

      .logout-btn .material-icons {
        font-size: 16px;
      }

      .layout-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .sidebar {
        width: 250px;
        background-color: #0b1120;
        border-right: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 1.25rem 0.85rem;
        flex-shrink: 0;
      }

      .section-title {
        display: block;
        font-size: 0.68rem;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.08em;
        margin: 0.5rem 0.75rem 0.75rem;
      }

      .nav-list {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem 0.85rem;
        border-radius: 10px;
        color: #94a3b8;
        text-decoration: none;
        font-size: 0.86rem;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .nav-item:hover {
        background-color: rgba(255, 255, 255, 0.04);
        color: #ffffff;
      }

      .nav-item.active {
        background: linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%);
        color: #38bdf8;
        border-left: 3px solid #38bdf8;
        font-weight: 600;
      }

      .nav-item .material-icons {
        font-size: 20px;
      }

      .sidebar-footer {
        padding-top: 1rem;
      }

      .sprint-info-card {
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 0.85rem;
      }

      .sprint-tag {
        display: inline-block;
        font-size: 0.68rem;
        font-weight: 700;
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.15);
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
        margin-bottom: 0.35rem;
      }

      .sprint-info-card p {
        margin: 0;
        font-size: 0.74rem;
        color: #94a3b8;
        line-height: 1.35;
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
        background-color: var(--bg-primary);
      }
    `,
  ],
})
export class MainLayoutComponent {
  constructor(public authService: AuthService) {}

  getUserFullName(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Utilisateur';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  }

  getUserInitial(): string {
    const user = this.authService.currentUser();
    if (!user || !user.firstName) return 'U';
    return user.firstName.charAt(0).toUpperCase();
  }

  getMainRole(): string {
    const user = this.authService.currentUser();
    if (!user || !user.roles || !user.roles.length) return 'UTILISATEUR';
    return user.roles[0].replace('ROLE_', '');
  }

  canManageUsers(): boolean {
    return this.authService.hasAnyRole(['ADMINISTRATEUR', 'RESPONSABLE_SSI']);
  }

  onLogout(): void {
    this.authService.logout();
  }
}
