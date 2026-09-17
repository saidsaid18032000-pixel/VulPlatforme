from __future__ import annotations

import json
from typing import Any

import redis

from app.config import settings
from app import db
from app.recommendations import recommend_for
from app.scoring import compute_priority, rank_vulnerabilities


def _redis_client() -> redis.Redis | None:
    try:
        client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        client.ping()
        return client
    except Exception:
        return None


OPEN_VULN_SQL = """
SELECT
  v.id,
  v.cve_id,
  v.title,
  v.description,
  v.severity,
  v.cvss_score,
  v.status,
  v.asset_id,
  v.discovered_at,
  a.name AS asset_name,
  a.criticality AS asset_criticality,
  a.asset_type AS asset_type,
  EXISTS (
    SELECT 1 FROM alerts al
    WHERE al.vulnerability_id = v.id
      AND al.status IN ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS')
  ) AS has_open_alert
FROM vulnerabilities v
LEFT JOIN assets a ON a.id = v.asset_id
WHERE v.status IN ('OPEN', 'IN_PROGRESS')
ORDER BY v.discovered_at DESC NULLS LAST
LIMIT %s
"""


def load_open_vulnerabilities(limit: int = 100) -> list[dict[str, Any]]:
    return db.fetch_all(OPEN_VULN_SQL, (limit,))


def load_vulnerability(vuln_id: str) -> dict[str, Any] | None:
    return db.fetch_one(
        """
        SELECT
          v.id, v.cve_id, v.title, v.description, v.severity, v.cvss_score,
          v.status, v.asset_id, v.discovered_at,
          a.name AS asset_name, a.criticality AS asset_criticality,
          a.asset_type AS asset_type,
          EXISTS (
            SELECT 1 FROM alerts al
            WHERE al.vulnerability_id = v.id
              AND al.status IN ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS')
          ) AS has_open_alert
        FROM vulnerabilities v
        LEFT JOIN assets a ON a.id = v.asset_id
        WHERE v.id = %s::uuid
        """,
        (vuln_id,),
    )


def prioritize(limit: int = 20) -> dict[str, Any]:
    rows = load_open_vulnerabilities(max(limit, 50))
    ranked = rank_vulnerabilities(rows)[:limit]
    bands: dict[str, int] = {"P0": 0, "P1": 0, "P2": 0, "P3": 0}
    for item in ranked:
        bands[item["priorityBand"]] = bands.get(item["priorityBand"], 0) + 1
    return {
        "engine": "vulnplatform-priority-v1",
        "totalAnalyzed": len(rows),
        "returned": len(ranked),
        "bandCounts": bands,
        "items": ranked,
    }


def recommend(vuln_id: str) -> dict[str, Any] | None:
    vuln = load_vulnerability(vuln_id)
    if not vuln:
        return None
    priority = compute_priority(vuln)
    return recommend_for(vuln, priority)


def build_insights() -> dict[str, Any]:
    cache_key = "ai:insights:v1"
    client = _redis_client()
    if client:
        cached = client.get(cache_key)
        if cached:
            data = json.loads(cached)
            data["cached"] = True
            return data

    open_vulns = db.scalar(
        "SELECT COUNT(*) FROM vulnerabilities WHERE status IN ('OPEN','IN_PROGRESS')"
    )
    critical_open = db.scalar(
        "SELECT COUNT(*) FROM vulnerabilities WHERE severity='CRITICAL' AND status IN ('OPEN','IN_PROGRESS')"
    )
    high_open = db.scalar(
        "SELECT COUNT(*) FROM vulnerabilities WHERE severity='HIGH' AND status IN ('OPEN','IN_PROGRESS')"
    )
    new_alerts = db.scalar("SELECT COUNT(*) FROM alerts WHERE status='NEW'")
    critical_assets = db.scalar(
        "SELECT COUNT(*) FROM assets WHERE criticality='CRITICAL' AND status='ACTIVE'"
    )

    prioritized = prioritize(limit=5)
    top = prioritized["items"]

    if critical_open > 0 or new_alerts >= 5:
        risk = "CRITICAL"
    elif high_open > 0 or open_vulns > 10:
        risk = "HIGH"
    elif open_vulns > 0:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    actions: list[str] = []
    if top:
        first = top[0]
        actions.append(
            f"Traiter en premier : {first.get('cveId') or first.get('title')} "
            f"(bande {first['priorityBand']}, score {first['priorityScore']})."
        )
    if critical_open:
        actions.append(f"Escalader les {critical_open} vulnérabilités CRITICAL ouvertes.")
    if new_alerts:
        actions.append(f"Trier les {new_alerts} alertes NEW dans le centre SOC.")
    if critical_assets and critical_open:
        actions.append("Prioriser le patching sur les actifs CRITICAL exposés.")
    if not actions:
        actions.append("Aucune action urgente — maintenir la cadence de scans.")

    payload = {
        "engine": "vulnplatform-insights-v1",
        "cached": False,
        "overallRisk": risk,
        "metrics": {
            "openVulnerabilities": open_vulns,
            "criticalOpen": critical_open,
            "highOpen": high_open,
            "newAlerts": new_alerts,
            "criticalAssets": critical_assets,
        },
        "topPriorities": top,
        "recommendedActions": actions,
        "bandCounts": prioritized["bandCounts"],
    }

    if client:
        try:
            client.setex(cache_key, settings.cache_ttl_seconds, json.dumps(payload, default=str))
        except Exception:
            pass
    return payload
