# Architecture — VulnPlatform

## Vue d'ensemble

Architecture **microservices** orientée domaine sécurité / vulnérabilités.

| Service | Port | Responsabilité |
|---------|------|----------------|
| api-gateway | 8080 | Routage, CORS, point d'entrée unique |
| auth-service | 8081 | Authentification JWT, utilisateurs, rôles |
| asset-service | 8082 | Inventaire des actifs |
| scan-service | 8083 | Orchestration des scans |
| vulnerability-service | 8084 | Catalogue et suivi des vulnérabilités |
| alert-service | 8085 | Alertes critiques |
| report-service | 8086 | Rapports |
| ai-service | 8000 | Analyse / recommandations IA |
| frontend | 4200 | Interface Angular |

## Données

- **PostgreSQL** : source de vérité relationnelle (users, roles, assets, scans, vulnerabilities)
- **Redis** : cache des recherches SOC (Sprint 6)
- **Elasticsearch** : indexation / recherche full-text des vulnérabilités (Sprint 6)
- Auth centralisée JWT au **API Gateway** (Sprint 6) + auth-service (Sprint 1)

## État des sprints

| Sprint | Contenu | Statut |
|--------|---------|--------|
| 0 | Socle Docker / microservices | Fait |
| 1 | Auth JWT / RBAC / Dashboard | Fait |
| 2 | Actifs & scans | Fait |
| 3 | Vulnérabilités & alertes | Fait |
| 4 | Rapports PDF | Fait |
| 5 | Assistant IA (priorisation) | Fait |
| 6 | JWT Gateway + recherche ES/Redis | Fait |
| 7 | Polish SOC (KPI, scan→ES/alertes, webhooks, CI) | Fait |


## Communication

```
Client → Gateway → Service → PostgreSQL
                      ↘ Redis / Elasticsearch (selon besoin)
```

Les routes Gateway exposées sous `/api/...` (voir `backend/api-gateway/.../application.yml`).
