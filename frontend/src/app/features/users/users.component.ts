import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { RoleService } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';
import { Role, User, CreateUserRequest, UpdateUserRequest } from '../../core/models/auth.models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="users-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Gestion des Utilisateurs & RBAC</h1>
          <p class="page-subtitle">Administration des comptes, assignation des rôles et contrôle d'accès</p>
        </div>
        <button class="btn-primary" (click)="openCreateModal()">
          <span class="material-icons">person_add</span>
          <span>Nouvel Utilisateur</span>
        </button>
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

      <!-- Search & Filters Toolbar -->
      <div class="toolbar-card">
        <div class="search-box">
          <span class="material-icons search-icon">search</span>
          <input
            type="text"
            placeholder="Rechercher par nom, email ou rôle..."
            [value]="searchTerm()"
            (input)="onSearchChange($event)"
          />
        </div>
        <div class="filter-group">
          <label>Filtrer par rôle :</label>
          <select [value]="selectedRoleFilter()" (change)="onRoleFilterChange($event)">
            <option value="">Tous les rôles</option>
            <option value="ADMINISTRATEUR">Administrateur</option>
            <option value="ANALYSTE_SOC">Analyste SOC</option>
            <option value="RESPONSABLE_SSI">Responsable SSI</option>
            <option value="AUDITEUR">Auditeur</option>
          </select>
        </div>
      </div>

      <!-- Users Table -->
      <div class="table-card">
        @if (isLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Chargement des utilisateurs...</span>
          </div>
        } @else if (filteredUsers().length === 0) {
          <div class="empty-state">
            <span class="material-icons empty-icon">group_off</span>
            <p>Aucun utilisateur trouvé correspondant aux critères.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Adresse Email</th>
                  <th>Rôles Attribués</th>
                  <th>Statut</th>
                  <th>Date de création</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (user of filteredUsers(); track user.id) {
                  <tr>
                    <td>
                      <div class="user-cell">
                        <div class="user-avatar-small">
                          {{ user.firstName?.charAt(0)?.toUpperCase() || 'U' }}
                        </div>
                        <div class="user-name-col">
                          <strong>{{ user.firstName }} {{ user.lastName }}</strong>
                          @if (isCurrentLoggedUser(user)) {
                            <span class="self-tag">(Vous)</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="text-mono">{{ user.email }}</td>
                    <td>
                      <div class="role-badges">
                        @for (role of user.roles; track role) {
                          <span class="badge badge-role">{{ formatRole(role) }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      @if (user.isActive) {
                        <span class="badge badge-active">Actif</span>
                      } @else {
                        <span class="badge badge-inactive">Désactivé</span>
                      }
                    </td>
                    <td class="text-mono">{{ formatDate(user.createdAt) }}</td>
                    <td class="text-right">
                      <div class="actions-cell">
                        <button
                          class="action-btn"
                          (click)="openEditModal(user)"
                          title="Modifier"
                        >
                          <span class="material-icons">edit</span>
                        </button>

                        <button
                          class="action-btn"
                          [class.action-btn-warn]="user.isActive"
                          [class.action-btn-success]="!user.isActive"
                          (click)="toggleUserStatus(user)"
                          [disabled]="isCurrentLoggedUser(user)"
                          [title]="user.isActive ? 'Désactiver le compte' : 'Activer le compte'"
                        >
                          <span class="material-icons">
                            {{ user.isActive ? 'block' : 'check_circle_outline' }}
                          </span>
                        </button>

                        <button
                          class="action-btn action-btn-danger"
                          (click)="confirmDelete(user)"
                          [disabled]="isCurrentLoggedUser(user)"
                          title="Supprimer l'utilisateur"
                        >
                          <span class="material-icons">delete</span>
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

      <!-- Modal Create / Edit User -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ isEditMode() ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur' }}</h3>
              <button class="close-btn" (click)="closeModal()">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="userForm" (ngSubmit)="saveUser()" class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">Prénom *</label>
                  <input id="firstName" type="text" formControlName="firstName" placeholder="Prénom" />
                </div>
                <div class="form-group">
                  <label for="lastName">Nom *</label>
                  <input id="lastName" type="text" formControlName="lastName" placeholder="Nom" />
                </div>
              </div>

              <div class="form-group">
                <label for="emailInput">Adresse Email *</label>
                <input id="emailInput" type="email" formControlName="email" placeholder="utilisateur@vulnplatform.com" />
              </div>

              <div class="form-group">
                <label for="passInput">
                  {{ isEditMode() ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe initial *' }}
                </label>
                <input id="passInput" type="password" formControlName="password" placeholder="••••••••••••" />
              </div>

              <div class="form-group">
                <label>Rôles RBAC attribués *</label>
                <div class="roles-selection-grid">
                  @for (role of availableRoles; track role.name) {
                    <label class="role-checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="isRoleSelected(role.name)"
                        (change)="toggleRole(role.name, $event)"
                      />
                      <div class="role-info-box">
                        <strong>{{ formatRole(role.name) }}</strong>
                        <small>{{ role.description }}</small>
                      </div>
                    </label>
                  }
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeModal()">Annuler</button>
                <button type="submit" class="btn-primary" [disabled]="userForm.invalid || isSaving()">
                  @if (isSaving()) {
                    <span class="spinner-small"></span>
                  }
                  <span>{{ isEditMode() ? 'Mettre à jour' : 'Enregistrer' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (userToDelete()) {
        <div class="modal-backdrop" (click)="userToDelete.set(null)">
          <div class="modal-dialog modal-small" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="text-danger">Confirmer la suppression</h3>
              <button class="close-btn" (click)="userToDelete.set(null)">
                <span class="material-icons">close</span>
              </button>
            </div>
            <div class="modal-body">
              <p>Êtes-vous certain de vouloir supprimer définitivement l'utilisateur <strong>{{ userToDelete()?.email }}</strong> ?</p>
              <p class="text-muted text-sm">Cette action est irréversible et sera consignée dans le journal d'audit.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="userToDelete.set(null)">Annuler</button>
              <button type="button" class="btn-danger" (click)="executeDelete()">Supprimer</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .users-container {
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

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid var(--border-color);
        color: #cbd5e1;
        padding: 0.65rem 1.25rem;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
      }

      .btn-secondary:hover {
        background: rgba(51, 65, 85, 0.8);
      }

      .btn-danger {
        background: #dc2626;
        border: none;
        color: #ffffff;
        padding: 0.65rem 1.25rem;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
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

      .toolbar-card {
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
      }

      .search-icon {
        position: absolute;
        left: 0.85rem;
        top: 50%;
        transform: translateY(-50%);
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

      .filter-group {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .filter-group label {
        font-size: 0.8rem;
        color: #94a3b8;
      }

      .filter-group select {
        padding: 0.55rem 0.85rem;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: #ffffff;
        font-size: 0.82rem;
        outline: none;
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

      .user-cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .user-avatar-small {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #3b82f6;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.8rem;
      }

      .user-name-col {
        display: flex;
        flex-direction: column;
      }

      .self-tag {
        font-size: 0.68rem;
        color: #38bdf8;
      }

      .text-mono {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8rem;
      }

      .role-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .text-right {
        text-align: right;
      }

      .actions-cell {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .action-btn {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-color);
        color: #94a3b8;
        padding: 0.35rem;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }

      .action-btn:hover:not(:disabled) {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border-color: rgba(56, 189, 248, 0.3);
      }

      .action-btn-warn:hover:not(:disabled) {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        border-color: rgba(245, 158, 11, 0.3);
      }

      .action-btn-success:hover:not(:disabled) {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border-color: rgba(16, 185, 129, 0.3);
      }

      .action-btn-danger:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.3);
      }

      .action-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .action-btn .material-icons {
        font-size: 17px;
      }

      /* Modal styling */
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        padding: 1.5rem;
      }

      .modal-dialog {
        background: #141c2f;
        border: 1px solid var(--border-color-light);
        border-radius: 16px;
        width: 100%;
        max-width: 550px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }

      .modal-small {
        max-width: 420px;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
      }

      .modal-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #ffffff;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 0.25rem;
      }

      .modal-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .form-group label {
        font-size: 0.8rem;
        font-weight: 500;
        color: #cbd5e1;
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

      .roles-selection-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.65rem;
      }

      .role-checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: 0.65rem;
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid var(--border-color);
        padding: 0.65rem 0.75rem;
        border-radius: 8px;
        cursor: pointer;
      }

      .role-checkbox-label input {
        margin-top: 0.2rem;
      }

      .role-info-box {
        display: flex;
        flex-direction: column;
      }

      .role-info-box strong {
        font-size: 0.78rem;
        color: #ffffff;
      }

      .role-info-box small {
        font-size: 0.68rem;
        color: #94a3b8;
      }

      .modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 0.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
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
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  searchTerm = signal('');
  selectedRoleFilter = signal('');

  showModal = signal(false);
  isEditMode = signal(false);
  selectedUser = signal<User | null>(null);
  userToDelete = signal<User | null>(null);

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  availableRoles = [
    { name: 'ADMINISTRATEUR', description: 'Accès complet configuration & utilisateurs' },
    { name: 'ANALYSTE_SOC', description: 'Gestion des scans, analyse des vulnérabilités' },
    { name: 'RESPONSABLE_SSI', description: 'Supervision globale & conformité sécurité' },
    { name: 'AUDITEUR', description: 'Consultation lecture seule et rapports' },
  ];

  selectedRoles = signal<string[]>(['ANALYSTE_SOC']);
  userForm: FormGroup;

  filteredUsers = computed(() => {
    let list = this.users();
    const term = this.searchTerm().trim().toLowerCase();
    const roleFilter = this.selectedRoleFilter();

    if (term) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(term) ||
          u.firstName?.toLowerCase().includes(term) ||
          u.lastName?.toLowerCase().includes(term) ||
          u.roles?.some((r) => r.toLowerCase().includes(term))
      );
    }

    if (roleFilter) {
      list = list.filter((u) => u.roles?.includes(roleFilter) || u.roles?.includes(`ROLE_${roleFilter}`));
    }

    return list;
  });

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    public authService: AuthService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showNotification('Erreur lors du chargement des utilisateurs', true);
      },
    });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  onRoleFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedRoleFilter.set(value);
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedUser.set(null);
    this.selectedRoles.set(['ANALYSTE_SOC']);
    this.userForm.reset();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  openEditModal(user: User): void {
    this.isEditMode.set(true);
    this.selectedUser.set(user);
    this.selectedRoles.set([...(user.roles || [])]);
    this.userForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedUser.set(null);
  }

  isRoleSelected(roleName: string): boolean {
    return this.selectedRoles().includes(roleName);
  }

  toggleRole(roleName: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedRoles.update((roles) => [...roles, roleName]);
    } else {
      this.selectedRoles.update((roles) => roles.filter((r) => r !== roleName));
    }
  }

  saveUser(): void {
    if (this.userForm.invalid) return;
    if (this.selectedRoles().length === 0) {
      alert('Veuillez sélectionner au moins un rôle.');
      return;
    }

    this.isSaving.set(true);
    const formVal = this.userForm.value;

    if (this.isEditMode()) {
      const user = this.selectedUser();
      if (!user) return;

      const updatePayload: UpdateUserRequest = {
        firstName: formVal.firstName,
        lastName: formVal.lastName,
        email: formVal.email,
        roles: this.selectedRoles(),
      };
      if (formVal.password) {
        updatePayload.password = formVal.password;
      }

      this.userService.updateUser(user.id, updatePayload).subscribe({
        next: (updated) => {
          this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
          this.isSaving.set(false);
          this.closeModal();
          this.showNotification(`Utilisateur ${updated.email} mis à jour avec succès.`);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showNotification(err?.error?.message || 'Erreur lors de la mise à jour', true);
        },
      });
    } else {
      const createPayload: CreateUserRequest = {
        firstName: formVal.firstName,
        lastName: formVal.lastName,
        email: formVal.email,
        password: formVal.password,
        roles: this.selectedRoles(),
      };

      this.userService.createUser(createPayload).subscribe({
        next: (created) => {
          this.users.update((list) => [created, ...list]);
          this.isSaving.set(false);
          this.closeModal();
          this.showNotification(`Utilisateur ${created.email} créé avec succès.`);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showNotification(err?.error?.message || 'Erreur lors de la création', true);
        },
      });
    }
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.isActive;
    this.userService.updateStatus(user.id, newStatus).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.showNotification(`Statut de ${user.email} changé à ${newStatus ? 'Actif' : 'Désactivé'}.`);
      },
      error: () => {
        this.showNotification('Impossible de modifier le statut.', true);
      },
    });
  }

  confirmDelete(user: User): void {
    this.userToDelete.set(user);
  }

  executeDelete(): void {
    const user = this.userToDelete();
    if (!user) return;

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== user.id));
        this.userToDelete.set(null);
        this.showNotification(`Utilisateur ${user.email} supprimé avec succès.`);
      },
      error: () => {
        this.userToDelete.set(null);
        this.showNotification('Erreur lors de la suppression de l\'utilisateur.', true);
      },
    });
  }

  isCurrentLoggedUser(user: User): boolean {
    const current = this.authService.currentUser();
    return current?.id === user.id;
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

  private showNotification(msg: string, isError = false): void {
    if (isError) {
      this.errorMessage.set(msg);
      setTimeout(() => this.errorMessage.set(null), 5000);
    } else {
      this.successMessage.set(msg);
      setTimeout(() => this.successMessage.set(null), 4000);
    }
  }
}
