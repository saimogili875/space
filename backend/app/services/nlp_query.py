"""
Natural Language Query engine for MangaLens.
Parses questions in English/Hindi/Marathi and returns structured answers
from the prediction, anomaly, and alert services.
"""

import re
from app.config import MOIL_MINES
from app.services.predictor import PredictionService
from app.services.anomaly import detect_anomalies, get_fleet_anomaly_summary


MINE_ALIASES = {}
for mid, info in MOIL_MINES.items():
    name_lower = info["name"].lower()
    MINE_ALIASES[name_lower] = mid
    MINE_ALIASES[mid] = mid
    MINE_ALIASES[name_lower.replace(" ", "_")] = mid
    MINE_ALIASES[name_lower.replace(" ", "")] = mid

MINE_ALIASES.update({
    "dongri": "dongri_buzurg",
    "buzurg": "dongri_buzurg",
    "sitapatoire": "sitapatore",
})

INTENT_PATTERNS = [
    (r"(shortfall|shortage|deficit|kami|tut|कमी|तूट)", "shortfall"),
    (r"(forecast|predict|production|output|utpadan|उत्पादन|अंदाज|पूर्वानुमान)", "forecast"),
    (r"(alert|warning|critical|khatrnak|खतरनाक|अलर्ट|चेतावनी|धोका)", "alerts"),
    (r"(anomaly|anomalies|unusual|visangati|विसंगति|विसंगती|असामान्य)", "anomaly"),
    (r"(health|status|sthiti|स्थिति|स्थिती|haalat|हालत)", "health"),
    (r"(compare|tulna|तुलना|versus|vs)", "compare"),
    (r"(target|lakshya|लक्ष्य)", "target"),
    (r"(weather|mausam|rainfall|barish|temperature|मौसम|बारिश|तापमान|हवामान|पाऊस)", "weather"),
    (r"\b(all mines|sab|sabhi|fleet|total|सभी|सब|सर्व|एकूण)\b", "fleet"),
    (r"(best|worst|sabse|सबसे|सर्वात)", "ranking"),
    (r"(how many|kitne|kitna|कितने|कितना|किती)", "count"),
]


def _find_mine(text):
    text_lower = text.lower()
    for alias, mid in sorted(MINE_ALIASES.items(), key=lambda x: -len(x[0])):
        if alias in text_lower:
            return mid
    return None


def _detect_intent(text):
    text_lower = text.lower()
    intents = []
    for pattern, intent in INTENT_PATTERNS:
        if re.search(pattern, text_lower):
            intents.append(intent)
    return intents if intents else ["general"]


def _format_number(n):
    if abs(n) >= 1000:
        return f"{n/1000:.1f}k"
    return f"{n:.0f}"


def process_query(query: str) -> dict:
    mine_id = _find_mine(query)
    intents = _detect_intent(query)
    service = PredictionService()

    if not mine_id:
        if "fleet" in intents or "ranking" in intents:
            return _handle_fleet_query(query, intents, service)
        if any(i in intents for i in ["shortfall", "forecast", "anomaly", "health", "target", "weather"]):
            return {
                "answer": "Please specify a mine name. For example: 'What is Balaghat's shortfall?' or 'Show Dongri Buzurg anomalies'",
                "answer_hi": "कृपया खदान का नाम बताएं। उदाहरण: 'बालाघाट का शॉर्टफॉल क्या है?'",
                "answer_mr": "कृपया खाणीचे नाव सांगा. उदाहरण: 'बालाघाटचा शॉर्टफॉल किती आहे?'",
                "type": "clarification",
                "data": None,
            }
        return _handle_fleet_query(query, intents, service)

    mine_info = MOIL_MINES[mine_id]
    mine_name = mine_info["name"]

    if "shortfall" in intents or "forecast" in intents:
        return _handle_forecast(mine_id, mine_name, service)
    elif "anomaly" in intents:
        return _handle_anomaly(mine_id, mine_name)
    elif "alerts" in intents:
        return _handle_alerts(mine_id, mine_name, service)
    elif "health" in intents:
        return _handle_health(mine_id, mine_name)
    elif "target" in intents:
        return _handle_target(mine_id, mine_name, mine_info)
    elif "count" in intents:
        return _handle_alerts(mine_id, mine_name, service)
    else:
        return _handle_summary(mine_id, mine_name, mine_info, service)


def _handle_forecast(mine_id, mine_name, service):
    forecasts = service.get_forecast(mine_id, 4)
    if not forecasts:
        return {"answer": f"No forecast data available for {mine_name}.", "type": "error", "data": None}

    latest = forecasts[0]
    predicted = latest.predicted_tonnes
    target = latest.target_tonnes
    shortfall = latest.shortfall_pct
    level = latest.alert_level.value
    cause = latest.top_factors[0]["feature"] if latest.top_factors else "unknown"

    answer = (
        f"**{mine_name}** forecast for {latest.period}:\n"
        f"- Predicted output: **{_format_number(predicted)} tonnes**\n"
        f"- Target: {_format_number(target)} tonnes\n"
        f"- Shortfall: **{abs(shortfall):.1f}%** ({level})\n"
        f"- Primary cause: {cause}"
    )
    answer_hi = (
        f"**{mine_name}** का {latest.period} का पूर्वानुमान:\n"
        f"- अनुमानित उत्पादन: **{_format_number(predicted)} टन**\n"
        f"- लक्ष्य: {_format_number(target)} टन\n"
        f"- कमी: **{abs(shortfall):.1f}%** ({level})\n"
        f"- मुख्य कारण: {cause}"
    )
    answer_mr = (
        f"**{mine_name}** चा {latest.period} चा अंदाज:\n"
        f"- अंदाजित उत्पादन: **{_format_number(predicted)} टन**\n"
        f"- लक्ष्य: {_format_number(target)} टन\n"
        f"- तूट: **{abs(shortfall):.1f}%** ({level})\n"
        f"- मुख्य कारण: {cause}"
    )

    return {
        "answer": answer,
        "answer_hi": answer_hi,
        "answer_mr": answer_mr,
        "type": "forecast",
        "mine_id": mine_id,
        "data": {
            "period": latest.period,
            "predicted": predicted,
            "target": target,
            "shortfall_pct": shortfall,
            "alert_level": level,
            "cause": cause,
        },
    }


def _handle_anomaly(mine_id, mine_name):
    result = detect_anomalies(mine_id, 12)
    anomalies = result["anomalies"]
    summary = result["summary"]
    count = len(anomalies)
    health = summary.get("health_score", 100)

    if count == 0:
        answer = f"**{mine_name}**: No anomalies detected in the last 12 months. Health score: {health}/100."
        answer_hi = f"**{mine_name}**: पिछले 12 महीनों में कोई विसंगति नहीं। स्वास्थ्य स्कोर: {health}/100।"
        answer_mr = f"**{mine_name}**: मागील 12 महिन्यांत कोणतीही विसंगती नाही. आरोग्य स्कोर: {health}/100."
    else:
        details = []
        for a in anomalies[:3]:
            details.append(f"  - [{a['severity']}] {a['type']}: {a['description']}")
        detail_str = "\n".join(details)

        answer = f"**{mine_name}**: {count} anomalies detected. Health: {health}/100.\n{detail_str}"
        answer_hi = f"**{mine_name}**: {count} विसंगतियां पाई गईं। स्वास्थ्य: {health}/100।"
        answer_mr = f"**{mine_name}**: {count} विसंगती आढळल्या. आरोग्य: {health}/100."

    return {
        "answer": answer,
        "answer_hi": answer_hi,
        "answer_mr": answer_mr,
        "type": "anomaly",
        "mine_id": mine_id,
        "data": {"count": count, "health_score": health, "anomalies": anomalies[:3]},
    }


def _handle_alerts(mine_id, mine_name, service):
    alerts = service.get_alerts(mine_id)
    critical = [a for a in alerts if a.alert_level.value == "CRITICAL"]
    warning = [a for a in alerts if a.alert_level.value == "WARNING"]

    answer = (
        f"**{mine_name}** alerts: {len(critical)} critical, {len(warning)} warning.\n"
    )
    if critical:
        for a in critical:
            answer += f"- CRITICAL ({a.period}): {abs(a.shortfall_pct):.1f}% shortfall — {a.primary_cause}\n"
    if warning:
        for a in warning:
            answer += f"- WARNING ({a.period}): {abs(a.shortfall_pct):.1f}% shortfall — {a.primary_cause}\n"
    if not critical and not warning:
        answer += "All clear — no active alerts."

    return {
        "answer": answer,
        "answer_hi": f"**{mine_name}**: {len(critical)} गंभीर, {len(warning)} चेतावनी अलर्ट।",
        "answer_mr": f"**{mine_name}**: {len(critical)} गंभीर, {len(warning)} चेतावणी अलर्ट.",
        "type": "alerts",
        "mine_id": mine_id,
        "data": {"critical": len(critical), "warning": len(warning)},
    }


def _handle_health(mine_id, mine_name):
    result = detect_anomalies(mine_id, 12)
    health = result["summary"].get("health_score", 100)
    anomaly_count = len(result["anomalies"])

    answer = f"**{mine_name}** health score: **{health}/100** ({anomaly_count} anomalies in 12 months)."
    return {
        "answer": answer,
        "answer_hi": f"**{mine_name}** स्वास्थ्य स्कोर: **{health}/100** (12 महीनों में {anomaly_count} विसंगतियां)।",
        "answer_mr": f"**{mine_name}** आरोग्य स्कोर: **{health}/100** (12 महिन्यांत {anomaly_count} विसंगती).",
        "type": "health",
        "mine_id": mine_id,
        "data": {"health_score": health, "anomalies": anomaly_count},
    }


def _handle_target(mine_id, mine_name, mine_info):
    base = mine_info["base_monthly_tonnes"]
    return {
        "answer": f"**{mine_name}** monthly production target: **{_format_number(base)} tonnes/month**. Ore grade: {mine_info['ore_grade_pct']}%.",
        "answer_hi": f"**{mine_name}** मासिक उत्पादन लक्ष्य: **{_format_number(base)} टन/माह**। अयस्क ग्रेड: {mine_info['ore_grade_pct']}%।",
        "answer_mr": f"**{mine_name}** मासिक उत्पादन लक्ष्य: **{_format_number(base)} टन/महिना**. धातूचा दर्जा: {mine_info['ore_grade_pct']}%.",
        "type": "info",
        "mine_id": mine_id,
        "data": {"target_monthly": base, "ore_grade": mine_info["ore_grade_pct"]},
    }


def _handle_summary(mine_id, mine_name, mine_info, service):
    forecasts = service.get_forecast(mine_id, 1)
    latest = forecasts[0] if forecasts else None
    result = detect_anomalies(mine_id, 12)
    health = result["summary"].get("health_score", 100)

    parts = [f"**{mine_name}** ({mine_info['type']}, {mine_info['state']})"]
    if latest:
        parts.append(f"- Next forecast: {_format_number(latest.predicted_tonnes)}t ({latest.period}), shortfall {abs(latest.shortfall_pct):.1f}% [{latest.alert_level.value}]")
    parts.append(f"- Health score: {health}/100")
    parts.append(f"- Target: {_format_number(mine_info['base_monthly_tonnes'])}t/month, ore grade: {mine_info['ore_grade_pct']}%")

    return {
        "answer": "\n".join(parts),
        "answer_hi": f"**{mine_name}** ({mine_info['type']}, {mine_info['state']}): स्वास्थ्य {health}/100",
        "answer_mr": f"**{mine_name}** ({mine_info['type']}, {mine_info['state']}): आरोग्य {health}/100",
        "type": "summary",
        "mine_id": mine_id,
        "data": None,
    }


def _handle_fleet_query(query, intents, service):
    text_lower = query.lower()

    if "ranking" in intents or "best" in text_lower or "worst" in text_lower:
        rankings = []
        for mid, info in MOIL_MINES.items():
            forecasts = service.get_forecast(mid, 1)
            if forecasts:
                rankings.append((info["name"], mid, forecasts[0].shortfall_pct))

        if "best" in text_lower or "sabse kam" in text_lower or "सबसे कम" in text_lower:
            rankings.sort(key=lambda x: abs(x[2]))
            top = rankings[:3]
            lines = [f"**Best performing mines** (lowest shortfall):"]
            for i, (name, _, sp) in enumerate(top, 1):
                lines.append(f"{i}. {name}: {abs(sp):.1f}%")
        else:
            rankings.sort(key=lambda x: -abs(x[2]))
            top = rankings[:3]
            lines = [f"**Worst performing mines** (highest shortfall):"]
            for i, (name, _, sp) in enumerate(top, 1):
                lines.append(f"{i}. {name}: {abs(sp):.1f}%")

        return {"answer": "\n".join(lines), "type": "ranking", "data": top}

    fleet = get_fleet_anomaly_summary()
    total_mines = len(MOIL_MINES)
    total_critical = 0
    total_warning = 0
    for mid in MOIL_MINES:
        alerts = service.get_alerts(mid)
        total_critical += sum(1 for a in alerts if a.alert_level.value == "CRITICAL")
        total_warning += sum(1 for a in alerts if a.alert_level.value == "WARNING")

    answer = (
        f"**Fleet Overview** ({total_mines} MOIL mines):\n"
        f"- Critical alerts: {total_critical}\n"
        f"- Warning alerts: {total_warning}\n"
        f"- Fleet health: {fleet.get('fleet_health', 'N/A')}/100\n"
        f"- Mines with anomalies: {fleet.get('mines_with_anomalies', 0)}/{total_mines}"
    )

    return {
        "answer": answer,
        "answer_hi": f"**बेड़ा अवलोकन** ({total_mines} खदानें): {total_critical} गंभीर, {total_warning} चेतावनी अलर्ट।",
        "answer_mr": f"**फ्लीट विहंगावलोकन** ({total_mines} खाणी): {total_critical} गंभीर, {total_warning} चेतावणी अलर्ट.",
        "type": "fleet",
        "data": {"critical": total_critical, "warning": total_warning, "total_mines": total_mines},
    }
