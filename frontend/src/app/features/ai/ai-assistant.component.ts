import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiApiService } from '../../core/services/ai.service';
import {
  AiInsights,
  PrioritizedVulnerability,
  PrioritizeResponse,
  RemediationAdvice,
} from '../../core/models/ai.models';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Assistant IA SOC</h1>
          <p>Priorisation intelligente et recommandations de remédiation</p>
        </div>
        <div class="actions">
          <button class="btn ghost" (click)="loadAll()" [disabled]="loading()">
            <span class="material-icons">refresh</span> Actualiser
          </button>
          <button class="btn primary" (click)="runPrioritize()" [disabled]="loading()">
            <span class="material-icons">psychology</span> Relancer la priorisation
          </button>
        </div>
      </div>

      @if (success()) { <div class="banner ok">{{ success() }}</div> }
      @if (error()) { <div class="banner err">{{ error() }}</div> }

      <div class="kpis">
        <div class="kpi risk" [class]="riskClass(insights()?.overallRisk)">
          <span class="label">Risque global</span>
          <strong>{{ insights()?.overallRisk || '—' }}</strong>
        </div>
        <div class="kpi"><span class="label">Vulns ouvertes</span><strong>{{ insights()?.metrics?.openVulnerabilities || 0 }}</strong></div>
        <div class="kpi"><span class="label">CRITICAL</span><strong>{{ insights()?.metrics?.criticalOpen || 0 }}</strong></div>
        <div class="kpi"><span class="label">Alertes NEW</span><strong>{{ insights()?.metrics?.newAlerts || 0 }}</strong></div>
        <div class="kpi"><span class="label">P0 / P1</span><strong>{{ p0p1() }}</strong></div>
      </div>

      <div class="grid">
        <section class="panel">
          <h2>Actions recommandées</h2>
          <ul class="actions-list">
            @for (a of insights()?.recommendedActions || []; track a) {
              <li>{{ a }}</li>
            } @empty {
              <li class="muted">Aucune action calculée</li>
            }
          </ul>
          <div class="bands">
            @for (b of bands(); track b.key) {
              <span class="band" [class]="'b-' + b.key.toLowerCase()">{{ b.key }} · {{ b.value }}</span>
            }
          </div>
        </section>

        <section class="panel">
          <h2>Moteur</h2>
          <p class="muted">{{ prioritize()?.engine || insights()?.engine || 'vulnplatform-priority-v1' }}</p>
          <p>Analysées : <strong>{{ prioritize()?.totalAnalyzed || 0 }}</strong></p>
          <p>Retournées : <strong>{{ prioritize()?.returned || 0 }}</strong></p>
          <p>Cache insights : <strong>{{ insights()?.cached ? 'oui' : 'non' }}</strong></p>
        </section>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Priorité</th>
              <th>CVE / Titre</th>
              <th>Sévérité</th>
              <th>Actif</th>
              <th>Score</th>
              <th>SLA</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td class="mono">{{ item.rank }}</td>
                <td><span class="badge" [class]="'band-' + item.priorityBand.toLowerCase()">{{ item.priorityBand }}</span></td>
                <td>
                  <div class="title-cell">
                    <span class="title">{{ item.cveId || '—' }}</span>
                    <span class="sub">{{ item.title }}</span>
                  </div>
                </td>
                <td><span class="badge sev" [class]="sevClass(item.severity)">{{ item.severity }}</span></td>
                <td>
                  <div class="title-cell">
                    <span class="title">{{ item.assetName || 'N/A' }}</span>
                    <span class="sub">{{ item.assetCriticality || '' }}</span>
                  </div>
                </td>
                <td class="mono">{{ item.priorityScore }}</td>
                <td class="mono">{{ item.suggestedSlaHours }}h</td>
                <td>
                  <button class="btn ghost sm" (click)="openAdvice(item)" title="Recommandation">
                    <span class="material-icons">auto_awesome</span>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">Aucune vulnérabilité ouverte à prioriser</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (advice()) {
        <div class="modal-backdrop" (click)="closeAdvice()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>Plan de remédiation</h2>
            <p class="lead">{{ advice()!.summary }}</p>
            <div class="meta">
              <span class="badge" [class]="'band-' + advice()!.priorityBand.toLowerCase()">{{ advice()!.priorityBand }}</span>
              <span>Score {{ advice()!.priorityScore }}</span>
              <span>Owner {{ advice()!.suggestedOwner }}</span>
              <span>SLA {{ advice()!.suggestedSlaHours }}h</span>
            </div>
            <ol>
              @for (step of advice()!.remediationSteps; track step) {
                <li>{{ step }}</li>
              }
            </ol>
            @if (selected()?.rationale?.length) {
              <h3>Pourquoi cette priorité ?</h3>
              <ul>
                @for (r of selected()!.rationale; track r) {
                  <li>{{ r }}</li>
                }
              </ul>
            }
            <div class="modal-actions">
              <button class="btn primary" (click)="closeAdvice()">Fermer</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 1.5rem; color: #e2e8f0; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:1.25rem; }
    .page-header h1 { margin:0; font-size:1.6rem; color:#f8fafc; }
    .page-header p { margin:.35rem 0 0; color:#94a3b8; }
    .actions { display:flex; gap:.6rem; }
    .btn { display:inline-flex; align-items:center; gap:.35rem; border:none; border-radius:10px; padding:.55rem .9rem; cursor:pointer; font-weight:600; }
    .btn .material-icons { font-size:18px; }
    .btn.primary { background:linear-gradient(135deg,#0ea5e9,#0369a1); color:#fff; }
    .btn.ghost { background:rgba(148,163,184,.12); color:#e2e8f0; }
    .btn.sm { padding:.35rem .5rem; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .banner { padding:.75rem 1rem; border-radius:10px; margin-bottom:1rem; }
    .banner.ok { background:rgba(34,197,94,.15); color:#86efac; }
    .banner.err { background:rgba(239,68,68,.15); color:#fca5a5; }
    .kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:.75rem; margin-bottom:1rem; }
    .kpi { background:rgba(15,23,42,.75); border:1px solid rgba(148,163,184,.15); border-radius:12px; padding:.9rem; }
    .kpi .label { display:block; color:#94a3b8; font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; }
    .kpi strong { font-size:1.35rem; color:#f8fafc; }
    .kpi.risk-critical strong { color:#f87171; }
    .kpi.risk-high strong { color:#fb923c; }
    .kpi.risk-medium strong { color:#fbbf24; }
    .kpi.risk-low strong { color:#4ade80; }
    .grid { display:grid; grid-template-columns:2fr 1fr; gap:1rem; margin-bottom:1rem; }
    .panel { background:rgba(15,23,42,.75); border:1px solid rgba(148,163,184,.15); border-radius:12px; padding:1rem; }
    .panel h2 { margin:0 0 .75rem; font-size:1rem; color:#f8fafc; }
    .actions-list { margin:0; padding-left:1.1rem; color:#cbd5e1; }
    .actions-list li { margin-bottom:.45rem; }
    .muted { color:#94a3b8; }
    .bands { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:1rem; }
    .band { font-size:.75rem; padding:.25rem .55rem; border-radius:999px; background:rgba(148,163,184,.15); }
    .band.b-p0 { background:rgba(239,68,68,.2); color:#fca5a5; }
    .band.b-p1 { background:rgba(249,115,22,.2); color:#fdba74; }
    .band.b-p2 { background:rgba(234,179,8,.2); color:#fde68a; }
    .band.b-p3 { background:rgba(34,197,94,.15); color:#86efac; }
    .table-wrap { background:rgba(15,23,42,.75); border:1px solid rgba(148,163,184,.15); border-radius:12px; overflow:auto; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:.75rem .9rem; text-align:left; border-bottom:1px solid rgba(148,163,184,.1); }
    th { color:#94a3b8; font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; }
    .title-cell { display:flex; flex-direction:column; gap:.15rem; }
    .title { color:#f8fafc; font-weight:600; }
    .sub { color:#94a3b8; font-size:.8rem; }
    .mono { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; color:#cbd5e1; }
    .badge { display:inline-block; padding:.2rem .5rem; border-radius:999px; font-size:.72rem; font-weight:700; }
    .band-p0 { background:rgba(239,68,68,.2); color:#fca5a5; }
    .band-p1 { background:rgba(249,115,22,.2); color:#fdba74; }
    .band-p2 { background:rgba(234,179,8,.2); color:#fde68a; }
    .band-p3 { background:rgba(34,197,94,.15); color:#86efac; }
    .sev.critical { background:rgba(239,68,68,.2); color:#fca5a5; }
    .sev.high { background:rgba(249,115,22,.2); color:#fdba74; }
    .sev.medium { background:rgba(234,179,8,.2); color:#fde68a; }
    .sev.low { background:rgba(34,197,94,.15); color:#86efac; }
    .empty { text-align:center; color:#94a3b8; padding:2rem; }
    .modal-backdrop { position:fixed; inset:0; background:rgba(2,6,23,.72); display:flex; align-items:center; justify-content:center; z-index:50; padding:1rem; }
    .modal { width:min(560px,100%); background:#0f172a; border:1px solid rgba(148,163,184,.2); border-radius:14px; padding:1.25rem; }
    .modal h2, .modal h3 { margin:0 0 .75rem; color:#f8fafc; }
    .lead { color:#cbd5e1; }
    .meta { display:flex; flex-wrap:wrap; gap:.6rem; margin: .75rem 0 1rem; color:#94a3b8; font-size:.85rem; align-items:center; }
    .modal ol, .modal ul { color:#cbd5e1; }
    .modal-actions { display:flex; justify-content:flex-end; margin-top:1rem; }
    @media (max-width:900px) {
      .kpis { grid-template-columns:1fr 1fr; }
      .grid { grid-template-columns:1fr; }
      .page-header { flex-direction:column; }
    }
  `],
})
export class AiAssistantComponent implements OnInit {
  insights = signal<AiInsights | null>(null);
  prioritize = signal<PrioritizeResponse | null>(null);
  items = signal<PrioritizedVulnerability[]>([]);
  advice = signal<RemediationAdvice | null>(null);
  selected = signal<PrioritizedVulnerability | null>(null);
  loading = signal(false);
  success = signal('');
  error = signal('');

  constructor(private api: AiApiService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getInsights().subscribe({
      next: (data) => this.insights.set(data),
      error: (err) => this.error.set(err?.error?.detail || err?.error?.message || 'Impossible de charger les insights IA'),
    });
    this.api.prioritize(25).subscribe({
      next: (data) => {
        this.prioritize.set(data);
        this.items.set(data.items || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || err?.error?.message || 'Échec de priorisation');
        this.loading.set(false);
      },
    });
  }

  runPrioritize(): void {
    this.loadAll();
    this.success.set('Priorisation recalculée');
    setTimeout(() => this.success.set(''), 2500);
  }

  openAdvice(item: PrioritizedVulnerability): void {
    this.selected.set(item);
    this.api.recommend(item.id).subscribe({
      next: (rec) => this.advice.set(rec),
      error: (err) => this.error.set(err?.error?.detail || 'Recommandation indisponible'),
    });
  }

  closeAdvice(): void {
    this.advice.set(null);
    this.selected.set(null);
  }

  p0p1(): string {
    const bands = this.prioritize()?.bandCounts || this.insights()?.bandCounts || {};
    return `${bands['P0'] || 0} / ${bands['P1'] || 0}`;
  }

  bands(): { key: string; value: number }[] {
    const counts = this.prioritize()?.bandCounts || this.insights()?.bandCounts || {};
    return ['P0', 'P1', 'P2', 'P3'].map((key) => ({ key, value: counts[key] || 0 }));
  }

  riskClass(risk?: string): string {
    return `risk-${(risk || 'low').toLowerCase()}`;
  }

  sevClass(sev?: string): string {
    return (sev || 'low').toLowerCase();
  }
}
