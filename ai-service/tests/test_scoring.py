from datetime import datetime, timedelta, timezone

from app.scoring import compute_priority, priority_band, rank_vulnerabilities
from app.recommendations import recommend_for


def test_priority_band_thresholds():
    assert priority_band(85) == "P0"
    assert priority_band(65) == "P1"
    assert priority_band(45) == "P2"
    assert priority_band(10) == "P3"


def test_critical_vuln_on_critical_asset_is_p0():
    result = compute_priority(
        {
            "severity": "CRITICAL",
            "cvss_score": 9.8,
            "status": "OPEN",
            "asset_criticality": "CRITICAL",
            "discovered_at": datetime.now(timezone.utc) - timedelta(days=20),
            "has_open_alert": True,
        }
    )
    assert result["priorityScore"] >= 80
    assert result["priorityBand"] == "P0"
    assert result["suggestedSlaHours"] == 24
    assert any("CRITICAL" in r or "Alerte" in r for r in result["rationale"])


def test_rank_sorts_by_score_desc():
    rows = [
        {
            "id": "1",
            "cve_id": "CVE-LOW",
            "title": "Low",
            "severity": "LOW",
            "cvss_score": 2.0,
            "status": "OPEN",
            "asset_criticality": "LOW",
            "discovered_at": datetime.now(timezone.utc),
            "has_open_alert": False,
        },
        {
            "id": "2",
            "cve_id": "CVE-CRIT",
            "title": "Crit",
            "severity": "CRITICAL",
            "cvss_score": 10.0,
            "status": "OPEN",
            "asset_criticality": "CRITICAL",
            "discovered_at": datetime.now(timezone.utc),
            "has_open_alert": True,
        },
    ]
    ranked = rank_vulnerabilities(rows)
    assert ranked[0]["cveId"] == "CVE-CRIT"
    assert ranked[0]["rank"] == 1
    assert ranked[1]["rank"] == 2


def test_recommend_includes_playbook_for_known_cve():
    vuln = {
        "id": "abc",
        "cve_id": "CVE-2021-44228",
        "title": "Log4Shell",
        "severity": "CRITICAL",
        "asset_name": "app-server",
        "asset_type": "SERVER",
    }
    priority = {"priorityBand": "P0", "priorityScore": 92.0, "suggestedSlaHours": 24}
    rec = recommend_for(vuln, priority)
    assert rec["suggestedOwner"] == "RESPONSABLE_SSI"
    assert any("Log4j" in s for s in rec["remediationSteps"])
    assert rec["remediationSteps"][0].startswith("Traiter en urgence")
