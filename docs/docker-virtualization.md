# Docker Desktop : virtualisation non détectée

## Symptôme

Docker Desktop affiche :

> **Virtualization support not detected**  
> Docker Desktop failed to start because virtualization support wasn't detected.

Sans Docker, `docker compose up` (PostgreSQL, Redis, Elasticsearch, microservices) ne peut pas démarrer.

## Cause

Sur cette machine, la virtualisation CPU (Intel VT-x) n’est **pas activée au niveau firmware**  
(`VirtualizationFirmwareEnabled = False`).

## Solution recommandée (activer la virtualisation)

1. Redémarrer le PC et entrer dans le **BIOS/UEFI** (souvent `F2`, `F10`, `Esc` ou `Del` au boot — sur HP souvent `F10`).
2. Chercher une option du type :
   - **Intel Virtualization Technology (VT-x)**
   - **Virtualization**
   - **SVM Mode** (AMD)
3. La passer à **Enabled**.
4. Enregistrer (`F10`) et redémarrer.
5. Dans Windows, vérifier aussi :
   - **Paramètres → Applications → Fonctionnalités optionnelles → Plus de fonctionnalités Windows**
   - Activer **Plateforme de machine virtuelle** et **Sous-système Windows pour Linux** si besoin.
6. Relancer **Docker Desktop**, puis :

```bash
docker compose up -d --build
```

## Contournement Sprint 0 (sans Docker)

Installer PostgreSQL en natif (Windows) et lancer les services Java / Angular / FastAPI en local.

Voir `docs/installation.md` section « Mode sans Docker ».
