# Guide d'installation

## Windows

1. Installer [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Installer Git, JDK 17, Node.js 20 (optionnel si tout passe par Docker)
3. Cloner / ouvrir le projet
4. Copier `.env.example` vers `.env`
5. Dans le dossier racine :

```powershell
docker compose up -d --build
```

## Vérifier PostgreSQL

```powershell
docker exec -it vuln-postgres psql -U vuln -d vulnplatform -c "\dt"
```

## Arrêt

```powershell
docker compose down
```

Pour supprimer aussi les volumes (reset BDD) :

```powershell
docker compose down -v
```

## Développement local (sans Docker pour le code)

1. Démarrer l'infra : `docker compose up -d postgres redis elasticsearch`
2. Backend : depuis `backend/` → `mvn spring-boot:run -pl auth-service` (etc.)
3. AI : depuis `ai-service/` → `uvicorn app.main:app --reload --port 8000`
4. Frontend : depuis `frontend/` → `npm install` puis `npm start`
