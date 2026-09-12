# Conventions de code

## Général

- Langue des commits : français ou anglais, mais **cohérent** sur la branche
- Pas de secrets dans Git (utiliser `.env`, jamais committer `.env`)
- Branches : `feature/<ticket>-description`, `hotfix/<description>`

## Java / Spring Boot

- Java 17, Spring Boot 3.x
- Packages : `com.vulnplatform.<service>`
- Lombok autorisé pour réduire le boilerplate
- API documentée via springdoc / Swagger
- `ddl-auto: validate` — le schéma SQL est la source de vérité (`infra/postgres/init`)

## Angular

- Standalone components
- Features par dossier (`features/auth`, `features/dashboard`, ...)
- Services HTTP dans `core/`
- Angular Material pour l'UI (Sprint 1+)

## Python / FastAPI

- Type hints obligatoires sur les endpoints publics
- Pydantic pour les schémas requête/réponse
- Dépendances figées dans `requirements.txt`

## Docker

- Un `Dockerfile` par service
- Variables via Compose / `.env`
- Healthchecks sur l'infra critique (Postgres, Redis, ES)
