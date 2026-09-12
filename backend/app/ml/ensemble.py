"""
Ensemble model: weighted combination of XGBoost (tabular) + LSTM (temporal).
XGBoost weight: 0.6 (more reliable on structured features)
LSTM weight: 0.4 (better at capturing temporal patterns)
"""

import numpy as np
import pandas as pd
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.ml import xgb_model, lstm_model
from app.ml.feature_eng import FEATURE_COLS

XGB_WEIGHT = 0.6
LSTM_WEIGHT = 0.4


class EnsemblePredictor:
    def __init__(self):
        self._xgb = None
        self._lstm = None
        self._feature_scaler = None
        self._target_scaler = None

    def load(self):
        self._xgb = xgb_model.load_model()
        self._lstm, self._feature_scaler, self._target_scaler = lstm_model.load_model()

    @property
    def xgb(self):
        if self._xgb is None:
            self._xgb = xgb_model.load_model()
        return self._xgb

    @property
    def lstm(self):
        if self._lstm is None:
            self._lstm, self._feature_scaler, self._target_scaler = lstm_model.load_model()
        return self._lstm

    @property
    def feature_scaler(self):
        if self._feature_scaler is None:
            self._lstm, self._feature_scaler, self._target_scaler = lstm_model.load_model()
        return self._feature_scaler

    @property
    def target_scaler(self):
        if self._target_scaler is None:
            self._lstm, self._feature_scaler, self._target_scaler = lstm_model.load_model()
        return self._target_scaler

    def predict(self, features_df: pd.DataFrame) -> np.ndarray:
        xgb_pred = xgb_model.predict(self.xgb, features_df)
        lstm_pred = lstm_model.predict(self.lstm, self.feature_scaler, self.target_scaler, features_df)

        n = min(len(xgb_pred), len(lstm_pred))
        xgb_pred = xgb_pred[:n]
        lstm_pred = lstm_pred[:n]

        ensemble_pred = XGB_WEIGHT * xgb_pred + LSTM_WEIGHT * lstm_pred
        return ensemble_pred

    def predict_with_breakdown(self, features_df: pd.DataFrame) -> dict:
        xgb_pred = xgb_model.predict(self.xgb, features_df)
        lstm_pred = lstm_model.predict(self.lstm, self.feature_scaler, self.target_scaler, features_df)

        n = min(len(xgb_pred), len(lstm_pred))
        xgb_pred = xgb_pred[:n]
        lstm_pred = lstm_pred[:n]

        return {
            "xgboost": xgb_pred,
            "lstm": lstm_pred,
            "ensemble": XGB_WEIGHT * xgb_pred + LSTM_WEIGHT * lstm_pred,
            "weights": {"xgboost": XGB_WEIGHT, "lstm": LSTM_WEIGHT},
        }

    def get_shap(self, features_df: pd.DataFrame) -> list[dict]:
        return xgb_model.get_shap_values(self.xgb, features_df)


if __name__ == "__main__":
    from app.ml.feature_eng import build_features

    df = build_features()
    test_df = df[df["mine_id"] == "balaghat"].sort_values("date").tail(4)

    ensemble = EnsemblePredictor()
    result = ensemble.predict_with_breakdown(test_df)

    print("=== Ensemble Predictions (Balaghat, last 4 months) ===")
    print(f"  XGBoost:  {np.round(result['xgboost'])}")
    print(f"  LSTM:     {np.round(result['lstm'])}")
    print(f"  Ensemble: {np.round(result['ensemble'])}")
    print(f"  Weights:  XGB={XGB_WEIGHT}, LSTM={LSTM_WEIGHT}")
