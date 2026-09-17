import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReportApiService } from '../../core/services/report.service';
import { CreateReportRequest, Report, ReportStats, ReportType } from '../../core/models/report.models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Rapports & Exports SSI</h1>
          <p>Synthèses périodiques, exports PDF et vision exécutive du risque</p>
        </div>
        <div class="actions">
          <button class="btn ghost" (click)="loadAll()" [disabled]="loading()">
            <span class="material-icons">refresh</span> Actualiser
          </button>
          <button class="btn primary" (click)="openCreate()">
            <span class="material-icons">description</span> Nouveau rapport
          </button>
        </div>
      </div>

      @if (success()) { <div class="banner ok">{{ success() }}</div> }
      @if (error()) { <div class="banner err">{{ error() }}</div> }

      <div class="kpis">
        <div class="kpi"><span class="label">Total</span><strong>{{ stats()?.totalReports || reports().length }}</strong></div>
        <div class="kpi"><span class="label">Synthèses</span><strong>{{ stats()?.securitySummaryCount || 0 }}</strong></div>
        <div class="kpi"><span class="label">Vulnérabilités</span><strong>{{ stats()?.vulnerabilityCount || 0 }}</strong></div>
        <div class="kpi"><span class="label">Inventaire</span><strong>{{ stats()?.assetInventoryCount || 0 }}</strong></div>
        <div class="kpi"><span class="label">Exécutif</span><strong>{{ stats()?.executiveCount || 0 }}</strong></div>
      </div>

      <div class="filters">
        <input type="search" placeholder="Rechercher un rapport..." [formControl]="searchCtrl" (input)="applyFilters()" />
        <select [formControl]="typeCtrl" (change)="applyFilters()">
          <option value="ALL">Tous les types</option>
          <option value="SECURITY_SUMMARY">SECURITY_SUMMARY</option>
          <option value="VULNERABILITY">VULNERABILITY</option>
          <option value="ASSET_INVENTORY">ASSET_INVENTORY</option>
          <option value="EXECUTIVE">EXECUTIVE</option>
        </select>
        <span class="count">{{ filtered().length }} rapport(s)</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Risque</th>
              <th>Créé</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (r of filtered(); track r.id) {
              <tr>
                <td>
                  <div class="title-cell">
                    <span class="title">{{ r.title }}</span>
                    <span class="mono">{{ r.status }}</span>
                  </div>
                </td>
                <td><span class="badge type">{{ typeLabel(r.reportType) }}</span></td>
                <td><span class="badge" [class]="riskClass(r.summary?.overallRisk)">{{ r.summary?.overallRisk || 'N/A' }}</span></td>
                <td class="mono">{{ r.createdAt | date:'short' }}</td>
                <td class="row-actions">
                  <button title="Détails" (click)="openDetails(r)"><span class="material-icons">visibility</span></button>
                  <button title="PDF" (click)="downloadPdf(r)"><span class="material-icons">picture_as_pdf</span></button>
                  <button title="Supprimer" class="danger" (click)="confirmDelete(r)"><span class="material-icons">delete</span></button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">Aucun rapport — générez votre première synthèse SSI</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (showForm()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>Générer un rapport</h2>
            <form [formGroup]="form" (ngSubmit)="save()">
              <label>Titre *<input formControlName="title" placeholder="Rapport mensuel SSI — Septembre" /></label>
              <label>Type *
                <select formControlName="reportType">
                  <option value="SECURITY_SUMMARY">Synthèse sécurité</option>
                  <option value="VULNERABILITY">Focus vulnérabilités</option>
                  <option value="ASSET_INVENTORY">Inventaire des actifs</option>
                  <option value="EXECUTIVE">Rapport exécutif</option>
                </select>
              </label>
              <div class="modal-actions">
                <button type="button" class="btn ghost" (click)="closeModals()">Annuler</button>
                <button type="submit" class="btn primary" [disabled]="form.invalid || saving()">Générer</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (details()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal wide" (click)="$event.stopPropagation()">
            <h2>{{ details()!.title }}</h2>
            <p><strong>Type :</strong> {{ typeLabel(details()!.reportType) }}</p>
            <p><strong>Risque global :</strong> {{ details()!.summary?.overallRisk || 'N/A' }}</p>
            <div class="summary-grid">
              <div class="sum-card"><span>Actifs</span><strong>{{ details()!.summary?.assets?.total || 0 }}</strong></div>
              <div class="sum-card"><span>Scans</span><strong>{{ details()!.summary?.scans?.total || 0 }}</strong></div>
              <div class="sum-card"><span>Vulns ouvertes</span><strong>{{ details()!.summary?.vulnerabilities?.open || 0 }}</strong></div>
              <div class="sum-card"><span>Alertes NEW</span><strong>{{ details()!.summary?.alerts?.new || 0 }}</strong></div>
            </div>
            <h3>Recommandations</h3>
            <ul>
              @for (rec of details()!.summary?.recommendations || []; track rec) {
                <li>{{ rec }}</li>
              }
            </ul>
            <div class="modal-actions">
              <button class="btn ghost" (click)="closeModals()">Fermer</button>
              <button class="btn primary" (click)="downloadPdf(details()!)">
                <span class="material-icons">download</span> PDF
              </button>
            </div>
          </div>
        </div>
      }

      @if (toDelete()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>Supprimer le rapport ?</h2>
            <p>{{ toDelete()!.title }}</p>
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
    .btn.primary { background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:#fff; }
    .btn.ghost { background:rgba(148,163,184,.12); color:#e2e8f0; border:1px solid rgba(148,163,184,.2); }
    .btn.danger { background:#e11d48; color:#fff; }
    .banner { padding:.75rem 1rem; border-radius:10px; font-size:.9rem; }
    .banner.ok { background:rgba(16,185,129,.15); color:#6ee7b7; border:1px solid rgba(16,185,129,.3); }
    .banner.err { background:rgba(244,63,94,.15); color:#fda4af; border:1px solid rgba(244,63,94,.3); }
    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:.8rem; }
    .kpi { background:rgba(30,41,59,.6); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:1rem; }
    .kpi .label { display:block; color:#94a3b8; font-size:.72rem; text-transform:uppercase; }
    .kpi strong { font-size:1.4rem; color:#f1f5f9; }
    .filters { display:flex; gap:.75rem; flex-wrap:wrap; align-items:center; background:rgba(30,41,59,.45); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:1rem; }
    .filters input, .filters select, label input, label select { background:#0f172a; border:1px solid rgba(148,163,184,.25); color:#e2e8f0; border-radius:8px; padding:.55rem .75rem; }
    .filters input { min-width:220px; flex:1; }
    .count { margin-left:auto; color:#64748b; font-size:.8rem; font-family:'JetBrains Mono',monospace; }
    .table-wrap { overflow:auto; border-radius:12px; border:1px solid rgba(255,255,255,.08); background:rgba(30,41,59,.45); }
    table { width:100%; border-collapse:collapse; }
    th { text-align:left; padding:.85rem 1rem; font-size:.72rem; text-transform:uppercase; color:#94a3b8; background:rgba(15,23,42,.7); }
    td { padding:.9rem 1rem; border-top:1px solid rgba(255,255,255,.05); color:#e2e8f0; font-size:.85rem; }
    .title-cell { display:flex; flex-direction:column; gap:.15rem; }
    .title { font-weight:600; }
    .mono { font-family:'JetBrains Mono',monospace; font-size:.78rem; color:#94a3b8; }
    .badge { display:inline-block; padding:.2rem .55rem; border-radius:999px; font-size:.7rem; font-weight:700; }
    .badge.type { background:rgba(139,92,246,.2); color:#c4b5fd; }
    .risk-critical { background:rgba(244,63,94,.2); color:#fb7185; }
    .risk-high { background:rgba(249,115,22,.2); color:#fb923c; }
    .risk-medium { background:rgba(234,179,8,.2); color:#facc15; }
    .risk-low { background:rgba(34,197,94,.2); color:#4ade80; }
    .risk-na { background:rgba(148,163,184,.15); color:#cbd5e1; }
    .row-actions { display:flex; gap:.25rem; }
    .row-actions button { background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:.25rem; border-radius:6px; }
    .row-actions button:hover { background:rgba(148,163,184,.15); color:#e2e8f0; }
    .row-actions button.danger:hover { color:#fb7185; }
    .empty { text-align:center; color:#64748b; padding:2rem !important; }
    .modal-backdrop { position:fixed; inset:0; background:rgba(2,6,23,.7); display:flex; align-items:center; justify-content:center; z-index:50; padding:1rem; }
    .modal { width:min(520px,100%); background:#1e293b; border:1px solid rgba(255,255,255,.1); border-radius:14px; padding:1.5rem; }
    .modal.wide { width:min(680px,100%); }
    .modal h2 { margin:0 0 1rem; color:#f8fafc; }
    .modal h3 { margin:1rem 0 .5rem; color:#e2e8f0; font-size:1rem; }
    .modal label { display:flex; flex-direction:column; gap:.35rem; margin-bottom:.85rem; color:#94a3b8; font-size:.8rem; }
    .modal ul { margin:0; padding-left:1.1rem; color:#cbd5e1; }
    .modal-actions { display:flex; justify-content:flex-end; gap:.6rem; margin-top:1rem; }
    .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:.6rem; margin:1rem 0; }
    .sum-card { background:rgba(15,23,42,.7); border-radius:10px; padding:.75rem; }
    .sum-card span { display:block; color:#94a3b8; font-size:.72rem; }
    .sum-card strong { color:#f8fafc; font-size:1.2rem; }
    @media (max-width:700px){ .summary-grid{grid-template-columns:1fr 1fr;} }
  `],
})
export class ReportsComponent implements OnInit {
  reports = signal<Report[]>([]);
  filtered = signal<Report[]>([]);
  stats = signal<ReportStats | null>(null);
  loading = signal(false);
  saving = signal(false);
  success = signal('');
  error = signal('');
  showForm = signal(false);
  details = signal<Report | null>(null);
  toDelete = signal<Report | null>(null);

  form: FormGroup;
  searchCtrl;
  typeCtrl;

  constructor(private api: ReportApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      reportType: ['SECURITY_SUMMARY' as ReportType, Validators.required],
    });
    this.searchCtrl = this.fb.control('');
    this.typeCtrl = this.fb.control('ALL');
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
        this.reports.set(list);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Impossible de charger les rapports');
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    const q = (this.searchCtrl.value || '').toLowerCase();
    const type = this.typeCtrl.value;
    this.filtered.set(
      this.reports().filter((r) => {
        const matchQ = !q || r.title.toLowerCase().includes(q);
        const matchType = type === 'ALL' || r.reportType === type;
        return matchQ && matchType;
      })
    );
  }

  openCreate(): void {
    this.form.reset({ title: '', reportType: 'SECURITY_SUMMARY' });
    this.showForm.set(true);
  }

  openDetails(r: Report): void {
    this.details.set(r);
  }

  confirmDelete(r: Report): void {
    this.toDelete.set(r);
  }

  closeModals(): void {
    this.showForm.set(false);
    this.details.set(null);
    this.toDelete.set(null);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = this.form.value as CreateReportRequest;
    this.api.create(payload).subscribe({
      next: () => {
        this.success.set('Rapport généré avec succès');
        this.saving.set(false);
        this.closeModals();
        this.loadAll();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Échec de génération');
        this.saving.set(false);
      },
    });
  }

  downloadPdf(r: Report): void {
    this.api.downloadPdf(r.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport-${r.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.success.set('PDF téléchargé');
        setTimeout(() => this.success.set(''), 2500);
      },
      error: () => this.error.set('Échec du téléchargement PDF'),
    });
  }

  doDelete(): void {
    const r = this.toDelete();
    if (!r) return;
    this.api.delete(r.id).subscribe({
      next: () => {
        this.success.set('Rapport supprimé');
        this.closeModals();
        this.loadAll();
        setTimeout(() => this.success.set(''), 2500);
      },
      error: (err) => this.error.set(err?.error?.message || 'Suppression impossible'),
    });
  }

  typeLabel(t: ReportType): string {
    switch (t) {
      case 'SECURITY_SUMMARY': return 'Synthèse';
      case 'VULNERABILITY': return 'Vulnérabilités';
      case 'ASSET_INVENTORY': return 'Inventaire';
      case 'EXECUTIVE': return 'Exécutif';
      default: return t;
    }
  }

  riskClass(risk?: string): string {
    if (!risk) return 'risk-na';
    return `risk-${risk.toLowerCase()}`;
  }
}
