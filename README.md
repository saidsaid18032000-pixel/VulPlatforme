# VulnPlatform — Plateforme intelligente de gestion des vulnérabilités

Inspirée de Rapid7. Monorepo Sprint 0 : architecture microservices, PostgreSQL, Docker, CI/CD.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Angular 18 + Angular Material |
| API Gateway | Spring Cloud Gateway |
| Backend | Spring Boot 3 (microservices) |
| Auth | Spring Security + JWT (BCrypt) |
| AI | FastAPI |
| BDD | PostgreSQL 16 |
| Cache | Redis 7 |
| Search | Elasticsearch 8 |
| Conteneurisation | Docker Compose |
| CI/CD | GitHub Actions |

## Architecture microservices

```
Angular (4200)
    │
    ▼
API Gateway (8080)
    ├── Auth Service (8081)
    ├── Asset Service (8082)
    ├── Scan Service (8083)
    ├── Vulnerability Service (8084)
    ├── Alert Service (8085)
    ├── Report Service (8086)
    └── AI Service (8000)
           │
    PostgreSQL / Redis / Elasticsearch
```

## Démarrage rapide

### Prérequis

- Docker Desktop + Docker Compose
- (optionnel en local) JDK 17, Node 20, Python 3.12, Maven 3.9, Git

### 1. Variables d'environnement

```bash
cp .env.example .env
```

### 2. Lancer l'infrastructure + les services

```bash
docker compose up -d --build
```

Pour **seulement** PostgreSQL, Redis et Elasticsearch :

```bash
docker compose up -d postgres redis elasticsearch
```

### 3. Vérifications

- Frontend : http://localhost:4200
- Gateway : http://localhost:8080/actuator/health
- Auth : http://localhost:8081/api/auth/health
- AI Swagger : http://localhost:8000/docs
- PostgreSQL : `localhost:5432` (user `vuln` / db `vulnplatform`)

### 4. Schéma SQL

Initialisé automatiquement au premier démarrage via `infra/postgres/init/01_schema.sql`  
(tables : `users`, `roles`, `assets`, `scans`, `vulnerabilities`, etc.)

## Branches Git (convention Sprint 0)

- `main` — production
- `develop` — intégration
- `feature/*` — fonctionnalités
- `release/*` — préparation release
- `hotfix/*` — correctifs urgents

## Documentation

- [Architecture](docs/architecture.md)
- [Installation](docs/installation.md)
- [Conventions de code](docs/coding-conventions.md)

## Sprint 0 — livrables

- [x] Projets Angular / Spring Boot / FastAPI
- [x] Architecture microservices
- [x] PostgreSQL + tables initiales
- [x] Docker Compose (Angular, Spring Boot, PostgreSQL, Elasticsearch, Redis, FastAPI)
- [x] Organisation Git (conventions de branches)
- [x] CI/CD GitHub Actions
- [x] Documentation (README, architecture, installation, conventions)
