# SIH26009 — Solution Architecture & Tech Stack

## Product Name: **MangaLens** — AI-Powered Manganese Intelligence Platform

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MangaLens Architecture                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  SPACE DATA   │  │  GROUND DATA  │  │  OPERATIONAL DATA    │  │
│  │  PIPELINE     │  │  PIPELINE     │  │  PIPELINE            │  │
│  │              │  │              │  │                      │  │
│  │ Sentinel-2   │  │ GSI Maps     │  │ Production Records   │  │
│  │ Landsat 8/9  │  │ Drill Logs   │  │ Equipment Status     │  │
│  │ SRTM DEM     │  │ MOIL Reports │  │ Blasting Schedule    │  │
│  │ IMD Rainfall │  │ Soil Surveys │  │ Maintenance Logs     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              DATA LAKE (PostgreSQL + PostGIS)               │ │
│  │        Time-series store  |  Geospatial store               │ │
│  └────────────────────┬───────────────────────────────────────┘ │
│                       │                                         │
│         ┌─────────────┼─────────────┐                          │
│         ▼             ▼             ▼                          │
│  ┌────────────┐ ┌───────────┐ ┌──────────────┐               │
│  │  MODULE 1   │ │  MODULE 2  │ │   MODULE 3   │               │
│  │  Reserve    │ │  Shortfall │ │  Corrective  │               │
│  │  Mapper     │ │  Predictor │ │  Actions     │               │
│  │            │ │           │ │              │               │
│  │ Spectral   │ │ XGBoost + │ │ Rule Engine  │               │
│  │ Analysis + │ │ LSTM      │ │ + Optimizer  │               │
│  │ ML         │ │           │ │              │               │
│  └─────┬──────┘ └─────┬─────┘ └──────┬───────┘               │
│        │              │              │                         │
│        ▼              ▼              ▼                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   DASHBOARD (React + Mapbox/Leaflet)        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │ │
│  │  │ Reserve  │ │Production│ │ Weather  │ │  Corrective  │ │ │
│  │  │ Heatmap  │ │ Forecast │ │ Overlay  │ │  Actions     │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Breakdown

### Module 1: Reserve Mapper (30% effort)

**Goal:** Identify and map manganese-bearing zones using satellite spectral analysis.

**Method:**
1. Pull Sentinel-2 multispectral tiles for MOIL mine regions (Balaghat + Nagpur belt)
2. Compute band ratios known to highlight manganese/iron oxide minerals:
   - Iron Oxide Index: Band 4 / Band 2
   - Hydroxyl/Clay Index: Band 11 / Band 12
   - Ferrous Minerals: Band 12 / Band 8 + Band 3 / Band 2
   - Custom Mn indicator: (Band 11 + Band 12) / Band 8
3. Apply PCA (Principal Component Analysis) on SWIR bands to isolate mineral anomalies
4. Overlay with GSI geological maps as ground truth
5. Train Random Forest classifier on known mine locations vs barren zones
6. Output: Probability heatmap of manganese presence (0-1 score per pixel)

**Data Sources:**
- Sentinel-2 L2A (atmospherically corrected) via Google Earth Engine
- GSI Bhukosh geological maps for Balaghat/Nagpur
- MOIL mine boundary polygons (digitized from public maps)

**Key Libraries:**
- `ee` (Google Earth Engine Python API) — satellite data access + processing
- `rasterio` — raster I/O
- `scikit-learn` — Random Forest, PCA
- `numpy` — band math

---

### Module 2: Production Shortfall Predictor (50% effort — THIS IS THE CORE)

**Goal:** Predict monthly/weekly production vs target and flag shortfall risk.

**Input Features (per mine, per time period):**

| Feature Category | Features | Source |
|---|---|---|
| **Weather** | Rainfall (mm), soil moisture, land surface temp, NDVI | Sentinel-2, IMD, GEE |
| **Seasonal** | Month, monsoon flag, day of year | Calendar |
| **Production History** | Past 3/6/12 month output, rolling avg, YoY change | MOIL annual reports + synthetic daily |
| **Equipment** | Uptime %, maintenance due flag, age of equipment | Synthetic (based on industry patterns) |
| **Operational** | Blasting days available, shift count, transport capacity | Synthetic |
| **Geological** | Reserve quality score (from Module 1), depth, ore grade | GSI + Module 1 output |

**Model Architecture:**
```
Feature Engineering Pipeline
         │
         ├─→ XGBoost Regressor (tabular features → production tonnes)
         │     - Best for structured/tabular data
         │     - Built-in feature importance (judges love this)
         │     - Fast training, no GPU needed
         │
         ├─→ LSTM Network (sequential time-series → trend capture)
         │     - Captures temporal dependencies (monsoon patterns)
         │     - Input: 12-week sliding window
         │     - Hidden: 64 units, 2 layers
         │
         └─→ Ensemble (weighted average of XGBoost + LSTM predictions)
               - XGBoost weight: 0.6 (more reliable on tabular)
               - LSTM weight: 0.4 (better on trends)
               - Output: Predicted production + confidence interval
```

**Shortfall Detection:**
```python
shortfall_risk = (predicted_production - target_production) / target_production

if shortfall_risk < -0.10:    # >10% below target
    alert = "CRITICAL"
elif shortfall_risk < -0.05:  # 5-10% below target
    alert = "WARNING"
else:
    alert = "ON TRACK"
```

**Key Libraries:**
- `xgboost` — gradient boosted trees
- `tensorflow` or `pytorch` — LSTM implementation
- `pandas` — data manipulation
- `scikit-learn` — preprocessing, metrics, cross-validation

---

### Module 3: Corrective Action Engine (20% effort)

**Goal:** When shortfall is predicted, suggest specific actions.

**Logic (Rule-based + ML-ranked):**

```
IF shortfall predicted AND cause = "heavy_rainfall":
    → Suggest: "Shift production to underground mines (weather-resistant)"
    → Suggest: "Pre-stock ore from opencast mines before monsoon"

IF shortfall predicted AND cause = "equipment_downtime":
    → Suggest: "Deploy standby equipment from [Mine X]"
    → Suggest: "Expedite maintenance on [Equipment ID]"
    → Suggest: "Redistribute load to [Mine Y] with spare capacity"

IF shortfall predicted AND cause = "low_reserve_quality":
    → Suggest: "Switch extraction to Zone [N] (higher probability score)"
    → Suggest: "Increase blasting frequency in high-grade zone"

IF shortfall predicted AND cause = "transport_bottleneck":
    → Suggest: "Activate alternate transport route"
    → Suggest: "Increase dispatch frequency"
```

**Ranking:** Actions ranked by estimated impact (tonnes recovered) and implementation cost.

**Key Libraries:**
- Custom Python rule engine
- `scipy.optimize` — for resource reallocation optimization

---

## Tech Stack

### Backend
| Component | Technology | Why |
|---|---|---|
| **Language** | Python 3.11+ | ML ecosystem, GEE API, data science libs |
| **Web Framework** | FastAPI | Async, auto-docs (Swagger), modern Python |
| **Database** | PostgreSQL + PostGIS | Geospatial queries, time-series, mature |
| **Cache** | Redis | Cache satellite tiles, model predictions |
| **Task Queue** | Celery | Async satellite data fetching, model training |

### Frontend
| Component | Technology | Why |
|---|---|---|
| **Framework** | React 18 + Vite | Fast dev, component-based, massive ecosystem |
| **Maps** | Leaflet.js + React-Leaflet | Free, open-source, satellite tile overlays |
| **Charts** | Recharts or Chart.js | Production forecasts, trends, gauges |
| **UI Library** | Tailwind CSS + shadcn/ui | Fast prototyping, polished look |
| **State** | Zustand | Lightweight, simple |

### ML / Data Science
| Component | Technology | Why |
|---|---|---|
| **Satellite Processing** | Google Earth Engine (Python) | Pre-processed, no downloads needed |
| **Band Analysis** | rasterio + numpy | Spectral band math, PCA |
| **ML Framework** | scikit-learn + XGBoost | Tabular predictions, feature importance |
| **Deep Learning** | PyTorch (LSTM) | Time-series forecasting |
| **Geospatial** | GeoPandas + Shapely | Spatial analysis, overlay operations |
| **Visualization** | Folium (for backend maps) | Quick geospatial viz |

### Infrastructure (Hackathon)
| Component | Technology | Why |
|---|---|---|
| **Deployment** | Railway.app or Render | Free tier, instant deploy |
| **Frontend Hosting** | Vercel | Free, auto-deploy from Git |
| **File Storage** | Cloudinary or S3 (free tier) | Satellite image tiles |
| **Version Control** | GitHub | Standard |

---

## Data Flow

```
Step 1: INGEST (runs on startup + daily cron)
    Google Earth Engine API
        → Fetch Sentinel-2 tiles for MOIL mine AOIs
        → Compute NDVI, soil moisture, land surface temp
        → Compute spectral band ratios for mineral indicators
    IMD API
        → Fetch rainfall data for Balaghat + Nagpur districts
    Synthetic Data Generator
        → Generate realistic production + equipment data
        → Based on MOIL annual report figures

Step 2: PROCESS
    Reserve Mapper
        → Band ratio computation
        → PCA on SWIR bands
        → Random Forest classification
        → Output: GeoTIFF probability heatmap

    Feature Engineering
        → Merge weather + production + equipment features
        → Create lag features (t-1, t-7, t-30)
        → Create rolling averages
        → Encode categorical variables

Step 3: PREDICT
    XGBoost + LSTM Ensemble
        → Input: Engineered features
        → Output: Production forecast (next 4 weeks)
        → Confidence intervals
        → Feature importance (SHAP values)

    Shortfall Detector
        → Compare forecast vs target
        → Flag risk level (CRITICAL / WARNING / ON TRACK)

Step 4: RECOMMEND
    Corrective Action Engine
        → Identify root cause from top SHAP features
        → Match to action rules
        → Rank actions by impact
        → Output: Prioritized action list

Step 5: DISPLAY
    Dashboard
        → Mine map with reserve heatmap overlay
        → Production forecast charts
        → Weather correlation panels
        → Alert cards with corrective actions
        → Equipment health status
```

---

## Dashboard Layout (4-panel design)

```
┌─────────────────────────────────────────────────────────────┐
│  MangaLens    [Balaghat ▾]  [This Month ▾]  [Refresh]      │
├────────────────────────────────┬────────────────────────────┤
│                                │                            │
│   PANEL 1: MINE MAP            │   PANEL 2: PRODUCTION      │
│                                │   FORECAST                 │
│   Leaflet map showing:         │                            │
│   - MOIL mine locations        │   Line chart:              │
│   - Reserve probability        │   - Actual vs Predicted    │
│     heatmap overlay            │   - Target line            │
│   - Color: green=high,         │   - Confidence bands       │
│     red=low probability        │   - Shortfall risk zones   │
│   - Click mine → details       │     (red shading)          │
│                                │                            │
├────────────────────────────────┼────────────────────────────┤
│                                │                            │
│   PANEL 3: WEATHER +           │   PANEL 4: ALERTS +        │
│   ENVIRONMENTAL                │   CORRECTIVE ACTIONS       │
│                                │                            │
│   - Rainfall forecast (7-day)  │   Alert cards:             │
│   - Soil moisture trend        │   [CRITICAL] Balaghat      │
│   - NDVI (vegetation health)   │   Expected -12% shortfall  │
│   - Land surface temperature   │   due to monsoon rainfall  │
│   - Correlation with           │                            │
│     production dips            │   Recommended Actions:     │
│                                │   1. Shift to underground  │
│                                │   2. Pre-stock from Dongri │
│                                │   3. Expedite maintenance  │
│                                │                            │
├────────────────────────────────┴────────────────────────────┤
│  PANEL 5: FEATURE IMPORTANCE (SHAP)                          │
│  Horizontal bar chart showing top factors driving shortfall  │
│  prediction: [Rainfall: 0.32] [Equipment Age: 0.18] ...     │
└─────────────────────────────────────────────────────────────┘
```

---

## Synthetic Data Strategy

Since MOIL won't share internal data, we build realistic synthetic data:

### Production Data (generate 5 years, monthly)
```python
# Base production per mine (from MOIL annual reports)
mines = {
    "Balaghat": {"base_monthly_tonnes": 25000, "type": "underground"},
    "Dongri Buzurg": {"base_monthly_tonnes": 25000, "type": "opencast"},
    "Kandri": {"base_monthly_tonnes": 8000, "type": "underground"},
    "Munsar": {"base_monthly_tonnes": 5000, "type": "underground"},
    "Chikla": {"base_monthly_tonnes": 6000, "type": "underground"},
    # ... other mines
}

# Realistic patterns:
# - Monsoon dip (June-Sept): opencast mines drop 30-50%, underground 10-15%
# - Equipment failures: random 5-15% drops, clustered
# - Year-on-year growth: 3-5% (matches MOIL actuals)
# - Target vs actual: 5-12% variance (realistic industry figure)
```

### Equipment Data
```python
# Per mine: 5-10 major equipment items
# Status: operational / maintenance / breakdown
# Age: 1-15 years
# Utilization: 60-90%
# Failure pattern: Weibull distribution (realistic for mining equipment)
```

### Weather Data (REAL — from IMD + GEE)
- This is actual satellite + weather station data, not synthetic
- 5 years of daily rainfall, temperature, NDVI for each mine location
- This is the "space technology" part — real satellite data

---

## Folder Structure

```
mangalens/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── models/
│   │   │   ├── database.py      # SQLAlchemy models
│   │   │   └── schemas.py       # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── mines.py         # /api/mines endpoints
│   │   │   ├── forecast.py      # /api/forecast endpoints
│   │   │   ├── alerts.py        # /api/alerts endpoints
│   │   │   └── satellite.py     # /api/satellite endpoints
│   │   ├── services/
│   │   │   ├── gee_service.py   # Google Earth Engine integration
│   │   │   ├── weather.py       # IMD rainfall data
│   │   │   ├── predictor.py     # ML prediction service
│   │   │   └── actions.py       # Corrective action engine
│   │   └── ml/
│   │       ├── feature_eng.py   # Feature engineering pipeline
│   │       ├── xgb_model.py     # XGBoost training/inference
│   │       ├── lstm_model.py    # LSTM training/inference
│   │       ├── ensemble.py      # Model ensemble
│   │       ├── reserve_mapper.py # Spectral analysis + RF
│   │       └── synthetic_data.py # Synthetic data generator
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── MineMap.jsx      # Leaflet map with heatmap
│   │   │   ├── ForecastChart.jsx # Production forecast
│   │   │   ├── WeatherPanel.jsx  # Environmental data
│   │   │   ├── AlertCards.jsx    # Shortfall alerts
│   │   │   ├── ShapChart.jsx     # Feature importance
│   │   │   └── MineSelector.jsx  # Mine dropdown
│   │   ├── hooks/
│   │   │   └── useApi.js        # API fetch hooks
│   │   └── utils/
│   │       └── constants.js     # Mine coords, colors
│   ├── package.json
│   └── vite.config.js
│
├── data/
│   ├── mines.geojson            # MOIL mine boundaries
│   ├── synthetic/               # Generated training data
│   └── satellite/               # Cached GEE exports
│
├── notebooks/
│   ├── 01_gee_data_fetch.ipynb  # Satellite data exploration
│   ├── 02_feature_engineering.ipynb
│   ├── 03_model_training.ipynb
│   ├── 04_reserve_mapping.ipynb
│   └── 05_shap_analysis.ipynb
│
├── docs/
│   └── pitch_deck.pptx
│
└── README.md
```

---

## API Endpoints

```
GET  /api/mines                      → List all MOIL mines with metadata
GET  /api/mines/{mine_id}            → Single mine details
GET  /api/mines/{mine_id}/satellite  → Satellite data (NDVI, rainfall, temp)
GET  /api/forecast/{mine_id}         → Production forecast (next 4 weeks)
GET  /api/forecast/{mine_id}/shap    → SHAP feature importance
GET  /api/alerts                     → All active shortfall alerts
GET  /api/alerts/{mine_id}           → Alerts for specific mine
GET  /api/actions/{alert_id}         → Corrective actions for an alert
GET  /api/reserve-map/{mine_id}      → Reserve probability heatmap tiles
GET  /api/weather/{mine_id}          → Weather forecast + historical
```

---

## Demo Script (5 minutes)

```
[0:00-0:30] THE PROBLEM
"MOIL — India's largest manganese producer — loses crores annually
due to mismatch between expected and actual ore production.
Manual surveys are slow. Weather shuts down mines unexpectedly.
Equipment fails without warning."

[0:30-1:30] THE SOLUTION
"MangaLens uses satellite data from Sentinel-2 and Landsat,
combined with AI/ML, to give MOIL three things they don't have today..."
→ Show dashboard overview

[1:30-2:30] LIVE DEMO: Reserve Mapping
→ Click on Balaghat mine on map
→ Show spectral heatmap overlay
→ "These red zones indicate high manganese probability
   based on spectral band analysis — same methodology
   validated in published research on MOIL's Dongri Buzurg mine"

[2:30-3:30] LIVE DEMO: Production Forecast
→ Show forecast chart for Balaghat
→ "Our model predicts a 12% production shortfall in August
   due to heavy monsoon rainfall — see the correlation"
→ Show SHAP: "Rainfall is the #1 factor, followed by equipment age"

[3:30-4:30] LIVE DEMO: Corrective Actions
→ Click on CRITICAL alert card
→ "MangaLens recommends: shift production to underground mines
   which are weather-resistant, and pre-stock ore from Dongri Buzurg"
→ "Estimated recovery: 8,000 tonnes — worth Rs 2.4 crore"

[4:30-5:00] IMPACT + CLOSE
"Even a 5% improvement in MOIL's planning = Rs 50+ crore annually.
MangaLens turns reactive mining into predictive mining.
With real MOIL data integration, we project 85%+ forecast accuracy."
```

---

## Pre-Hackathon Prep Checklist

- [ ] Set up Google Earth Engine account (needs approval — do this NOW)
- [ ] Download and explore Sentinel-2 tiles for Balaghat (21.8°N, 80.2°E)
- [ ] Download and explore tiles for Nagpur mining belt (21.1°N, 79.1°E)
- [ ] Read the Dongri Buzurg research paper (spectral methodology)
- [ ] Read the Balaghat Earth Observation paper (PCA methodology)
- [ ] Memorize MOIL mine names, locations, production figures
- [ ] Learn geological basics: Sausar Group, Precambrian stratigraphy
- [ ] Generate synthetic production data (5 years monthly)
- [ ] Generate synthetic equipment data
- [ ] Train preliminary XGBoost model on synthetic data
- [ ] Build basic React dashboard shell
- [ ] Practice GEE Python API (NDVI, band ratios)
- [ ] Prepare pitch deck template
