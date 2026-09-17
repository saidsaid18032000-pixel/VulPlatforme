import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SearchApiService } from '../../core/services/search.service';
import { SearchHit, SearchResponse } from '../../core/models/search.models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Recherche SOC</h1>
          <p>Elasticsearch + cache Redis — CVE, titres, descriptions</p>
        </div>
        <div class="actions">
          <button class="btn ghost" (click)="reindex()" [disabled]="loading()">
            <span class="material-icons">sync</span> Réindexer
          </button>
          <button class="btn primary" (click)="runSearch()" [disabled]="loading()">
            <span class="material-icons">search</span> Rechercher
          </button>
        </div>
      </div>

      @if (success()) { <div class="banner ok">{{ success() }}</div> }
      @if (error()) { <div class="banner err">{{ error() }}</div> }

      <form class="filters" [formGroup]="form" (ngSubmit)="runSearch()">
        <input type="search" formControlName="q" placeholder="Ex: Log4Shell, CVE-2021, runc..." />
        <select formControlName="severity">
          <option value="ALL">Toutes sévérités</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select formControlName="status">
          <option value="ALL">Tous statuts</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="REMEDIATED">REMEDIATED</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
      </form>

      <div class="meta">
        <span>Moteur : <strong>{{ result()?.engine || '—' }}</strong></span>
        <span>Total : <strong>{{ result()?.total || 0 }}</strong></span>
        <span>Cache Redis : <strong>{{ result()?.cached ? 'oui' : 'non' }}</strong></span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Score</th>
              <th>CVE</th>
              <th>Titre</th>
              <th>Sévérité</th>
              <th>Statut</th>
              <th>Découverte</th>
            </tr>
          </thead>
          <tbody>
            @for (hit of hits(); track hit.id) {
              <tr>
                <td class="mono">{{ hit.score?.toFixed?.(2) || hit.score || '—' }}</td>
                <td class="mono">{{ hit.cveId || '—' }}</td>
                <td>
                  <div class="title">{{ hit.title }}</div>
                  <div class="sub">{{ hit.description || '' }}</div>
                </td>
                <td><span class="badge" [class]="sevClass(hit.severity)">{{ hit.severity }}</span></td>
                <td>{{ hit.status }}</td>
                <td class="mono">{{ hit.discoveredAt | date:'short' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">Aucun résultat — lancez une recherche</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { padding:1.5rem; color:#e2e8f0; }
    .page-header { display:flex; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
    .page-header h1 { margin:0; color:#f8fafc; }
    .page-header p { margin:.35rem 0 0; color:#94a3b8; }
    .actions { display:flex; gap:.6rem; }
    .btn { display:inline-flex; align-items:center; gap:.35rem; border:none; border-radius:10px; padding:.55rem .9rem; cursor:pointer; font-weight:600; }
    .btn.primary { background:linear-gradient(135deg,#0ea5e9,#0369a1); color:#fff; }
    .btn.ghost { background:rgba(148,163,184,.12); color:#e2e8f0; }
    .btn:disabled { opacity:.5; }
    .banner { padding:.75rem 1rem; border-radius:10px; margin-bottom:1rem; }
    .banner.ok { background:rgba(34,197,94,.15); color:#86efac; }
    .banner.err { background:rgba(239,68,68,.15); color:#fca5a5; }
    .filters { display:grid; grid-template-columns:2fr 1fr 1fr; gap:.6rem; margin-bottom:1rem; }
    .filters input, .filters select { background:rgba(15,23,42,.8); border:1px solid rgba(148,163,184,.2); color:#e2e8f0; border-radius:10px; padding:.7rem .85rem; }
    .meta { display:flex; gap:1.25rem; color:#94a3b8; margin-bottom:.75rem; font-size:.9rem; }
    .meta strong { color:#f8fafc; }
    .table-wrap { background:rgba(15,23,42,.75); border:1px solid rgba(148,163,184,.15); border-radius:12px; overflow:auto; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:.75rem .9rem; border-bottom:1px solid rgba(148,163,184,.1); text-align:left; vertical-align:top; }
    th { color:#94a3b8; font-size:.72rem; text-transform:uppercase; }
    .title { color:#f8fafc; font-weight:600; }
    .sub { color:#94a3b8; font-size:.8rem; margin-top:.2rem; max-width:420px; }
    .mono { font-family:ui-monospace,Menlo,monospace; color:#cbd5e1; }
    .badge { padding:.2rem .5rem; border-radius:999px; font-size:.72rem; font-weight:700; }
    .critical { background:rgba(239,68,68,.2); color:#fca5a5; }
    .high { background:rgba(249,115,22,.2); color:#fdba74; }
    .medium { background:rgba(234,179,8,.2); color:#fde68a; }
    .low { background:rgba(34,197,94,.15); color:#86efac; }
    .empty { text-align:center; color:#94a3b8; padding:2rem; }
    @media (max-width:800px){ .filters{grid-template-columns:1fr;} .page-header{flex-direction:column;} }
  `],
})
export class SearchComponent implements OnInit {
  form;
  result = signal<SearchResponse | null>(null);
  hits = signal<SearchHit[]>([]);
  loading = signal(false);
  success = signal('');
  error = signal('');

  constructor(private api: SearchApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      q: [''],
      severity: ['ALL'],
      status: ['ALL'],
    });
  }

  ngOnInit(): void {
    this.runSearch();
  }

  runSearch(): void {
    this.loading.set(true);
    this.error.set('');
    const { q, severity, status } = this.form.value;
    this.api.search(q || '', severity ?? undefined, status ?? undefined).subscribe({
      next: (res) => {
        this.result.set(res);
        this.hits.set(res.hits || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || err?.error?.detail || 'Recherche indisponible');
        this.loading.set(false);
      },
    });
  }

  reindex(): void {
    this.loading.set(true);
    this.api.reindex().subscribe({
      next: () => {
        this.success.set('Réindexation Elasticsearch terminée');
        this.loading.set(false);
        this.runSearch();
        setTimeout(() => this.success.set(''), 2500);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Échec réindexation');
        this.loading.set(false);
      },
    });
  }

  sevClass(sev?: string): string {
    return (sev || 'low').toLowerCase();
  }
}
