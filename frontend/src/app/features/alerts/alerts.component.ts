import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AlertApiService } from '../../core/services/alert.service';
import { Alert, AlertStats, Severity } from '../../core/models/vuln-alert.models';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Centre d'Alertes SOC</h1>
          <p>Alertes critiques générées depuis les vulnérabilités HIGH / CRITICAL</p>
        </div>
        <div class="actions">
          <button class="btn ghost" (click)="loadAll()" [disabled]="loading()">
            <span class="material-icons">refresh</span> Actualiser
          </button>
          <button class="btn primary" (click)="sync()" [disabled]="syncing()">
            <span class="material-icons">campaign</span> Générer depuis CVE
          </button>
        </div>
      </div>

      @if (success()) { <div class="banner ok">{{ success() }}</div> }
      @if (error()) { <div class="banner err">{{ error() }}</div> }

      <div class="kpis">
        <div class="kpi"><span class="label">Total</span><strong>{{ stats()?.totalAlerts || alerts().length }}</strong></div>
        <div class="kpi danger"><span class="label">Nouvelles</span><strong>{{ stats()?.newAlerts || 0 }}</strong></div>
        <div class="kpi"><span class="label">Acquittées</span><strong>{{ stats()?.acknowledgedAlerts || 0 }}</strong></div>
        <div class="kpi"><span class="label">Résolues</span><strong>{{ stats()?.resolvedAlerts || 0 }}</strong></div>
        <div class="kpi warn"><span class="label">Critiques</span><strong>{{ stats()?.criticalAlerts || 0 }}</strong></div>
      </div>

      <div class="filters">
        <input type="search" placeholder="Rechercher alerte / CVE..." [formControl]="searchCtrl" (input)="applyFilters()" />
        <select [formControl]="severityCtrl" (change)="applyFilters()">
          <option value="ALL">Toutes sévérités</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select [formControl]="statusCtrl" (change)="applyFilters()">
          <option value="ALL">Tous statuts</option>
          <option value="NEW">NEW</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
        <span class="count">{{ filtered().length }} alerte(s)</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Alerte</th>
              <th>Sévérité</th>
              <th>Statut</th>
              <th>Créée</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (a of filtered(); track a.id) {
              <tr [class.urgent]="a.status === 'NEW' && (a.severity === 'CRITICAL' || a.severity === 'HIGH')">
                <td>
                  <div class="title-cell">
                    <span class="cve">{{ a.cveId || 'ALERTE' }}</span>
                    <span class="title">{{ a.title }}</span>
                  </div>
                </td>
                <td><span class="badge" [class]="sevClass(a.severity)">{{ a.severity }}</span></td>
                <td><span class="badge status" [class]="statusClass(a.status)">{{ a.status }}</span></td>
                <td class="mono">{{ a.createdAt | date:'short' }}</td>
                <td class="row-actions">
                  <button title="Détails" (click)="openDetails(a)"><span class="material-icons">visibility</span></button>
                  <button title="Acquitter" (click)="acknowledge(a)" [disabled]="a.status !== 'NEW'"><span class="material-icons">done</span></button>
                  <button title="Résoudre" (click)="resolve(a)" [disabled]="a.status === 'RESOLVED'"><span class="material-icons">task_alt</span></button>
                  <button title="Supprimer" class="danger" (click)="confirmDelete(a)"><span class="material-icons">delete</span></button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">Aucune alerte — synchronisez depuis les vulnérabilités critiques</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (details()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>Détail de l'alerte</h2>
            <p><strong>Titre :</strong> {{ details()!.title }}</p>
            <p><strong>CVE :</strong> {{ details()!.cveId || '—' }}</p>
            <p><strong>Sévérité :</strong> {{ details()!.severity }}</p>
            <p><strong>Statut :</strong> {{ details()!.status }}</p>
            <p><strong>Message :</strong> {{ details()!.message || '—' }}</p>
            <p class="mono"><strong>Vuln ID :</strong> {{ details()!.vulnerabilityId || '—' }}</p>
            <div class="modal-actions"><button class="btn ghost" (click)="closeModals()">Fermer</button></div>
          </div>
        </div>
      }

      @if (toDelete()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>Supprimer l'alerte ?</h2>
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
    .btn.primary { background:linear-gradient(135deg,#f43f5e,#e11d48); color:#fff; }
    .btn.ghost { background:rgba(148,163,184,.12); color:#e2e8f0; border:1px solid rgba(148,163,184,.2); }
    .btn.danger { background:#e11d48; color:#fff; }
    .banner { padding:.75rem 1rem; border-radius:10px; font-size:.9rem; }
    .banner.ok { background:rgba(16,185,129,.15); color:#6ee7b7; border:1px solid rgba(16,185,129,.3); }
    .banner.err { background:rgba(244,63,94,.15); color:#fda4af; border:1px solid rgba(244,63,94,.3); }
    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.8rem; }
    .kpi { background:rgba(30,41,59,.6); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:1rem; }
    .kpi .label { display:block; color:#94a3b8; font-size:.75rem; text-transform:uppercase; }
    .kpi strong { font-size:1.5rem; color:#f1f5f9; }
    .kpi.danger strong { color:#fb7185; }
    .kpi.warn strong { color:#fbbf24; }
    .filters { display:flex; gap:.75rem; flex-wrap:wrap; align-items:center; background:rgba(30,41,59,.45); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:1rem; }
    .filters input, .filters select { background:#0f172a; border:1px solid rgba(148,163,184,.25); color:#e2e8f0; border-radius:8px; padding:.55rem .75rem; }
    .filters input { min-width:220px; flex:1; }
    .count { margin-left:auto; color:#64748b; font-size:.8rem; font-family:'JetBrains Mono',monospace; }
    .table-wrap { overflow:auto; border-radius:12px; border:1px solid rgba(255,255,255,.08); background:rgba(30,41,59,.45); }
    table { width:100%; border-collapse:collapse; }
    th { text-align:left; padding:.85rem 1rem; font-size:.72rem; text-transform:uppercase; color:#94a3b8; background:rgba(15,23,42,.7); }
    td { padding:.9rem 1rem; border-top:1px solid rgba(255,255,255,.05); color:#e2e8f0; font-size:.85rem; }
    tr.urgent td { background:rgba(244,63,94,.06); }
    .title-cell { display:flex; flex-direction:column; gap:.15rem; }
    .cve { font-family:'JetBrains Mono',monospace; color:#fb7185; font-size:.78rem; }
    .title { font-weight:600; }
    .mono { font-family:'JetBrains Mono',monospace; font-size:.8rem; color:#94a3b8; }
    .badge { display:inline-block; padding:.2rem .55rem; border-radius:999px; font-size:.7rem; font-weight:700; }
    .sev-critical { background:rgba(244,63,94,.2); color:#fb7185; }
    .sev-high { background:rgba(249,115,22,.2); color:#fb923c; }
    .sev-medium { background:rgba(234,179,8,.2); color:#facc15; }
    .sev-low { background:rgba(34,197,94,.2); color:#4ade80; }
    .sev-info { background:rgba(56,189,248,.2); color:#38bdf8; }
    .st-new { background:rgba(244,63,94,.15); color:#fda4af; }
    .st-ack { background:rgba(56,189,248,.15); color:#7dd3fc; }
    .st-res { background:rgba(34,197,94,.15); color:#86efac; }
    .row-actions { display:flex; gap:.25rem; }
    .row-actions button { background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:.25rem; border-radius:6px; }
    .row-actions button:hover { background:rgba(148,163,184,.15); color:#e2e8f0; }
    .row-actions button.danger:hover { color:#fb7185; }
    .empty { text-align:center; color:#64748b; padding:2rem !important; }
    .modal-backdrop { position:fixed; inset:0; background:rgba(2,6,23,.7); display:flex; align-items:center; justify-content:center; z-index:50; padding:1rem; }
    .modal { width:min(520px,100%); background:#1e293b; border:1px solid rgba(255,255,255,.1); border-radius:14px; padding:1.5rem; }
    .modal h2 { margin:0 0 1rem; color:#f8fafc; }
    .modal-actions { display:flex; justify-content:flex-end; gap:.6rem; margin-top:1rem; }
  `],
})
export class AlertsComponent implements OnInit {
  alerts = signal<Alert[]>([]);
  filtered = signal<Alert[]>([]);
  stats = signal<AlertStats | null>(null);
  loading = signal(false);
  syncing = signal(false);
  success = signal('');
  error = signal('');
  details = signal<Alert | null>(null);
  toDelete = signal<Alert | null>(null);

  searchCtrl;
  severityCtrl;
  statusCtrl;

  constructor(private api: AlertApiService, private fb: FormBuilder) {
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
        this.alerts.set(list);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Impossible de charger les alertes');
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    const q = (this.searchCtrl.value || '').toLowerCase();
    const sev = this.severityCtrl.value;
    const st = this.statusCtrl.value;
    this.filtered.set(
      this.alerts().filter((a) => {
        const matchQ =
          !q ||
          a.title.toLowerCase().includes(q) ||
          (a.cveId || '').toLowerCase().includes(q) ||
          (a.message || '').toLowerCase().includes(q);
        return matchQ && (sev === 'ALL' || a.severity === sev) && (st === 'ALL' || a.status === st);
      })
    );
  }

  sync(): void {
    this.syncing.set(true);
    this.api.syncFromVulnerabilities().subscribe({
      next: (res) => {
        this.success.set(res.message || `${res.created} alerte(s) générée(s)`);
        this.syncing.set(false);
        this.loadAll();
        setTimeout(() => this.success.set(''), 3500);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Synchronisation impossible');
        this.syncing.set(false);
      },
    });
  }

  openDetails(a: Alert): void {
    this.details.set(a);
  }

  confirmDelete(a: Alert): void {
    this.toDelete.set(a);
  }

  closeModals(): void {
    this.details.set(null);
    this.toDelete.set(null);
  }

  acknowledge(a: Alert): void {
    this.api.acknowledge(a.id).subscribe({
      next: () => {
        this.success.set('Alerte acquittée');
        this.loadAll();
        setTimeout(() => this.success.set(''), 2500);
      },
      error: (err) => this.error.set(err?.error?.message || 'Échec acquittement'),
    });
  }

  resolve(a: Alert): void {
    this.api.resolve(a.id).subscribe({
      next: () => {
        this.success.set('Alerte résolue');
        this.loadAll();
        setTimeout(() => this.success.set(''), 2500);
      },
      error: (err) => this.error.set(err?.error?.message || 'Échec résolution'),
    });
  }

  doDelete(): void {
    const a = this.toDelete();
    if (!a) return;
    this.api.delete(a.id).subscribe({
      next: () => {
        this.success.set('Alerte supprimée');
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

  statusClass(s: string): string {
    if (s === 'NEW') return 'st-new';
    if (s === 'ACKNOWLEDGED') return 'st-ack';
    return 'st-res';
  }
}
