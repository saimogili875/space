from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone

router = APIRouter(prefix="/api/audit", tags=["audit"])

audit_log: list[dict] = []

SYSTEM_EVENTS = [
    {"ts": "2024-09-01T08:00:00Z", "actor": "system", "action": "model_retrained", "category": "ml", "details": "XGBoost + LSTM ensemble retrained on 24-month data", "mine_id": None},
    {"ts": "2024-09-01T08:05:00Z", "actor": "system", "action": "alert_generated", "category": "alert", "details": "CRITICAL shortfall alert for Balaghat (14.9%)", "mine_id": "balaghat"},
    {"ts": "2024-09-01T08:05:01Z", "actor": "system", "action": "alert_generated", "category": "alert", "details": "WARNING shortfall alert for Dongri Buzurg (7.2%)", "mine_id": "dongri_buzurg"},
    {"ts": "2024-09-01T08:06:00Z", "actor": "system", "action": "anomaly_detected", "category": "anomaly", "details": "3 multivariate anomalies detected at Dongri Buzurg", "mine_id": "dongri_buzurg"},
    {"ts": "2024-09-01T09:00:00Z", "actor": "system", "action": "forecast_generated", "category": "ml", "details": "4-month forecast generated for all 10 MOIL mines", "mine_id": None},
    {"ts": "2024-09-01T09:15:00Z", "actor": "system", "action": "notification_sent", "category": "alert", "details": "Escalation: Balaghat CRITICAL alert sent to Regional Director", "mine_id": "balaghat"},
    {"ts": "2024-09-02T07:30:00Z", "actor": "system", "action": "satellite_update", "category": "satellite", "details": "Sentinel-2 spectral data updated for all mines", "mine_id": None},
    {"ts": "2024-09-02T10:00:00Z", "actor": "system", "action": "corrective_action", "category": "decision", "details": "Recommended: Deploy additional excavators at Balaghat", "mine_id": "balaghat"},
    {"ts": "2024-09-03T06:00:00Z", "actor": "system", "action": "model_drift_check", "category": "ml", "details": "Model drift within acceptable bounds (MAE < 5%)", "mine_id": None},
    {"ts": "2024-09-03T14:00:00Z", "actor": "system", "action": "what_if_simulation", "category": "decision", "details": "What-If: +10% rainfall impact simulated for Chikla", "mine_id": "chikla"},
]


class AuditEntry(BaseModel):
    action: str
    category: str = "user"
    details: str = ""
    mine_id: str | None = None
    actor: str = "user"


@router.get("")
def get_audit_log(category: str | None = None, mine_id: str | None = None, limit: int = 50):
    combined = SYSTEM_EVENTS + audit_log
    combined.sort(key=lambda x: x["ts"], reverse=True)

    if category:
        combined = [e for e in combined if e["category"] == category]
    if mine_id:
        combined = [e for e in combined if e.get("mine_id") == mine_id]

    return {
        "total": len(combined),
        "entries": combined[:limit],
        "categories": list({e["category"] for e in SYSTEM_EVENTS + audit_log}),
    }


@router.post("")
def add_audit_entry(entry: AuditEntry):
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "actor": entry.actor,
        "action": entry.action,
        "category": entry.category,
        "details": entry.details,
        "mine_id": entry.mine_id,
    }
    audit_log.append(record)
    return {"status": "logged", "entry": record}


@router.get("/stats")
def audit_stats():
    combined = SYSTEM_EVENTS + audit_log
    cats = {}
    for e in combined:
        c = e["category"]
        cats[c] = cats.get(c, 0) + 1

    return {
        "total_events": len(combined),
        "by_category": cats,
        "user_actions": len(audit_log),
        "system_events": len(SYSTEM_EVENTS),
    }
