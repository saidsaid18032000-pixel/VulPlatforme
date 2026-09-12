import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <section>
      <h1>Plateforme de gestion des vulnérabilités</h1>
      <p>
        Environnement Sprint 0 initialisé : microservices, PostgreSQL, Redis,
        Elasticsearch, API Gateway et service IA.
      </p>
      <ul>
        <li>API Gateway : http://localhost:8080</li>
        <li>Auth Service : http://localhost:8081</li>
        <li>AI Service : http://localhost:8000/docs</li>
        <li>PostgreSQL : localhost:5432</li>
      </ul>
    </section>
  `,
  styles: [
    `
      h1 {
        margin-top: 0;
        font-size: 2rem;
      }
      p {
        max-width: 42rem;
        line-height: 1.5;
        opacity: 0.9;
      }
      ul {
        margin-top: 1.5rem;
        line-height: 1.8;
      }
    `,
  ],
})
export class HomeComponent {}
