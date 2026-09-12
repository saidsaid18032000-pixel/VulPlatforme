import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/auth.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mon Profil Utilisateur</h1>
          <p class="page-subtitle">Informations de compte, habilitations de sécurité et préférences</p>
        </div>
      </div>

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

      <div class="profile-grid">
        <!-- Profile Identity Card -->
        <div class="profile-card">
          <div class="user-hero">
            <div class="avatar-large">
              {{ getUserInitial() }}
            </div>
            <div class="hero-info">
              <h3>{{ currentUser()?.firstName }} {{ currentUser()?.lastName }}</h3>
              <p class="user-email text-mono">{{ currentUser()?.email }}</p>
              <div class="badge-row">
                @for (role of currentUser()?.roles; track role) {
                  <span class="badge badge-role">{{ formatRole(role) }}</span>
                }
                <span class="badge badge-active">Compte Actif</span>
              </div>
            </div>
          </div>

          <div class="info-list">
            <div class="info-item">
              <span class="info-label">Identifiant Unique (UUID)</span>
              <span class="info-val text-mono text-dim">{{ currentUser()?.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date d'inscription</span>
              <span class="info-val text-mono">{{ formatDate(currentUser()?.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Permissions actives</span>
              <div class="perm-chips">
                @for (perm of currentUser()?.permissions; track perm) {
                  <span class="perm-chip">{{ perm }}</span>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Edit Profile Form -->
        <div class="profile-card">
          <div class="card-header">
            <span class="material-icons">edit_note</span>
            <h3>Modifier mes coordonnées</h3>
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()" class="profile-form">
            <div class="form-row">
              <div class="form-group">
                <label for="profFirst">Prénom</label>
                <input id="profFirst" type="text" formControlName="firstName" />
              </div>
              <div class="form-group">
                <label for="profLast">Nom</label>
                <input id="profLast" type="text" formControlName="lastName" />
              </div>
            </div>

            <div class="form-group">
              <label for="profEmail">Adresse Email</label>
              <input id="profEmail" type="email" formControlName="email" />
            </div>

            <div class="password-section">
              <span class="section-subtitle">Changement de mot de passe</span>
              <div class="form-group">
                <label for="newPass">Nouveau mot de passe (optionnel)</label>
                <input
                  id="newPass"
                  type="password"
                  formControlName="password"
                  placeholder="Laisser vide si inchangé"
                />
              </div>
            </div>

            <button type="submit" class="btn-save" [disabled]="profileForm.invalid || isSaving()">
              @if (isSaving()) {
                <span class="spinner-small"></span>
              }
              <span>Enregistrer les modifications</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-container {
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

      .notification-banner {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.75rem 1.25rem;
        border-radius: 10px;
        font-size: 0.85rem;
      }

      .notification-banner.success {
        background: rgba(16, 185, 129, 0.15);
        color: #6ee7b7;
        border: 1px solid rgba(16, 185, 129, 0.35);
      }

      .notification-banner.danger {
        background: rgba(239, 68, 68, 0.15);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.35);
      }

      .profile-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }

      @media (max-width: 900px) {
        .profile-grid {
          grid-template-columns: 1fr;
        }
      }

      .profile-card {
        background: #111a2e;
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 1.75rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .user-hero {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
      }

      .avatar-large {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
        color: #ffffff;
        font-size: 1.75rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(2, 132, 199, 0.35);
      }

      .hero-info h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: #ffffff;
      }

      .user-email {
        margin: 0.2rem 0 0.5rem;
        font-size: 0.85rem;
        color: #94a3b8;
      }

      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }

      .info-list {
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .info-label {
        font-size: 0.72rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .info-val {
        font-size: 0.86rem;
        color: #e2e8f0;
      }

      .perm-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .perm-chip {
        font-size: 0.7rem;
        font-weight: 600;
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.25);
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        color: #ffffff;
        padding-bottom: 0.85rem;
        border-bottom: 1px solid var(--border-color);
      }

      .card-header h3 {
        margin: 0;
        font-size: 1.05rem;
      }

      .profile-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .form-group label {
        font-size: 0.82rem;
        color: #cbd5e1;
        font-weight: 500;
      }

      .form-group input {
        padding: 0.65rem 0.85rem;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: #ffffff;
        font-size: 0.85rem;
        outline: none;
      }

      .form-group input:focus {
        border-color: #38bdf8;
      }

      .password-section {
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.05);
        padding: 1rem;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .section-subtitle {
        font-size: 0.78rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .btn-save {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
        border: none;
        color: #ffffff;
        padding: 0.75rem 1.25rem;
        border-radius: 10px;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 0.5rem;
      }

      .btn-save:hover:not(:disabled) {
        opacity: 0.95;
        transform: translateY(-1px);
      }

      .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .text-mono {
        font-family: 'JetBrains Mono', monospace;
      }

      .text-dim {
        color: #64748b;
        font-size: 0.76rem !important;
      }

      .spinner-small {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  currentUser = signal<User | null>(null);
  profileForm: FormGroup;
  isSaving = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.currentUser.set(user);
      this.profileForm.patchValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
      });
    }

    // Refresh profile from server
    this.authService.fetchProfile().subscribe({
      next: (freshUser) => {
        this.currentUser.set(freshUser);
        this.profileForm.patchValue({
          firstName: freshUser.firstName,
          lastName: freshUser.lastName,
          email: freshUser.email,
        });
      },
      error: () => {},
    });
  }

  getUserInitial(): string {
    const user = this.currentUser();
    return user?.firstName?.charAt(0)?.toUpperCase() || 'U';
  }

  formatRole(role: string): string {
    return role.replace('ROLE_', '');
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  onSaveProfile(): void {
    const user = this.currentUser();
    if (!user || this.profileForm.invalid) return;

    this.isSaving.set(true);
    const val = this.profileForm.value;

    this.userService
      .updateUser(user.id, {
        firstName: val.firstName,
        lastName: val.lastName,
        email: val.email,
        password: val.password ? val.password : undefined,
      })
      .subscribe({
        next: (updated) => {
          this.currentUser.set(updated);
          this.isSaving.set(false);
          this.successMessage.set('Profil mis à jour avec succès.');
          setTimeout(() => this.successMessage.set(null), 4000);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.message || 'Erreur lors de la mise à jour.');
          setTimeout(() => this.errorMessage.set(null), 5000);
        },
      });
  }
}
