import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-backdrop-glow"></div>
      
      <div class="login-card">
        <div class="login-header">
          <div class="brand-logo">
            <span class="material-icons logo-icon">security</span>
          </div>
          <h1>VulnPlatform</h1>
          <p class="subtitle">Plateforme Intelligente de Gestion des Vulnérabilités</p>
          <div class="soc-badge">
            <span class="pulse-dot"></span>
            SOC Operations Center — v0.1.0
          </div>
        </div>

        @if (errorMessage()) {
          <div class="error-banner">
            <span class="material-icons">error_outline</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email">Adresse Email</label>
            <div class="input-container">
              <span class="material-icons input-icon">email</span>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="ex: admin@vulnplatform.com"
                autocomplete="email"
              />
            </div>
            @if (loginForm.get('email')?.touched && loginForm.get('email')?.errors?.['required']) {
              <span class="field-error">L'adresse email est requise.</span>
            }
            @if (loginForm.get('email')?.touched && loginForm.get('email')?.errors?.['email']) {
              <span class="field-error">Veuillez saisir une adresse email valide.</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Mot de passe</label>
            <div class="input-container">
              <span class="material-icons input-icon">lock</span>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="••••••••••••"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="togglePasswordVisibility()"
                tabindex="-1"
              >
                <span class="material-icons">
                  {{ showPassword() ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
            @if (loginForm.get('password')?.touched && loginForm.get('password')?.errors?.['required']) {
              <span class="field-error">Le mot de passe est requis.</span>
            }
          </div>

          <button
            type="submit"
            class="submit-button"
            [disabled]="loginForm.invalid || isLoading()"
          >
            @if (isLoading()) {
              <span class="spinner"></span>
              <span>Authentification en cours...</span>
            } @else {
              <span class="material-icons">login</span>
              <span>Se connecter</span>
            }
          </button>
        </form>

        <div class="demo-accounts-section">
          <div class="demo-divider">
            <span>Comptes de démonstration (Sprint 1)</span>
          </div>
          <div class="demo-buttons">
            <button
              type="button"
              class="demo-chip"
              (click)="fillDemo('admin@vulnplatform.com', 'Admin123!')"
            >
              <span class="material-icons">admin_panel_settings</span>
              <div>
                <strong>Admin</strong>
                <small>admin&#64;vulnplatform.com</small>
              </div>
            </button>
            <button
              type="button"
              class="demo-chip"
              (click)="fillDemo('analyste@vulnplatform.com', 'Analyst123!')"
            >
              <span class="material-icons">biotech</span>
              <div>
                <strong>Analyste SOC</strong>
                <small>analyste&#64;vulnplatform.com</small>
              </div>
            </button>
            <button
              type="button"
              class="demo-chip"
              (click)="fillDemo('ssi@vulnplatform.com', 'Ssi123!')"
            >
              <span class="material-icons">shield</span>
              <div>
                <strong>Resp. SSI</strong>
                <small>ssi&#64;vulnplatform.com</small>
              </div>
            </button>
          </div>
        </div>

        <div class="card-footer">
          <span>Sprint 1 — Authentification JWT & Dashboard Sécurité</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrapper {
        min-height: 100vh;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at 50% 20%, #0f1c30 0%, #070b14 100%);
        padding: 1.5rem;
        position: relative;
        overflow: hidden;
      }

      .login-backdrop-glow {
        position: absolute;
        width: 500px;
        height: 500px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%);
        top: 20%;
        filter: blur(60px);
        pointer-events: none;
      }

      .login-card {
        width: 100%;
        max-width: 440px;
        background: rgba(18, 26, 44, 0.85);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.08);
        padding: 2.5rem 2rem;
        position: relative;
        z-index: 1;
      }

      .login-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .brand-logo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        border-radius: 14px;
        background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
        box-shadow: 0 8px 20px rgba(2, 132, 199, 0.35);
        margin-bottom: 1rem;
      }

      .logo-icon {
        font-size: 32px;
        color: #ffffff;
      }

      h1 {
        margin: 0;
        font-size: 1.65rem;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.02em;
      }

      .subtitle {
        margin: 0.35rem 0 0.85rem;
        font-size: 0.85rem;
        color: #94a3b8;
        line-height: 1.4;
      }

      .soc-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.25rem 0.75rem;
        background: rgba(56, 189, 248, 0.1);
        border: 1px solid rgba(56, 189, 248, 0.25);
        border-radius: 9999px;
        font-size: 0.72rem;
        color: #38bdf8;
        font-weight: 500;
      }

      .pulse-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #38bdf8;
        box-shadow: 0 0 8px #38bdf8;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.3); }
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        background: rgba(220, 38, 38, 0.15);
        border: 1px solid rgba(220, 38, 38, 0.35);
        color: #fca5a5;
        padding: 0.75rem 1rem;
        border-radius: 10px;
        font-size: 0.85rem;
        margin-bottom: 1.5rem;
      }

      .error-banner .material-icons {
        font-size: 20px;
        color: #f87171;
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      label {
        font-size: 0.82rem;
        font-weight: 500;
        color: #cbd5e1;
      }

      .input-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      .input-icon {
        position: absolute;
        left: 0.85rem;
        font-size: 19px;
        color: #64748b;
        pointer-events: none;
      }

      input {
        width: 100%;
        padding: 0.75rem 0.85rem 0.75rem 2.6rem;
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        color: #f8fafc;
        font-size: 0.9rem;
        transition: all 0.2s ease;
        outline: none;
      }

      input:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
        background: rgba(15, 23, 42, 0.95);
      }

      .password-toggle {
        position: absolute;
        right: 0.75rem;
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .password-toggle:hover {
        color: #94a3b8;
      }

      .field-error {
        font-size: 0.75rem;
        color: #f87171;
        margin-top: 0.2rem;
      }

      .submit-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.85rem 1rem;
        margin-top: 0.5rem;
        background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
        border: none;
        border-radius: 10px;
        color: #ffffff;
        font-size: 0.92rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
      }

      .submit-button:hover:not(:disabled) {
        opacity: 0.95;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(2, 132, 199, 0.45);
      }

      .submit-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .demo-accounts-section {
        margin-top: 1.75rem;
      }

      .demo-divider {
        position: relative;
        text-align: center;
        margin-bottom: 0.85rem;
      }

      .demo-divider::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
      }

      .demo-divider span {
        position: relative;
        background: #151e32;
        padding: 0 0.6rem;
        font-size: 0.72rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .demo-buttons {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
      }

      .demo-chip {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 0.5rem 0.35rem;
        color: #cbd5e1;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }

      .demo-chip:hover {
        background: rgba(56, 189, 248, 0.12);
        border-color: rgba(56, 189, 248, 0.3);
        color: #38bdf8;
      }

      .demo-chip .material-icons {
        font-size: 18px;
      }

      .demo-chip strong {
        font-size: 0.72rem;
        display: block;
      }

      .demo-chip small {
        display: none;
      }

      .card-footer {
        margin-top: 1.5rem;
        text-align: center;
        font-size: 0.7rem;
        color: #475569;
      }
    `,
  ],
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['admin@vulnplatform.com', [Validators.required, Validators.email]],
      password: ['Admin123!', [Validators.required]],
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  fillDemo(email: string, pass: string): void {
    this.loginForm.patchValue({ email, password: pass });
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Identifiants invalides (email ou mot de passe incorrect).');
        } else if (err.status === 403) {
          this.errorMessage.set('Votre compte est désactivé. Veuillez contacter un administrateur.');
        } else {
          this.errorMessage.set('Impossible de joindre le service d\'authentification. Vérifiez votre connexion.');
        }
      },
    });
  }
}
