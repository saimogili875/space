"""
Reserve Mapper: Spectral band ratio analysis for manganese mineral identification.
Uses Sentinel-2 band ratios + PCA + Random Forest to produce probability heatmaps.

For hackathon demo, generates synthetic spectral data around known MOIL mine locations
to demonstrate the pipeline. With real GEE access, this pulls actual Sentinel-2 tiles.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import json
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.config import MOIL_MINES, SYNTHETIC_DIR, BAND_RATIOS


def generate_synthetic_spectral_data(n_samples_per_mine: int = 200, grid_size: float = 0.05):
    """
    Generate synthetic spectral data around mine locations.
    Positive samples (manganese) near mines, negative samples further away.
    """
    records = []
    np.random.seed(42)

    for mine_id, mine in MOIL_MINES.items():
        lat, lon = mine["lat"], mine["lon"]
        grade = mine["ore_grade_pct"] / 100.0

        # Positive samples: near the mine (within ~2km)
        for _ in range(n_samples_per_mine):
            offset_lat = np.random.normal(0, 0.005)
            offset_lon = np.random.normal(0, 0.005)

            # Spectral signatures for manganese-bearing rock
            b2_blue = np.random.uniform(0.04, 0.08)
            b3_green = np.random.uniform(0.05, 0.10)
            b4_red = np.random.uniform(0.08, 0.15) * (1 + grade * 0.5)
            b8_nir = np.random.uniform(0.15, 0.30)
            b11_swir1 = np.random.uniform(0.20, 0.40) * (1 + grade * 0.3)
            b12_swir2 = np.random.uniform(0.15, 0.35) * (1 + grade * 0.2)

            iron_oxide = b4_red / b2_blue
            hydroxyl = b11_swir1 / b12_swir2
            ferrous = b12_swir2 / b8_nir
            mn_indicator = (b11_swir1 + b12_swir2) / b8_nir

            records.append({
                "mine_id": mine_id,
                "lat": lat + offset_lat,
                "lon": lon + offset_lon,
                "B2": round(b2_blue, 4),
                "B3": round(b3_green, 4),
                "B4": round(b4_red, 4),
                "B8": round(b8_nir, 4),
                "B11": round(b11_swir1, 4),
                "B12": round(b12_swir2, 4),
                "iron_oxide_index": round(iron_oxide, 4),
                "hydroxyl_index": round(hydroxyl, 4),
                "ferrous_index": round(ferrous, 4),
                "mn_indicator": round(mn_indicator, 4),
                "label": 1,
            })

        # Negative samples: further from mine (5-20km)
        for _ in range(n_samples_per_mine):
            angle = np.random.uniform(0, 2 * np.pi)
            dist = np.random.uniform(0.05, 0.20)
            offset_lat = dist * np.cos(angle)
            offset_lon = dist * np.sin(angle)

            # Non-manganese spectral signatures (soil, vegetation, water)
            b2_blue = np.random.uniform(0.03, 0.12)
            b3_green = np.random.uniform(0.04, 0.15)
            b4_red = np.random.uniform(0.04, 0.10)
            b8_nir = np.random.uniform(0.10, 0.45)
            b11_swir1 = np.random.uniform(0.08, 0.25)
            b12_swir2 = np.random.uniform(0.05, 0.20)

            iron_oxide = b4_red / b2_blue
            hydroxyl = b11_swir1 / b12_swir2
            ferrous = b12_swir2 / b8_nir
            mn_indicator = (b11_swir1 + b12_swir2) / b8_nir

            records.append({
                "mine_id": mine_id,
                "lat": lat + offset_lat,
                "lon": lon + offset_lon,
                "B2": round(b2_blue, 4),
                "B3": round(b3_green, 4),
                "B4": round(b4_red, 4),
                "B8": round(b8_nir, 4),
                "B11": round(b11_swir1, 4),
                "B12": round(b12_swir2, 4),
                "iron_oxide_index": round(iron_oxide, 4),
                "hydroxyl_index": round(hydroxyl, 4),
                "ferrous_index": round(ferrous, 4),
                "mn_indicator": round(mn_indicator, 4),
                "label": 0,
            })

    return pd.DataFrame(records)


SPECTRAL_FEATURES = [
    "B2", "B3", "B4", "B8", "B11", "B12",
    "iron_oxide_index", "hydroxyl_index", "ferrous_index", "mn_indicator",
]


def train_reserve_model(save: bool = True) -> dict:
    print("Generating synthetic spectral data...")
    df = generate_synthetic_spectral_data()

    if save:
        df.to_csv(SYNTHETIC_DIR / "spectral.csv", index=False)
        print(f"  -> {len(df)} samples saved to spectral.csv")

    # PCA on SWIR bands
    swir_cols = ["B11", "B12", "B8"]
    pca = PCA(n_components=2)
    pca_features = pca.fit_transform(df[swir_cols])
    df["pca_1"] = pca_features[:, 0]
    df["pca_2"] = pca_features[:, 1]

    feature_cols = SPECTRAL_FEATURES + ["pca_1", "pca_2"]
    X = df[feature_cols]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\n=== Reserve Mapper Classification Report ===")
    print(classification_report(y_test, y_pred, target_names=["Non-Mn", "Manganese"]))

    # Feature importance
    importance = dict(zip(feature_cols, model.feature_importances_))
    importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
    print("Top spectral features:")
    for feat, imp in list(importance.items())[:5]:
        print(f"  {feat}: {imp:.4f}")

    # Generate probability heatmap data for each mine
    heatmap_data = generate_heatmaps(model, pca, df)

    if save:
        import pickle
        with open(SYNTHETIC_DIR / "reserve_model.pkl", "wb") as f:
            pickle.dump({"model": model, "pca": pca}, f)
        with open(SYNTHETIC_DIR / "heatmap_data.json", "w") as f:
            json.dump(heatmap_data, f)
        print(f"\nReserve model and heatmaps saved.")

    accuracy = (y_pred == y_test).mean()
    return {"accuracy": round(accuracy, 4), "importance": importance, "heatmap_data": heatmap_data}


def generate_heatmaps(model, pca, df: pd.DataFrame) -> dict:
    """Generate probability grid for each mine region."""
    heatmaps = {}

    for mine_id, mine in MOIL_MINES.items():
        lat, lon = mine["lat"], mine["lon"]

        # Create a grid around the mine
        grid_points = []
        lats, lons = [], []
        for dlat in np.arange(-0.08, 0.08, 0.004):
            for dlon in np.arange(-0.08, 0.08, 0.004):
                plat, plon = lat + dlat, lon + dlon
                lats.append(plat)
                lons.append(plon)

                dist = np.sqrt(dlat**2 + dlon**2)
                mine_df = df[df["mine_id"] == mine_id]

                if len(mine_df) > 0:
                    nearby = mine_df.iloc[np.random.randint(0, len(mine_df))]
                    noise = np.random.normal(0, 0.02 + dist * 0.5)
                    grid_points.append({col: nearby[col] + noise for col in SPECTRAL_FEATURES})
                else:
                    grid_points.append({col: np.random.uniform(0.05, 0.3) for col in SPECTRAL_FEATURES})

        grid_df = pd.DataFrame(grid_points)

        swir_cols = ["B11", "B12", "B8"]
        pca_feats = pca.transform(grid_df[swir_cols])
        grid_df["pca_1"] = pca_feats[:, 0]
        grid_df["pca_2"] = pca_feats[:, 1]

        feature_cols = SPECTRAL_FEATURES + ["pca_1", "pca_2"]
        probabilities = model.predict_proba(grid_df[feature_cols])[:, 1]

        points = []
        for i in range(len(lats)):
            if probabilities[i] > 0.1:
                points.append({
                    "lat": round(lats[i], 5),
                    "lon": round(lons[i], 5),
                    "probability": round(float(probabilities[i]), 3),
                })

        heatmaps[mine_id] = {
            "mine_name": mine["name"],
            "center": {"lat": lat, "lon": lon},
            "points": points,
            "avg_probability": round(float(np.mean(probabilities)), 3),
            "high_prob_area_pct": round(float((probabilities > 0.7).mean() * 100), 1),
        }

    return heatmaps


if __name__ == "__main__":
    result = train_reserve_model(save=True)
    print(f"\nOverall accuracy: {result['accuracy']}")
    for mine_id, data in result["heatmap_data"].items():
        print(f"  {data['mine_name']}: avg prob={data['avg_probability']}, high-prob area={data['high_prob_area_pct']}%")
