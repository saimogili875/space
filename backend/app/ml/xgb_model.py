"""
XGBoost production forecasting model with SHAP explanations.
"""

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import pickle
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.config import MODEL_DIR
from app.ml.feature_eng import build_features, FEATURE_COLS, TARGET_COL


def train_model(save: bool = True) -> dict:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    df = build_features()

    df = df.sort_values("date")
    split_date = df["date"].quantile(0.8)
    train = df[df["date"] <= split_date]
    test = df[df["date"] > split_date]

    X_train = train[FEATURE_COLS].fillna(0)
    y_train = train[TARGET_COL]
    X_test = test[FEATURE_COLS].fillna(0)
    y_test = test[TARGET_COL]

    model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    y_pred = model.predict(X_test)

    metrics = {
        "mae": round(mean_absolute_error(y_test, y_pred), 1),
        "rmse": round(np.sqrt(mean_squared_error(y_test, y_pred)), 1),
        "r2": round(r2_score(y_test, y_pred), 4),
        "mape": round(np.mean(np.abs((y_test - y_pred) / y_test)) * 100, 2),
        "train_size": len(train),
        "test_size": len(test),
    }

    print("\n=== Model Metrics ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    # Feature importance
    importance = dict(zip(FEATURE_COLS, model.feature_importances_))
    importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
    print("\n=== Top 10 Features ===")
    for feat, imp in list(importance.items())[:10]:
        print(f"  {feat}: {imp:.4f}")

    if save:
        with open(MODEL_DIR / "xgb_model.pkl", "wb") as f:
            pickle.dump(model, f)
        with open(MODEL_DIR / "metrics.pkl", "wb") as f:
            pickle.dump(metrics, f)
        print(f"\nModel saved to {MODEL_DIR / 'xgb_model.pkl'}")

    return {"model": model, "metrics": metrics, "importance": importance}


def load_model():
    with open(MODEL_DIR / "xgb_model.pkl", "rb") as f:
        return pickle.load(f)


def predict(model, features_df: pd.DataFrame) -> np.ndarray:
    X = features_df[FEATURE_COLS].fillna(0)
    return model.predict(X)


def get_shap_values(model, features_df: pd.DataFrame) -> list[dict]:
    try:
        import shap
        X = features_df[FEATURE_COLS].fillna(0)
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)

        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        feature_shap = sorted(
            zip(FEATURE_COLS, mean_abs_shap),
            key=lambda x: x[1],
            reverse=True,
        )
        return [
            {
                "feature": feat,
                "importance": round(float(val), 4),
                "direction": "increases" if val > 0 else "decreases",
            }
            for feat, val in feature_shap[:15]
        ]
    except ImportError:
        importance = dict(zip(FEATURE_COLS, model.feature_importances_))
        importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
        return [
            {"feature": feat, "importance": round(float(val), 4), "direction": "unknown"}
            for feat, val in importance[:15]
        ]


if __name__ == "__main__":
    result = train_model(save=True)
