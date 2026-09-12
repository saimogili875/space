"""
LSTM model for time-series production forecasting.
Captures temporal dependencies (monsoon cycles, seasonal patterns)
that XGBoost handles less naturally.
"""

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
import pickle
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.config import MODEL_DIR
from app.ml.feature_eng import build_features, FEATURE_COLS, TARGET_COL


SEQUENCE_LENGTH = 6
HIDDEN_SIZE = 32
NUM_LAYERS = 1
BATCH_SIZE = 16
EPOCHS = 300
LEARNING_RATE = 0.005


class ProductionLSTM(nn.Module):
    def __init__(self, input_size, hidden_size=HIDDEN_SIZE, num_layers=NUM_LAYERS):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
        )

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_hidden = lstm_out[:, -1, :]
        return self.fc(last_hidden).squeeze(-1)


def prepare_sequences(df: pd.DataFrame):
    """Prepare per-mine sequences with both feature and target scaling."""
    all_X, all_y = [], []
    feature_scaler = StandardScaler()
    target_scaler = StandardScaler()

    df = df.sort_values(["mine_id", "date"])

    features_all = df[FEATURE_COLS].fillna(0).values
    targets_all = df[TARGET_COL].values.reshape(-1, 1)
    feature_scaler.fit(features_all)
    target_scaler.fit(targets_all)

    for mine_id in df["mine_id"].unique():
        mine_df = df[df["mine_id"] == mine_id].sort_values("date")
        if len(mine_df) < SEQUENCE_LENGTH + 1:
            continue

        X = feature_scaler.transform(mine_df[FEATURE_COLS].fillna(0).values)
        y = target_scaler.transform(mine_df[TARGET_COL].values.reshape(-1, 1)).flatten()

        for i in range(len(X) - SEQUENCE_LENGTH):
            all_X.append(X[i:i + SEQUENCE_LENGTH])
            all_y.append(y[i + SEQUENCE_LENGTH])

    return np.array(all_X), np.array(all_y), feature_scaler, target_scaler


def train_model(save: bool = True) -> dict:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    df = build_features()

    X_seq, y_seq, feature_scaler, target_scaler = prepare_sequences(df)

    split = int(len(X_seq) * 0.8)
    X_train, X_test = X_seq[:split], X_seq[split:]
    y_train, y_test = y_seq[:split], y_seq[split:]

    model = ProductionLSTM(input_size=len(FEATURE_COLS))
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=20, factor=0.5)
    criterion = nn.MSELoss()

    X_train_t = torch.FloatTensor(X_train)
    y_train_t = torch.FloatTensor(y_train)
    X_test_t = torch.FloatTensor(X_test)
    y_test_t = torch.FloatTensor(y_test)

    best_val_loss = float("inf")
    patience_counter = 0
    best_state = None

    for epoch in range(EPOCHS):
        model.train()
        indices = torch.randperm(len(X_train_t))

        epoch_loss = 0.0
        n_batches = 0

        for start in range(0, len(indices), BATCH_SIZE):
            batch_idx = indices[start:start + BATCH_SIZE]
            X_batch = X_train_t[batch_idx]
            y_batch = y_train_t[batch_idx]

            optimizer.zero_grad()
            pred = model(X_batch)
            loss = criterion(pred, y_batch)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            epoch_loss += loss.item()
            n_batches += 1

        model.eval()
        with torch.no_grad():
            val_pred = model(X_test_t)
            val_loss = criterion(val_pred, y_test_t).item()

        scheduler.step(val_loss)

        if (epoch + 1) % 50 == 0:
            print(f"  Epoch {epoch+1}/{EPOCHS} — Train: {epoch_loss/n_batches:.4f}, Val: {val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            patience_counter += 1
            if patience_counter >= 40:
                print(f"  Early stopping at epoch {epoch+1}")
                break

    model.load_state_dict(best_state)
    model.eval()

    with torch.no_grad():
        y_pred_scaled = model(X_test_t).numpy()

    y_pred = target_scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
    y_actual = target_scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()

    mae = np.mean(np.abs(y_actual - y_pred))
    rmse = np.sqrt(np.mean((y_actual - y_pred) ** 2))
    ss_res = np.sum((y_actual - y_pred) ** 2)
    ss_tot = np.sum((y_actual - np.mean(y_actual)) ** 2)
    r2 = 1 - ss_res / ss_tot
    mape = np.mean(np.abs((y_actual - y_pred) / np.maximum(y_actual, 1))) * 100

    metrics = {
        "mae": round(float(mae), 1),
        "rmse": round(float(rmse), 1),
        "r2": round(float(r2), 4),
        "mape": round(float(mape), 2),
        "train_size": len(X_train),
        "test_size": len(X_test),
    }

    print("\n=== LSTM Model Metrics ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    if save:
        torch.save(model.state_dict(), MODEL_DIR / "lstm_model.pt")
        with open(MODEL_DIR / "lstm_scaler.pkl", "wb") as f:
            pickle.dump({"feature_scaler": feature_scaler, "target_scaler": target_scaler}, f)
        with open(MODEL_DIR / "lstm_metrics.pkl", "wb") as f:
            pickle.dump(metrics, f)
        print(f"\nLSTM model saved to {MODEL_DIR / 'lstm_model.pt'}")

    return {"model": model, "scalers": {"feature_scaler": feature_scaler, "target_scaler": target_scaler}, "metrics": metrics}


def load_model():
    model = ProductionLSTM(input_size=len(FEATURE_COLS))
    model.load_state_dict(torch.load(MODEL_DIR / "lstm_model.pt", weights_only=True))
    model.eval()
    with open(MODEL_DIR / "lstm_scaler.pkl", "rb") as f:
        scalers = pickle.load(f)
    if isinstance(scalers, dict):
        return model, scalers["feature_scaler"], scalers["target_scaler"]
    return model, scalers, None


def predict(model, feature_scaler, target_scaler, features_df: pd.DataFrame) -> np.ndarray:
    X = features_df[FEATURE_COLS].fillna(0).values
    X_scaled = feature_scaler.transform(X)

    if len(X_scaled) < SEQUENCE_LENGTH:
        pad_size = SEQUENCE_LENGTH - len(X_scaled)
        padding = np.repeat(X_scaled[:1], pad_size, axis=0)
        X_scaled = np.vstack([padding, X_scaled])

    sequences = []
    for i in range(max(1, len(X_scaled) - SEQUENCE_LENGTH + 1)):
        sequences.append(X_scaled[i:i + SEQUENCE_LENGTH])

    X_tensor = torch.FloatTensor(np.array(sequences))

    with torch.no_grad():
        predictions_scaled = model(X_tensor).numpy()

    if target_scaler is not None:
        predictions = target_scaler.inverse_transform(predictions_scaled.reshape(-1, 1)).flatten()
    else:
        predictions = predictions_scaled

    if len(predictions) > len(features_df):
        predictions = predictions[-len(features_df):]

    return predictions


if __name__ == "__main__":
    result = train_model(save=True)
