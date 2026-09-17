import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VulnerabilityService } from '../../core/services/vulnerability.service';
import {
  CreateVulnerabilityRequest,
  Severity,
  Vulnerability,
  VulnerabilityStats,
  VulnerabilityStatus,
} from '../../core/models/vuln-alert.models';

@Component({
  selector: 'app-vulnerabilities',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Catalogue des Vulnérabilités</h1>
          <p>Suivi du cycle de vie des CVE : ouverture, traitement et remédiation</p>
        </div>
        <div class="actions">
          <button class="btn ghost" (click)="loadAll()" [disabled]="loading()">
            <span class="material-icons">refresh</span> Actualiser
          </button>
          <button class="btn primary" (click)="openCreate()">
            <span class="material-icons">bug_report</span> Nouvelle vulnérabilité
          </button>
        </div>
      </div>

      @if (success()) {
        <div class="banner ok">{{ success() }}</div>
      }
      @if (error()) {
        <div class="banner err">{{ error() }}</div>
      }

      <div class="kpis">
        <div class="kpi"><span class="label">Total</span><strong>{{ stats()?.totalVulnerabilities || vulns().length }}</strong></div>
        <div class="kpi"><span class="label">Ouvertes</span><strong>{{ stats()?.openVulnerabilities || 0 }}</strong></div>
        <div class="kpi danger"><span class="label">Critiques</span><strong>{{ stats()?.criticalCount || 0 }}</strong></div>
        <div class="kpi warn"><span class="label">Élevées</span><strong>{{ stats()?.highCount || 0 }}</strong></div>
        <div class="kpi"><span class="label">Remédiées</span><strong>{{ stats()?.remediatedVulnerabilities || 0 }}</strong></div>
      </div>

      <div class="filters">
        <input type="search" placeholder="Rechercher CVE / titre..." [formControl]="searchCtrl" (input)="applyFilters()" />
        <select [formControl]="severityCtrl" (change)="applyFilters()">
          <option value="ALL">Toutes sévérités</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
          <option value="INFO">INFO</option>
        </select>
        <select [formControl]="statusCtrl" (change)="applyFilters()">
          <option value="ALL">Tous statuts</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="REMEDIATED">REMEDIATED</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
          <option value="ACCEPTED_RISK">ACCEPTED_RISK</option>
        </select>
        <span class="count">{{ filtered().length }} résultat(s)</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>CVE / Titre</th>
              <th>Sévérité</th>
              <th>CVSS</th>
              <th>Statut</th>
              <th>Découverte</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (v of filtered(); track v.id) {
              <tr>
                <td>
                  <div class="title-cell">
                    <span class="cve">{{ v.cveId || 'N/A' }}</span>
                    <span class="title">{{ v.title }}</span>
                  </div>
                </td>
                <td><span class="badge" [class]="sevClass(v.severity)">{{ v.severity }}</span></td>
                <td class="mono">{{ v.cvssScore ?? '—' }}</td>
                <td><span class="badge status" [class]="statusClass(v.status)">{{ v.status }}</span></td>
                <td class="mono">{{ v.discoveredAt | date:'short' }}</td>
                <td class="row-actions">
                  <button title="Détails" (click)="openDetails(v)"><span class="material-icons">visibility</span></button>
                  <button title="En cours" (click)="setStatus(v, 'IN_PROGRESS')" [disabled]="v.status === 'IN_PROGRESS'"><span class="material-icons">play_arrow</span></button>
                  <button title="Remédier" (click)="setStatus(v, 'REMEDIATED')" [disabled]="v.status === 'REMEDIATED'"><span class="material-icons">verified</span></button>
                  <button title="Supprimer" class="danger" (click)="confirmDelete(v)"><span class="material-icons">delete</span></button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">Aucune vulnérabilité trouvée</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (showForm()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>{{ editingId() ? 'Modifier' : 'Nouvelle' }} vulnérabilité</h2>
            <form [formGroup]="form" (ngSubmit)="save()">
              <label>CVE ID<input formControlName="cveId" placeholder="CVE-2021-44228" /></label>
              <label>Titre *<input formControlName="title" /></label>
              <label>Description<textarea formControlName="description" rows="3"></textarea></label>
              <div class="grid2">
                <label>Sévérité *
                  <select formControlName="severity">
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                    <option value="INFO">INFO</option>
                  </select>
                </label>
                <label>CVSS<input type="number" step="0.1" min="0" max="10" formControlName="cvssScore" /></label>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn ghost" (click)="closeModals()">Annuler</button>
                <button type="submit" class="btn primary" [disabled]="form.invalid || saving()">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (details()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>Détails vulnérabilité</h2>
            <p><strong>CVE :</strong> {{ details()!.cveId || 'N/A' }}</p>
            <p><strong>Titre :</strong> {{ details()!.title }}</p>
            <p><strong>Sévérité :</strong> {{ details()!.severity }} · CVSS {{ details()!.cvssScore ?? '—' }}</p>
            <p><strong>Statut :</strong> {{ details()!.status }}</p>
            <p><strong>Description :</strong> {{ details()!.description || '—' }}</p>
            <p class="mono"><strong>ID :</strong> {{ details()!.id }}</p>
            <div class="modal-actions">
              <button class="btn ghost" (click)="closeModals()">Fermer</button>
            </div>
          </div>
        </div>
      }

      @if (toDelete()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>Confirmer la suppression</h2>
            <p>Supprimer « {{ toDelete()!.title }} » ?</p>
            <div class="modal-actions">
              <button class="btn ghost" (click)="closeModals()">Annuler</button>
              <button class="btn danger" (click)="doDelete()">Supprimer</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; gap:1.25rem; }
    .page-header { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
    h1 { margin:0; font-size:1.6rem; color:#f8fafc; }
    .page-header p { margin:.35rem 0 0; color:#94a3b8; font-size:.9rem; }
    .actions { display:flex; gap:.6rem; }
    .btn { display:inline-flex; align-items:center; gap:.4rem; border:none; border-radius:8px; padding:.55rem 1rem; cursor:pointer; font-weight:600; }
    .btn .material-icons { font-size:1.1rem; }
    .btn.primary { background:linear-gradient(135deg,#0ea5e9,#0284c7); color:#fff; }
    .btn.ghost { background:rgba(148,163,184,.12); color:#e2e8f0; border:1px solid rgba(148,163,184,.2); }
    .btn.danger { background:#e11d48; color:#fff; }
    .banner { padding:.75rem 1rem; border-radius:10px; font-size:.9rem; }
    .banner.ok { background:rgba(16,185,129,.15); color:#6ee7b7; border:1px solid rgba(16,185,129,.3); }
    .banner.err { background:rgba(244,63,94,.15); color:#fda4af; border:1px solid rgba(244,63,94,.3); }
    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.8rem; }
    .kpi { background:rgba(30,41,59,.6); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:1rem; }
    .kpi .label { display:block; color:#94a3b8; font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; }
    .kpi strong { font-size:1.5rem; color:#f1f5f9; }
    .kpi.danger strong { color:#fb7185; }
    .kpi.warn strong { color:#fbbf24; }
    .filters { display:flex; gap:.75rem; flex-wrap:wrap; align-items:center; background:rgba(30,41,59,.45); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:1rem; }
    .filters input, .filters select, label input, label select, label textarea { background:#0f172a; border:1px solid rgba(148,163,184,.25); color:#e2e8f0; border-radius:8px; padding:.55rem .75rem; }
    .filters input { min-width:220px; flex:1; }
    .count { margin-left:auto; color:#64748b; font-size:.8rem; font-family:'JetBrains Mono',monospace; }
    .table-wrap { overflow:auto; border-radius:12px; border:1px solid rgba(255,255,255,.08); background:rgba(30,41,59,.45); }
    table { width:100%; border-collapse:collapse; }
    th { text-align:left; padding:.85rem 1rem; font-size:.72rem; text-transform:uppercase; color:#94a3b8; background:rgba(15,23,42,.7); }
    td { padding:.9rem 1rem; border-top:1px solid rgba(255,255,255,.05); color:#e2e8f0; font-size:.85rem; }
    .title-cell { display:flex; flex-direction:column; gap:.15rem; }
    .cve { font-family:'JetBrains Mono',monospace; color:#38bdf8; font-size:.78rem; }
    .title { font-weight:600; }
    .mono { font-family:'JetBrains Mono',monospace; font-size:.8rem; color:#94a3b8; }
    .badge { display:inline-block; padding:.2rem .55rem; border-radius:999px; font-size:.7rem; font-weight:700; }
    .sev-critical { background:rgba(244,63,94,.2); color:#fb7185; }
    .sev-high { background:rgba(249,115,22,.2); color:#fb923c; }
    .sev-medium { background:rgba(234,179,8,.2); color:#facc15; }
    .sev-low { background:rgba(34,197,94,.2); color:#4ade80; }
    .sev-info { background:rgba(56,189,248,.2); color:#38bdf8; }
    .st-open { background:rgba(244,63,94,.15); color:#fda4af; }
    .st-progress { background:rgba(56,189,248,.15); color:#7dd3fc; }
    .st-done { background:rgba(34,197,94,.15); color:#86efac; }
    .st-other { background:rgba(148,163,184,.15); color:#cbd5e1; }
    .row-actions { display:flex; gap:.25rem; }
    .row-actions button { background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:.25rem; border-radius:6px; }
    .row-actions button:hover { background:rgba(148,163,184,.15); color:#e2e8f0; }
    .row-actions button.danger:hover { color:#fb7185; }
    .empty { text-align:center; color:#64748b; padding:2rem !important; }
    .modal-backdrop { position:fixed; inset:0; background:rgba(2,6,23,.7); display:flex; align-items:center; justify-content:center; z-index:50; padding:1rem; }
    .modal { width:min(520px,100%); background:#1e293b; border:1px solid rgba(255,255,255,.1); border-radius:14px; padding:1.5rem; }
    .modal h2 { margin:0 0 1rem; color:#f8fafc; }
    .modal label { display:flex; flex-direction:column; gap:.35rem; margin-bottom:.85rem; color:#94a3b8; font-size:.8rem; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
    .modal-actions { display:flex; justify-content:flex-end; gap:.6rem; margin-top:1rem; }
    @media (max-width:640px){ .grid2{grid-template-columns:1fr;} }
  `],
})
export class VulnerabilitiesComponent implements OnInit {
  vulns = signal<Vulnerability[]>([]);
  filtered = signal<Vulnerability[]>([]);
  stats = signal<VulnerabilityStats | null>(null);
  loading = signal(false);
  saving = signal(false);
  success = signal('');
  error = signal('');
  showForm = signal(false);
  editingId = signal<string | null>(null);
  details = signal<Vulnerability | null>(null);
  toDelete = signal<Vulnerability | null>(null);

  form: FormGroup;
  searchCtrl;
  severityCtrl;
  statusCtrl;

  constructor(private api: VulnerabilityService, private fb: FormBuilder) {
    this.form = this.fb.group({
      cveId: [''],
      title: ['', Validators.required],
      description: [''],
      severity: ['HIGH' as Severity, Validators.required],
      cvssScore: [null as number | null],
    });
    this.searchCtrl = this.fb.control('');
    this.severityCtrl = this.fb.control('ALL');
    this.statusCtrl = this.fb.control('ALL');
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getStats().subscribe({ next: (s) => this.stats.set(s), error: () => {} });
    this.api.getAll().subscribe({
      next: (list) => {
        this.vulns.set(list);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Impossible de charger les vulnérabilités');
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    const q = (this.searchCtrl.value || '').toLowerCase();
    const sev = this.severityCtrl.value;
    const st = this.statusCtrl.value;
    this.filtered.set(
      this.vulns().filter((v) => {
        const matchQ =
          !q ||
          v.title.toLowerCase().includes(q) ||
          (v.cveId || '').toLowerCase().includes(q);
        const matchSev = sev === 'ALL' || v.severity === sev;
        const matchSt = st === 'ALL' || v.status === st;
        return matchQ && matchSev && matchSt;
      })
    );
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ severity: 'HIGH', cveId: '', title: '', description: '', cvssScore: null });
    this.showForm.set(true);
  }

  openDetails(v: Vulnerability): void {
    this.details.set(v);
  }

  confirmDelete(v: Vulnerability): void {
    this.toDelete.set(v);
  }

  closeModals(): void {
    this.showForm.set(false);
    this.details.set(null);
    this.toDelete.set(null);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = this.form.value as CreateVulnerabilityRequest;
    const req$ = this.editingId()
      ? this.api.update(this.editingId()!, payload)
      : this.api.create(payload);
    req$.subscribe({
      next: () => {
        this.success.set('Vulnérabilité enregistrée');
        this.saving.set(false);
        this.closeModals();
        this.loadAll();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Erreur lors de l’enregistrement');
        this.saving.set(false);
      },
    });
  }

  setStatus(v: Vulnerability, status: VulnerabilityStatus): void {
    this.api.updateStatus(v.id, status).subscribe({
      next: () => {
        this.success.set(`Statut mis à jour : ${status}`);
        this.loadAll();
        setTimeout(() => this.success.set(''), 2500);
      },
      error: (err) => this.error.set(err?.error?.message || 'Échec du changement de statut'),
    });
  }

  doDelete(): void {
    const v = this.toDelete();
    if (!v) return;
    this.api.delete(v.id).subscribe({
      next: () => {
        this.success.set('Vulnérabilité supprimée');
        this.closeModals();
        this.loadAll();
        setTimeout(() => this.success.set(''), 2500);
      },
      error: (err) => this.error.set(err?.error?.message || 'Suppression impossible'),
    });
  }

  sevClass(s: Severity): string {
    return `sev-${s.toLowerCase()}`;
  }

  statusClass(s: VulnerabilityStatus): string {
    if (s === 'OPEN') return 'st-open';
    if (s === 'IN_PROGRESS') return 'st-progress';
    if (s === 'REMEDIATED' || s === 'RESOLVED') return 'st-done';
    return 'st-other';
  }
}
