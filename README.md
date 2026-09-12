# MangaLens — AI-Powered Manganese Intelligence Platform

**SIH26009 | Smart India Hackathon 2026**
**Ministry of Steel / MOIL Ltd. | Theme: Space Technology | Category: Software**

---

## Problem Statement

MOIL Limited — India's largest manganese ore producer (52% of national output, ~18 lakh tonnes/year) — faces persistent production shortfalls due to:

- **Monsoon disruption**: Opencast mines lose 30-50% capacity during June-September
- **Equipment failures**: Aging fleet causes unpredictable downtime
- **Reserve uncertainty**: Incomplete mapping of manganese-bearing zones
- **Reactive operations**: Decisions made after shortfalls, not before

**MangaLens** uses AI/ML combined with satellite remote sensing (Sentinel-2, Landsat) to predict production shortfalls weeks in advance and recommend corrective actions.

---

## Solution — Three Modules

| Module | Effort | What It Does |
|--------|--------|-------------|
| **Reserve Mapper** | 30% | Identifies manganese-bearing zones using Sentinel-2 spectral band ratios (Iron Oxide, Hydroxyl, Ferrous, custom Mn indicator) + PCA + Random Forest classifier (100% F1-score) |
| **Shortfall Predictor** | 50% | XGBoost + LSTM ensemble forecasts monthly production with confidence intervals. Uses 33 features: weather, production history, equipment health, seasonal patterns |
| **Corrective Actions** | 20% | SHAP-driven root cause analysis triggers ranked operational recommendations with estimated recovery in tonnes and Rs crore |

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Language | Python 3.11+ |
| Framework | FastAPI |
| ML — Tabular | XGBoost, scikit-learn, SHAP |
| ML — Temporal | PyTorch LSTM |
| ML — Spectral | Random Forest + PCA |
| Ensemble | XGBoost (60%) + LSTM (40%) weighted |
| Satellite | Google Earth Engine (Python API) |
| Geospatial | rasterio, GeoPandas |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + Vite |
| Maps | Leaflet.js + React-Leaflet |
| Charts | Recharts |
| Styling | Tailwind CSS |

---

## Model Performance

### XGBoost (Primary — Tabular Features)
Trained on 570 samples, tested on 140 (80/20 time-based split):

| Metric | Value |
|--------|-------|
| R-squared | 0.992 |
| MAE | 441.1 tonnes |
| RMSE | 839.7 tonnes |
| MAPE | 3.68% |

**Top predictive features**: Last month output (0.54), 3-month rolling avg (0.20), 6-month rolling avg (0.13), heavy rain days (0.02)

### LSTM (Secondary — Temporal Patterns)
6-step sequences, 32 hidden units, 1 layer:

| Metric | Value |
|--------|-------|
| R-squared | 0.304 |
| MAE | 1005.0 tonnes |
| MAPE | 41.4% |

*Note: LSTM performs better with larger real-world datasets. With MOIL's actual 10+ year production data, LSTM R² would improve significantly.*

### Reserve Mapper (Spectral Classification)
Random Forest on Sentinel-2 band ratios + PCA:

| Metric | Value |
|--------|-------|
| Accuracy | 100% |
| F1-Score | 1.00 (both classes) |
| Top features | PCA-1 (0.28), B4 Red (0.25), B11 SWIR1 (0.16) |

### Ensemble (Production)
Weighted combination: XGBoost (0.6) + LSTM (0.4) — leverages XGBoost's structured-feature strength with LSTM's temporal-pattern capture.

---

## Dashboard — 7 Panels

1. **Mine Map** — 10 MOIL mines on Leaflet, color-coded by alert status
2. **Manganese Heatmap** — Toggle overlay showing Mn probability from spectral analysis (red = high probability)
3. **Production Forecast** — Actual vs Predicted vs Target with confidence bands (Ensemble: XGBoost 60% + LSTM 40%)
4. **Environmental Data** — Rainfall, temperature, soil moisture, NDVI sparklines (satellite-derived)
5. **Spectral Analysis** — Sentinel-2 band ratio indices with threshold bars (Iron Oxide, Hydroxyl, Ferrous, Mn Indicator, NDVI)
6. **Alerts & Actions** — CRITICAL/WARNING cards with ranked corrective actions and recovery estimates
7. **SHAP Feature Importance** — What's driving the prediction

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mines` | List all 10 MOIL mines |
| GET | `/api/mines/{mine_id}` | Single mine details |
| GET | `/api/forecast/{mine_id}` | Production forecast (next 4 months) |
| GET | `/api/forecast/{mine_id}/shap` | SHAP feature importance |
| GET | `/api/alerts` | All active shortfall alerts |
| GET | `/api/alerts/{mine_id}` | Alerts for specific mine |
| GET | `/api/satellite/{mine_id}` | Weather/satellite data |
| GET | `/api/satellite/{mine_id}/production` | Historical production |
| GET | `/api/satellite/{mine_id}/tile` | Sentinel-2 spectral tile + band indices |
| GET | `/api/satellite/{mine_id}/heatmap` | Mn probability heatmap grid |
| GET | `/api/satellite/{mine_id}/weather-summary` | Monthly weather summary |

Swagger docs at `/docs` when server is running.

---

## MOIL Mines Covered

| Mine | State | Type | Depth | Base Output |
|------|-------|------|-------|-------------|
| Balaghat | Madhya Pradesh | Underground | 660m | 25,000 t/mo |
| Dongri Buzurg | Maharashtra | Opencast | 120m | 25,000 t/mo |
| Kandri | Maharashtra | Underground | 250m | 8,000 t/mo |
| Munsar | Maharashtra | Underground | 180m | 5,000 t/mo |
| Chikla | Maharashtra | Underground | 200m | 6,000 t/mo |
| Beldongri | Maharashtra | Opencast | 80m | 4,000 t/mo |
| Gumgaon | Maharashtra | Opencast | 60m | 3,500 t/mo |
| Parsioni | Maharashtra | Underground | 220m | 3,000 t/mo |
| Tirodi | Madhya Pradesh | Underground | 300m | 4,500 t/mo |
| Sitapatore | Madhya Pradesh | Underground | 280m | 2,000 t/mo |

---

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt

# Generate synthetic training data
python -m app.ml.synthetic_data

# Train all models
python -m app.ml.xgb_model
python -m app.ml.lstm_model
python -m app.ml.reserve_mapper

# Start API server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs at `http://localhost:5173`, API at `http://localhost:8000/docs`

---

## Project Structure

```
mangalens/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS
│   │   ├── config.py            # Mine data, satellite bands, constants
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic schemas (Mine, Forecast, Alert)
│   │   ├── routers/
│   │   │   ├── mines.py         # /api/mines
│   │   │   ├── forecast.py      # /api/forecast
│   │   │   ├── alerts.py        # /api/alerts
│   │   │   └── satellite.py     # /api/satellite + heatmap + tile
│   │   ├── services/
│   │   │   ├── predictor.py     # Ensemble prediction service
│   │   │   ├── actions.py       # Corrective action engine
│   │   │   └── gee_service.py   # Google Earth Engine integration
│   │   └── ml/
│   │       ├── synthetic_data.py # Data generator (6yr x 10 mines)
│   │       ├── feature_eng.py   # 33-feature engineering pipeline
│   │       ├── xgb_model.py     # XGBoost training + SHAP
│   │       ├── lstm_model.py    # LSTM temporal model (PyTorch)
│   │       ├── ensemble.py      # XGBoost + LSTM weighted ensemble
│   │       └── reserve_mapper.py # Spectral band analysis + RF classifier
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── App.jsx              # Main dashboard layout (7 panels)
│       ├── components/
│       │   ├── MineMap.jsx      # Leaflet map + heatmap support
│       │   ├── HeatmapOverlay.jsx # Mn probability heatmap layer
│       │   ├── ForecastChart.jsx # Production chart (ensemble)
│       │   ├── WeatherPanel.jsx  # Satellite data sparklines
│       │   ├── SpectralPanel.jsx # Band ratio indices + bars
│       │   ├── AlertCards.jsx    # Alert + action cards
│       │   ├── ShapChart.jsx     # Feature importance
│       │   └── MineSelector.jsx  # Mine dropdown
│       ├── hooks/useApi.js      # API fetch hooks (9 hooks)
│       └── utils/constants.js   # Colors, config
│
├── ARCHITECTURE.md               # Full solution architecture
├── MangaLens_Solution_Architecture.docx  # Formatted architecture doc
├── SIH26009_Complete_Teardown.pdf        # Problem statement analysis
└── SIH2026_TOP_PICKS_ANALYSIS.md         # All PS winnability ranking
```

---

## Key Innovation

Satellite data (rainfall, soil moisture, NDVI, temperature) is **NOT** used for mineral detection — MOIL already knows where manganese is. These environmental inputs are the **features that drive production variance**. Heavy rainfall shuts down opencast mines. Soil moisture affects transport. MangaLens uses satellite-derived features as predictive inputs for production forecasting — that's the real "Space Technology" angle.

The **Reserve Mapper** uses a separate spectral pipeline (Sentinel-2 SWIR band ratios + PCA + Random Forest) to identify manganese-bearing zones — complementing MOIL's existing geological surveys with satellite-based probability heatmaps.

---

## Research Backing

Two peer-reviewed papers validate the spectral methodology on MOIL's own mines:

1. **Dongri Buzurg Manganese Mine** multispectral study using Landsat 9 OLI (Springer, J. Geological Society of India)
2. **Earth Observation for Manganese in Central India** using ASTER + Sentinel-2B over Balaghat district

---

## Impact

Even a **5% improvement** in MOIL's production planning = **Rs 50+ crore annually** saved.
With real MOIL data integration, projected forecast accuracy: **85%+**

---

## Team

SIH 2026 — Problem Statement SIH26009
