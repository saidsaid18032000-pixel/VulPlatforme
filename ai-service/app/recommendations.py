from __future__ import annotations

from typing import Any


CVE_PLAYBOOKS: dict[str, list[str]] = {
    "CVE-2021-44228": [
        "Mettre à jour Log4j vers une version >= 2.17.1.",
        "Appliquer les contrôles WAF / désactiver JNDI lookups si patch impossible.",
        "Auditer les logs pour des payloads ${jndi:.",
    ],
    "CVE-2022-22965": [
        "Mettre à jour Spring Framework vers une version patchée.",
        "Restreindre l'accès aux endpoints de data binding.",
        "Vérifier l'absence d'exploitation via scans web.",
    ],
    "CVE-2024-3094": [
        "Remplacer immédiatement les paquets xz/liblzma compromis.",
        "Reconstruire les images/artefacts depuis des sources saines.",
        "Auditer les accès SSH et les binaires liés à sshd.",
    ],
    "CVE-2023-4863": [
        "Mettre à jour libwebp / navigateurs / composants embarqués.",
        "Prioriser les postes utilisateurs et les services exposés au web.",
    ],
    "CVE-2024-21626": [
        "Mettre à jour runc / container runtime vers version corrigée.",
        "Restreindre les capabilities et vérifier les WORKDIR sensibles.",
    ],
}


def recommend_for(vuln: dict[str, Any], priority: dict[str, Any]) -> dict[str, Any]:
    cve = (vuln.get("cve_id") or "").upper()
    severity = str(vuln.get("severity") or "").upper()
    asset_type = str(vuln.get("asset_type") or "").upper()
    band = priority.get("priorityBand", "P2")

    steps: list[str] = []
    if cve in CVE_PLAYBOOKS:
        steps.extend(CVE_PLAYBOOKS[cve])
    else:
        steps.append("Confirmer l'applicabilité de la CVE sur l'actif concerné.")
        steps.append("Appliquer le correctif éditeur ou le workaround officiel.")
        steps.append("Relancer un scan ciblé pour valider la remédiation.")

    if severity in ("CRITICAL", "HIGH"):
        steps.append("Isoler temporairement l'actif si l'exploitation est probable.")
    if asset_type in ("SERVER", "DATABASE", "NETWORK"):
        steps.append("Coordonner avec l'équipe infra avant redémarrage / patch.")
    if band == "P0":
        steps.insert(0, "Traiter en urgence (SLA < 24h) — escalade SOC / SSI.")

    owner = "ANALYSTE_SOC"
    if band in ("P0", "P1"):
        owner = "RESPONSABLE_SSI"

    return {
        "cveId": vuln.get("cve_id"),
        "vulnerabilityId": str(vuln.get("id")) if vuln.get("id") else None,
        "title": vuln.get("title"),
        "priorityBand": band,
        "priorityScore": priority.get("priorityScore"),
        "suggestedOwner": owner,
        "suggestedSlaHours": priority.get("suggestedSlaHours"),
        "remediationSteps": steps,
        "summary": (
            f"Priorité {band} (score {priority.get('priorityScore')}). "
            f"Traiter « {vuln.get('title')} » en premier sur l'actif "
            f"{vuln.get('asset_name') or 'non associé'}."
        ),
    }
