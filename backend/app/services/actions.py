"""
Corrective Action Engine: given a shortfall prediction and its top SHAP features,
generates ranked actionable recommendations for MOIL operators.
"""

from app.models.schemas import CorrectiveAction, AlertLevel

MN_PRICE_PER_TONNE_INR = 30000  # ~Rs 30,000/tonne for manganese ore (2024 avg)
CRORE = 1e7

ACTION_RULES = {
    "rainfall": [
        {
            "action": "Shift production load to underground mines (weather-resistant operations)",
            "recovery_pct": 0.40,
            "applies_to": "opencast",
        },
        {
            "action": "Pre-stock ore from opencast mines before predicted heavy rainfall period",
            "recovery_pct": 0.25,
            "applies_to": "all",
        },
        {
            "action": "Deploy temporary weather shelters at opencast loading points",
            "recovery_pct": 0.15,
            "applies_to": "opencast",
        },
        {
            "action": "Activate dewatering pumps at full capacity to reduce flood downtime",
            "recovery_pct": 0.10,
            "applies_to": "underground",
        },
    ],
    "equipment": [
        {
            "action": "Expedite scheduled maintenance on high-failure-risk equipment",
            "recovery_pct": 0.35,
            "applies_to": "all",
        },
        {
            "action": "Deploy standby equipment from mines with spare capacity",
            "recovery_pct": 0.30,
            "applies_to": "all",
        },
        {
            "action": "Redistribute production load to mines with higher operational ratio",
            "recovery_pct": 0.25,
            "applies_to": "all",
        },
        {
            "action": "Increase preventive maintenance frequency for aging fleet (>10 years)",
            "recovery_pct": 0.15,
            "applies_to": "all",
        },
    ],
    "reserve_quality": [
        {
            "action": "Switch extraction to higher-grade zones identified by spectral analysis",
            "recovery_pct": 0.30,
            "applies_to": "all",
        },
        {
            "action": "Increase blasting frequency in high-probability reserve zones",
            "recovery_pct": 0.20,
            "applies_to": "all",
        },
        {
            "action": "Reprocess lower-grade stockpiles using updated beneficiation parameters",
            "recovery_pct": 0.15,
            "applies_to": "all",
        },
    ],
    "transport": [
        {
            "action": "Activate alternate transport route to avoid monsoon-damaged roads",
            "recovery_pct": 0.25,
            "applies_to": "all",
        },
        {
            "action": "Increase dispatch frequency during dry windows between rain spells",
            "recovery_pct": 0.20,
            "applies_to": "all",
        },
    ],
    "seasonal": [
        {
            "action": "Increase shift count during high-productivity months (Oct-May)",
            "recovery_pct": 0.20,
            "applies_to": "all",
        },
        {
            "action": "Build strategic ore buffer stock in Q1 to cushion monsoon shortfall",
            "recovery_pct": 0.30,
            "applies_to": "all",
        },
    ],
}

FEATURE_TO_CAUSE = {
    "rainfall_mm_mean": "rainfall",
    "rainfall_mm_max": "rainfall",
    "rainfall_mm_sum": "rainfall",
    "rainy_days": "rainfall",
    "heavy_rain_days": "rainfall",
    "rainfall_mm_sum_lag1": "rainfall",
    "rainfall_mm_sum_lag2": "rainfall",
    "rainfall_mm_sum_lag3": "rainfall",
    "soil_moisture_mean": "rainfall",
    "avg_equipment_age": "equipment",
    "avg_utilization": "equipment",
    "avg_failure_prob": "equipment",
    "operational_ratio": "equipment",
    "ndvi_mean": "reserve_quality",
    "is_monsoon": "seasonal",
    "month": "seasonal",
    "quarter": "seasonal",
}


def identify_cause(top_features: list[dict]) -> str:
    if not top_features:
        return "seasonal"
    top_feat = top_features[0]["feature"]
    return FEATURE_TO_CAUSE.get(top_feat, "seasonal")


def generate_actions(
    shortfall_tonnes: float,
    alert_level: AlertLevel,
    top_features: list[dict],
    mine_type: str = "underground",
) -> list[CorrectiveAction]:
    cause = identify_cause(top_features)
    rules = ACTION_RULES.get(cause, ACTION_RULES["seasonal"])

    actions = []
    for i, rule in enumerate(rules):
        if rule["applies_to"] not in ("all", mine_type):
            continue

        recovery = abs(shortfall_tonnes) * rule["recovery_pct"]
        value_crore = (recovery * MN_PRICE_PER_TONNE_INR) / CRORE

        actions.append(CorrectiveAction(
            id=i + 1,
            alert_level=alert_level,
            cause=cause,
            action=rule["action"],
            estimated_recovery_tonnes=round(recovery, 0),
            estimated_value_crore=round(value_crore, 2),
            priority=i + 1,
        ))

    return actions
