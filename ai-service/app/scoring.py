from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


SEVERITY_WEIGHT = {
    "CRITICAL": 40.0,
    "HIGH": 30.0,
    "MEDIUM": 15.0,
    "LOW": 5.0,
    "INFO": 1.0,
}

ASSET_CRITICALITY_WEIGHT = {
    "CRITICAL": 25.0,
    "HIGH": 15.0,
    "MEDIUM": 8.0,
    "LOW": 2.0,
}

STATUS_WEIGHT = {
    "OPEN": 10.0,
    "IN_PROGRESS": 5.0,
    "RESOLVED": 0.0,
    "FALSE_POSITIVE": -20.0,
    "ACCEPTED_RISK": -10.0,
}


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _age_days(discovered_at: Any) -> float:
    if discovered_at is None:
        return 0.0
    if isinstance(discovered_at, str):
        try:
            discovered_at = datetime.fromisoformat(discovered_at.replace("Z", "+00:00"))
        except ValueError:
            return 0.0
    if discovered_at.tzinfo is None:
        discovered_at = discovered_at.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - discovered_at
    return max(delta.total_seconds() / 86400.0, 0.0)


def priority_band(score: float) -> str:
    if score >= 80:
        return "P0"
    if score >= 60:
        return "P1"
    if score >= 40:
        return "P2"
    return "P3"


def compute_priority(vuln: dict[str, Any]) -> dict[str, Any]:
    severity = str(vuln.get("severity") or "MEDIUM").upper()
    status = str(vuln.get("status") or "OPEN").upper()
    asset_crit = str(vuln.get("asset_criticality") or "MEDIUM").upper()
    cvss = _to_float(vuln.get("cvss_score"), 0.0)
    age = _age_days(vuln.get("discovered_at"))
    alert_boost = 12.0 if vuln.get("has_open_alert") else 0.0

    parts = {
        "severity": SEVERITY_WEIGHT.get(severity, 10.0),
        "cvss": min(cvss * 4.0, 40.0),
        "asset": ASSET_CRITICALITY_WEIGHT.get(asset_crit, 8.0),
        "status": STATUS_WEIGHT.get(status, 0.0),
        "age": min(age * 0.5, 15.0),
        "alert": alert_boost,
    }
    score = round(sum(parts.values()), 1)
    band = priority_band(score)

    rationale: list[str] = []
    if severity in ("CRITICAL", "HIGH"):
        rationale.append(f"Sévérité {severity} (poids {parts['severity']:.0f}).")
    if cvss >= 7.0:
        rationale.append(f"CVSS élevé ({cvss}).")
    if asset_crit in ("CRITICAL", "HIGH"):
        rationale.append(f"Actif {asset_crit} — impact métier important.")
    if age >= 14:
        rationale.append(f"Ouverte depuis {int(age)} jours — dette de risque.")
    if alert_boost:
        rationale.append("Alerte SOC liée encore ouverte.")
    if status == "IN_PROGRESS":
        rationale.append("Déjà en cours de traitement — maintenir le suivi.")
    if not rationale:
        rationale.append("Score composite basé sur sévérité, CVSS et criticité d'actif.")

    return {
        "priorityScore": score,
        "priorityBand": band,
        "scoreBreakdown": parts,
        "rationale": rationale,
        "suggestedSlaHours": _sla_hours(band),
    }


def _sla_hours(band: str) -> int:
    return {"P0": 24, "P1": 72, "P2": 168, "P3": 720}.get(band, 168)


def rank_vulnerabilities(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for row in rows:
        meta = compute_priority(row)
        item = {
            "id": str(row.get("id")),
            "cveId": row.get("cve_id"),
            "title": row.get("title"),
            "severity": row.get("severity"),
            "cvssScore": float(row["cvss_score"]) if row.get("cvss_score") is not None else None,
            "status": row.get("status"),
            "assetId": str(row["asset_id"]) if row.get("asset_id") else None,
            "assetName": row.get("asset_name"),
            "assetCriticality": row.get("asset_criticality"),
            "discoveredAt": row.get("discovered_at").isoformat() if row.get("discovered_at") else None,
            **meta,
        }
        ranked.append(item)
    ranked.sort(key=lambda x: (-x["priorityScore"], x.get("cveId") or ""))
    for idx, item in enumerate(ranked, start=1):
        item["rank"] = idx
    return ranked
