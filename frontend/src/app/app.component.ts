import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="topbar">
      <strong>VulnPlatform</strong>
      <span>Sprint 0 — Architecture prête</span>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: linear-gradient(160deg, #0b1f2a 0%, #123447 45%, #1a4d3a 100%);
        color: #e8f1f5;
        font-family: "Segoe UI", system-ui, sans-serif;
      }
      .topbar {
        display: flex;
        gap: 1rem;
        align-items: baseline;
        padding: 1.25rem 2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }
      main {
        padding: 2rem;
      }
    `,
  ],
})
export class AppComponent {}
