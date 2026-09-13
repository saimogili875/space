"""
Alert Notification Service: simulates email/SMS dispatch for critical alerts.
In production, this would integrate with SMTP, Twilio, or MOIL's internal messaging.
"""

from datetime import datetime
from app.config import MOIL_MINES
from app.services.predictor import PredictionService

NOTIFICATION_LOG = []

CONTACTS = {
    "balaghat": {
        "mine_manager": {"name": "R.K. Sharma", "email": "rk.sharma@moil.nic.in", "phone": "+91-9XXXXXX01"},
        "safety_officer": {"name": "P. Verma", "email": "p.verma@moil.nic.in", "phone": "+91-9XXXXXX02"},
    },
    "dongri_buzurg": {
        "mine_manager": {"name": "S. Patil", "email": "s.patil@moil.nic.in", "phone": "+91-9XXXXXX03"},
        "safety_officer": {"name": "A. Deshmukh", "email": "a.deshmukh@moil.nic.in", "phone": "+91-9XXXXXX04"},
    },
}

DEFAULT_CONTACT = {
    "mine_manager": {"name": "Mine Manager", "email": "manager@moil.nic.in", "phone": "+91-9XXXXXX00"},
    "safety_officer": {"name": "Safety Officer", "email": "safety@moil.nic.in", "phone": "+91-9XXXXXX00"},
}

ESCALATION = {
    "CRITICAL": {
        "channels": ["email", "sms", "dashboard"],
        "recipients": ["mine_manager", "safety_officer", "regional_head"],
        "escalation_minutes": 30,
        "auto_action": True,
    },
    "WARNING": {
        "channels": ["email", "dashboard"],
        "recipients": ["mine_manager"],
        "escalation_minutes": 120,
        "auto_action": False,
    },
}


def _build_message(alert_level: str, mine_name: str, period: str, shortfall_pct: float, cause: str) -> dict:
    severity_emoji = "⚠️" if alert_level == "WARNING" else "\U0001F6A8"
    subject = f"{severity_emoji} MangaLens {alert_level}: {mine_name} — {abs(shortfall_pct):.1f}% shortfall forecast"

    body = (
        f"ALERT: {alert_level} — {mine_name}\n"
        f"Period: {period}\n"
        f"Forecast shortfall: {abs(shortfall_pct):.1f}% below target\n"
        f"Primary cause: {cause}\n\n"
        f"Action required: Review corrective actions in MangaLens dashboard.\n"
        f"Dashboard: http://mangalens.moil.nic.in/mine/{mine_name.lower().replace(' ', '_')}\n\n"
        f"— MangaLens AI Platform (SIH26009)"
    )

    sms = (
        f"MangaLens {alert_level}: {mine_name} {period} "
        f"shortfall {abs(shortfall_pct):.1f}%. Cause: {cause}. "
        f"Check dashboard."
    )

    return {"subject": subject, "body": body, "sms": sms}


def generate_notifications() -> dict:
    service = PredictionService()
    notifications = []

    for mine_id, info in MOIL_MINES.items():
        alerts = service.get_alerts(mine_id)
        contacts = CONTACTS.get(mine_id, DEFAULT_CONTACT)

        for alert in alerts:
            level = alert.alert_level.value
            escalation = ESCALATION.get(level)
            if not escalation:
                continue

            message = _build_message(
                level, info["name"], alert.period,
                alert.shortfall_pct, alert.primary_cause
            )

            recipients = []
            for role in escalation["recipients"]:
                contact = contacts.get(role)
                if contact:
                    recipients.append({**contact, "role": role})

            notification = {
                "id": f"{mine_id}_{alert.period}_{level}",
                "mine_id": mine_id,
                "mine_name": info["name"],
                "alert_level": level,
                "period": alert.period,
                "shortfall_pct": alert.shortfall_pct,
                "primary_cause": alert.primary_cause,
                "channels": escalation["channels"],
                "recipients": recipients,
                "escalation_minutes": escalation["escalation_minutes"],
                "auto_action": escalation["auto_action"],
                "message": message,
                "status": "simulated",
                "created_at": datetime.now().isoformat(),
            }
            notifications.append(notification)

    notifications.sort(key=lambda n: (0 if n["alert_level"] == "CRITICAL" else 1))

    summary = {
        "total": len(notifications),
        "critical": sum(1 for n in notifications if n["alert_level"] == "CRITICAL"),
        "warning": sum(1 for n in notifications if n["alert_level"] == "WARNING"),
        "channels_used": list(set(ch for n in notifications for ch in n["channels"])),
        "unique_mines": len(set(n["mine_id"] for n in notifications)),
    }

    return {"notifications": notifications, "summary": summary, "escalation_rules": ESCALATION}


def send_test_notification(mine_id: str) -> dict:
    info = MOIL_MINES.get(mine_id)
    if not info:
        return {"error": f"Mine '{mine_id}' not found"}

    contacts = CONTACTS.get(mine_id, DEFAULT_CONTACT)
    message = _build_message("CRITICAL", info["name"], "TEST", -15.0, "test_alert")

    entry = {
        "mine_id": mine_id,
        "mine_name": info["name"],
        "type": "test",
        "channels": ["email", "sms"],
        "recipients": list(contacts.values()),
        "message": message,
        "status": "simulated_sent",
        "sent_at": datetime.now().isoformat(),
    }

    NOTIFICATION_LOG.append(entry)
    return entry
