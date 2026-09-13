"""
ROI Calculator: estimates annual savings from MangaLens early shortfall detection.
Compares "no intervention" vs "MangaLens-guided" scenarios across all MOIL mines.
"""

from app.config import MOIL_MINES
from app.services.predictor import PredictionService

MN_ORE_PRICE_PER_TONNE = 7000
RECOVERY_RATE = 0.35
EARLY_DETECTION_MONTHS = 3
ANNUAL_MOIL_TARGET_LAKH_TONNES = 18


def calculate_roi() -> dict:
    service = PredictionService()

    mine_details = []
    total_shortfall_tonnes = 0
    total_recoverable = 0

    for mine_id, info in MOIL_MINES.items():
        forecasts = service.get_forecast(mine_id, periods=4)
        mine_shortfall = 0
        mine_critical = 0
        mine_warning = 0

        for fc in forecasts:
            if fc.shortfall_pct < 0:
                shortfall_t = abs(fc.shortfall_pct / 100) * fc.target_tonnes
                mine_shortfall += shortfall_t
            if fc.alert_level.value == "CRITICAL":
                mine_critical += 1
            elif fc.alert_level.value == "WARNING":
                mine_warning += 1

        annual_shortfall = mine_shortfall * 3
        recoverable = annual_shortfall * RECOVERY_RATE
        value_saved = recoverable * MN_ORE_PRICE_PER_TONNE

        total_shortfall_tonnes += annual_shortfall
        total_recoverable += recoverable

        mine_details.append({
            "mine_id": mine_id,
            "name": info["name"],
            "state": info["state"],
            "type": info["type"],
            "base_monthly_tonnes": info["base_monthly_tonnes"],
            "forecast_shortfall_4m": round(mine_shortfall, 0),
            "annual_shortfall_estimate": round(annual_shortfall, 0),
            "recoverable_tonnes": round(recoverable, 0),
            "value_saved_lakh": round(value_saved / 1e5, 1),
            "critical_alerts": mine_critical,
            "warning_alerts": mine_warning,
        })

    mine_details.sort(key=lambda m: m["annual_shortfall_estimate"], reverse=True)

    total_value_saved = total_recoverable * MN_ORE_PRICE_PER_TONNE
    total_value_crore = total_value_saved / 1e7

    without_mangalens = {
        "annual_shortfall_tonnes": round(total_shortfall_tonnes, 0),
        "lost_revenue_crore": round(total_shortfall_tonnes * MN_ORE_PRICE_PER_TONNE / 1e7, 1),
        "detection_delay_months": 6,
        "recovery_rate_pct": 5,
    }

    with_mangalens = {
        "annual_shortfall_tonnes": round(total_shortfall_tonnes, 0),
        "recoverable_tonnes": round(total_recoverable, 0),
        "saved_revenue_crore": round(total_value_crore, 1),
        "detection_delay_months": 1,
        "recovery_rate_pct": round(RECOVERY_RATE * 100, 0),
        "early_detection_advantage_months": EARLY_DETECTION_MONTHS,
    }

    platform_cost_crore = 0.5
    net_benefit_crore = round(total_value_crore - platform_cost_crore, 1)
    roi_pct = round((net_benefit_crore / platform_cost_crore) * 100, 0) if platform_cost_crore > 0 else 0

    return {
        "summary": {
            "annual_savings_crore": round(total_value_crore, 1),
            "net_benefit_crore": net_benefit_crore,
            "platform_cost_crore": platform_cost_crore,
            "roi_pct": roi_pct,
            "tonnes_recovered_annually": round(total_recoverable, 0),
            "mines_monitored": len(MOIL_MINES),
            "early_detection_months": EARLY_DETECTION_MONTHS,
        },
        "without_mangalens": without_mangalens,
        "with_mangalens": with_mangalens,
        "mine_breakdown": mine_details,
    }
