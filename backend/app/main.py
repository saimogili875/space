from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import mines, forecast, alerts, satellite, report, whatif, anomaly, compare, roi, notifications, nlp, audit, export

app = FastAPI(
    title="MangaLens API",
    description="AI-Powered Manganese Intelligence Platform for MOIL Ltd.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mines.router)
app.include_router(forecast.router)
app.include_router(alerts.router)
app.include_router(satellite.router)
app.include_router(report.router)
app.include_router(whatif.router)
app.include_router(anomaly.router)
app.include_router(compare.router)
app.include_router(roi.router)
app.include_router(notifications.router)
app.include_router(nlp.router)
app.include_router(audit.router)
app.include_router(export.router)


@app.get("/")
def root():
    return {
        "name": "MangaLens API",
        "version": "1.0.0",
        "description": "AI-Powered Manganese Intelligence Platform",
        "ps": "SIH26009",
        "endpoints": {
            "mines": "/api/mines",
            "forecast": "/api/forecast/{mine_id}",
            "alerts": "/api/alerts",
            "satellite": "/api/satellite/{mine_id}",
            "report": "/api/report/{mine_id}",
            "whatif": "/api/whatif/simulate",
            "anomaly": "/api/anomaly/{mine_id}",
            "compare": "/api/compare?mine_ids=balaghat,dongri_buzurg",
            "roi": "/api/roi",
            "notifications": "/api/notifications",
            "nlp": "/api/nlp",
            "audit": "/api/audit",
            "export": "/api/export/excel",
            "docs": "/docs",
        },
    }
