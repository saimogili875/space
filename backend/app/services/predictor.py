"""
Prediction service: loads trained model, generates forecasts, alerts, and SHAP values.
"""

import numpy as np
import pandas as pd
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import MOIL_MINES, MODEL_DIR, SYNTHETIC_DIR
from app.models.schemas import ProductionForecast, Alert, AlertLevel
from app.ml.feature_eng import build_features, FEATURE_COLS
from app.ml.xgb_model import load_model, predict, get_shap_values
from app.services.actions import generate_actions


class PredictionService:
    def __init__(self):
        self._model = None
        self._features_df = None

    @property
    def model(self):
        if self._model is None:
            self._model = load_model()
        return self._model

    @property
    def features_df(self):
        if self._features_df is None:
            self._features_df = build_features()
        return self._features_df

    def get_forecast(self, mine_id: str, periods: int = 4) -> list[ProductionForecast]:
        df = self.features_df
        mine_df = df[df["mine_id"] == mine_id].sort_values("date").tail(periods)

        if mine_df.empty:
            return []

        predictions = predict(self.model, mine_df)
        shap_features = get_shap_values(self.model, mine_df)

        forecasts = []
        for i, (_, row) in enumerate(mine_df.iterrows()):
            pred = float(predictions[i])
            target = float(row["target_tonnes"])
            shortfall_pct = (pred - target) / target * 100

            std_estimate = pred * 0.08
            confidence_lower = pred - 1.96 * std_estimate
            confidence_upper = pred + 1.96 * std_estimate

            if shortfall_pct < -10:
                alert_level = AlertLevel.CRITICAL
            elif shortfall_pct < -5:
                alert_level = AlertLevel.WARNING
            else:
                alert_level = AlertLevel.ON_TRACK

            forecasts.append(ProductionForecast(
                mine_id=mine_id,
                period=row["date"].strftime("%Y-%m"),
                predicted_tonnes=round(pred, 0),
                target_tonnes=round(target, 0),
                shortfall_pct=round(shortfall_pct, 2),
                alert_level=alert_level,
                confidence_lower=round(confidence_lower, 0),
                confidence_upper=round(confidence_upper, 0),
                top_factors=shap_features[:5],
            ))

        return forecasts

    def get_alerts(self, mine_id: str = None) -> list[Alert]:
        mines = [mine_id] if mine_id else list(MOIL_MINES.keys())
        alerts = []

        for mid in mines:
            forecasts = self.get_forecast(mid, periods=4)
            for fc in forecasts:
                if fc.alert_level in (AlertLevel.CRITICAL, AlertLevel.WARNING):
                    shortfall_tonnes = (fc.shortfall_pct / 100) * fc.target_tonnes
                    mine_info = MOIL_MINES.get(mid, {})

                    actions = generate_actions(
                        shortfall_tonnes=shortfall_tonnes,
                        alert_level=fc.alert_level,
                        top_features=fc.top_factors,
                        mine_type=mine_info.get("type", "underground"),
                    )

                    alerts.append(Alert(
                        mine_id=mid,
                        mine_name=mine_info.get("name", mid),
                        period=fc.period,
                        alert_level=fc.alert_level,
                        shortfall_pct=fc.shortfall_pct,
                        primary_cause=fc.top_factors[0]["feature"] if fc.top_factors else "unknown",
                        actions=actions,
                    ))

        alerts.sort(key=lambda a: (0 if a.alert_level == AlertLevel.CRITICAL else 1, a.shortfall_pct))
        return alerts

    def get_shap(self, mine_id: str) -> list[dict]:
        df = self.features_df
        mine_df = df[df["mine_id"] == mine_id].sort_values("date").tail(6)
        if mine_df.empty:
            return []
        return get_shap_values(self.model, mine_df)
