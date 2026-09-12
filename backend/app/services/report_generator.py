"""
PDF Report Generator: Monthly intelligence report for a mine.
Uses reportlab to create a professional multi-page PDF with
forecast, alerts, spectral analysis, and corrective actions.
"""

import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import MOIL_MINES
from app.services.predictor import PredictionService
from app.services.gee_service import get_satellite_tile, get_weather_summary

NAVY = HexColor("#1a365d")
ORANGE = HexColor("#e67e22")
LIGHT_BLUE = HexColor("#ebf5fb")
LIGHT_GRAY = HexColor("#f8f9fa")
RED = HexColor("#e74c3c")
GREEN = HexColor("#27ae60")
YELLOW = HexColor("#f39c12")


def get_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "ReportTitle", parent=styles["Title"],
        fontSize=22, textColor=NAVY, spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "ReportSubtitle", parent=styles["Normal"],
        fontSize=11, textColor=HexColor("#666666"), alignment=TA_CENTER, spaceAfter=16,
    ))
    styles.add(ParagraphStyle(
        "SectionHead", parent=styles["Heading2"],
        fontSize=14, textColor=NAVY, spaceBefore=16, spaceAfter=8,
        borderWidth=0, borderColor=NAVY, borderPadding=4,
    ))
    styles.add(ParagraphStyle(
        "MetricLabel", parent=styles["Normal"],
        fontSize=9, textColor=HexColor("#888888"),
    ))
    styles.add(ParagraphStyle(
        "MetricValue", parent=styles["Normal"],
        fontSize=16, textColor=NAVY, leading=20,
    ))
    styles.add(ParagraphStyle(
        "AlertCritical", parent=styles["Normal"],
        fontSize=10, textColor=colors.white, backColor=RED,
    ))
    styles.add(ParagraphStyle(
        "AlertWarning", parent=styles["Normal"],
        fontSize=10, textColor=colors.white, backColor=YELLOW,
    ))
    styles.add(ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=10, leading=14,
    ))
    styles.add(ParagraphStyle(
        "SmallNote", parent=styles["Normal"],
        fontSize=8, textColor=HexColor("#999999"), alignment=TA_CENTER,
    ))

    return styles


def generate_report(mine_id: str) -> bytes:
    mine = MOIL_MINES.get(mine_id)
    if not mine:
        raise ValueError(f"Mine '{mine_id}' not found")

    service = PredictionService()
    forecasts = service.get_forecast(mine_id, periods=4)
    alerts = service.get_alerts(mine_id)
    shap_data = service.get_shap(mine_id)
    tile = get_satellite_tile(mine_id, datetime.now().strftime("%Y-%m-%d"))
    weather = get_weather_summary(mine_id, months=6)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=25*mm, bottomMargin=20*mm,
    )

    styles = get_styles()
    story = []

    # --- HEADER ---
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph("MangaLens", styles["ReportTitle"]))
    story.append(Paragraph("AI-Powered Manganese Intelligence Report", styles["ReportSubtitle"]))
    story.append(HRFlowable(width="100%", thickness=2, color=NAVY))
    story.append(Spacer(1, 4*mm))

    # Mine info bar
    now = datetime.now()
    mine_info_data = [
        [
            Paragraph(f"<b>{mine['name']}</b>", styles["Body"]),
            Paragraph(f"{mine['state']}", styles["Body"]),
            Paragraph(f"{mine['type'].title()}", styles["Body"]),
            Paragraph(f"Report: {now.strftime('%B %Y')}", styles["Body"]),
        ]
    ]
    mine_table = Table(mine_info_data, colWidths=[45*mm, 40*mm, 35*mm, 45*mm])
    mine_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
        ("BOX", (0, 0), (-1, -1), 1, NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(mine_table)
    story.append(Spacer(1, 6*mm))

    # --- KEY METRICS ---
    story.append(Paragraph("Key Performance Metrics", styles["SectionHead"]))

    if forecasts:
        latest = forecasts[-1]
        alert_color = RED if latest.alert_level.value == "CRITICAL" else (YELLOW if latest.alert_level.value == "WARNING" else GREEN)

        metrics_data = [
            [
                Paragraph("<b>Predicted Output</b>", styles["MetricLabel"]),
                Paragraph("<b>Target</b>", styles["MetricLabel"]),
                Paragraph("<b>Shortfall Risk</b>", styles["MetricLabel"]),
                Paragraph("<b>Alert Level</b>", styles["MetricLabel"]),
            ],
            [
                Paragraph(f"<b>{latest.predicted_tonnes:,.0f} t</b>", styles["MetricValue"]),
                Paragraph(f"<b>{latest.target_tonnes:,.0f} t</b>", styles["MetricValue"]),
                Paragraph(f"<b>{abs(latest.shortfall_pct):.1f}%</b>", styles["MetricValue"]),
                Paragraph(f"<b>{latest.alert_level.value}</b>", styles["MetricValue"]),
            ],
        ]
        metrics_table = Table(metrics_data, colWidths=[42*mm, 42*mm, 42*mm, 42*mm])
        metrics_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
            ("BACKGROUND", (3, 1), (3, 1), alert_color),
            ("TEXTCOLOR", (3, 1), (3, 1), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(metrics_table)
    story.append(Spacer(1, 6*mm))

    # --- PRODUCTION FORECAST ---
    story.append(Paragraph("Production Forecast (Next 4 Months)", styles["SectionHead"]))

    if forecasts:
        fc_header = ["Period", "Predicted (t)", "Target (t)", "Shortfall %", "Confidence", "Status"]
        fc_rows = [fc_header]
        for fc in forecasts:
            status_text = fc.alert_level.value
            fc_rows.append([
                fc.period,
                f"{fc.predicted_tonnes:,.0f}",
                f"{fc.target_tonnes:,.0f}",
                f"{fc.shortfall_pct:+.1f}%",
                f"{fc.confidence_lower:,.0f} - {fc.confidence_upper:,.0f}",
                status_text,
            ])

        fc_table = Table(fc_rows, colWidths=[27*mm, 28*mm, 27*mm, 25*mm, 35*mm, 25*mm])
        fc_styles = [
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ]
        for i, fc in enumerate(forecasts):
            row = i + 1
            if fc.alert_level.value == "CRITICAL":
                fc_styles.append(("BACKGROUND", (5, row), (5, row), RED))
                fc_styles.append(("TEXTCOLOR", (5, row), (5, row), colors.white))
            elif fc.alert_level.value == "WARNING":
                fc_styles.append(("BACKGROUND", (5, row), (5, row), YELLOW))
                fc_styles.append(("TEXTCOLOR", (5, row), (5, row), colors.white))
            else:
                fc_styles.append(("BACKGROUND", (5, row), (5, row), GREEN))
                fc_styles.append(("TEXTCOLOR", (5, row), (5, row), colors.white))

        fc_table.setStyle(TableStyle(fc_styles))
        story.append(fc_table)
    story.append(Spacer(1, 6*mm))

    # --- SHAP FEATURE IMPORTANCE ---
    story.append(Paragraph("Top Predictive Factors (SHAP Analysis)", styles["SectionHead"]))

    if shap_data:
        shap_header = ["Rank", "Feature", "Importance", "Direction"]
        shap_rows = [shap_header]
        feature_labels = {
            "actual_tonnes_lag1": "Last Month Output",
            "actual_tonnes_roll3_mean": "3-Month Rolling Avg",
            "actual_tonnes_roll6_mean": "6-Month Rolling Avg",
            "heavy_rain_days": "Heavy Rain Days",
            "rainfall_mm_sum": "Total Rainfall",
            "is_monsoon": "Monsoon Season",
            "soil_moisture_mean": "Soil Moisture",
            "temperature_c_mean": "Avg Temperature",
            "avg_equipment_age": "Equipment Age",
            "operational_ratio": "Equipment Operational %",
            "ndvi_mean": "Vegetation Index (NDVI)",
        }
        for i, feat in enumerate(shap_data[:8]):
            label = feature_labels.get(feat["feature"], feat["feature"].replace("_", " ").title())
            direction = feat.get("direction", "—")
            shap_rows.append([
                str(i + 1),
                label,
                f"{feat['importance']:.4f}",
                direction,
            ])

        shap_table = Table(shap_rows, colWidths=[15*mm, 55*mm, 30*mm, 30*mm])
        shap_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        story.append(shap_table)
    story.append(Spacer(1, 6*mm))

    # --- ALERTS & CORRECTIVE ACTIONS ---
    if alerts:
        story.append(Paragraph("Active Alerts & Corrective Actions", styles["SectionHead"]))

        for alert in alerts:
            level_color = RED if alert.alert_level.value == "CRITICAL" else YELLOW
            story.append(Paragraph(
                f"<b>{alert.alert_level.value}</b> — {alert.mine_name} ({alert.period}) — "
                f"Shortfall: {abs(alert.shortfall_pct):.1f}% — Cause: {alert.primary_cause.replace('_', ' ').title()}",
                ParagraphStyle("AlertItem", parent=styles["Body"], textColor=level_color, fontSize=10, spaceBefore=6),
            ))

            if alert.actions:
                action_header = ["#", "Action", "Recovery (t)", "Value (Cr)"]
                action_rows = [action_header]
                for act in alert.actions[:4]:
                    action_rows.append([
                        str(act.priority),
                        Paragraph(act.action, ParagraphStyle("ActionText", fontSize=8, leading=10)),
                        f"{act.estimated_recovery_tonnes:,.0f}",
                        f"{act.estimated_value_crore:.2f}",
                    ])

                act_table = Table(action_rows, colWidths=[10*mm, 90*mm, 30*mm, 25*mm])
                act_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#2c3e50")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("ALIGN", (2, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]))
                story.append(Spacer(1, 2*mm))
                story.append(act_table)

        story.append(Spacer(1, 6*mm))

    # --- SPECTRAL / SATELLITE DATA ---
    story.append(Paragraph("Satellite & Spectral Data", styles["SectionHead"]))

    if tile and "indices" in tile:
        idx = tile["indices"]
        sat_header = ["Index", "Value", "Significance"]
        sat_rows = [sat_header]
        index_info = [
            ("Iron Oxide (B4/B2)", idx.get("iron_oxide", 0), "High = iron-bearing minerals near Mn deposits"),
            ("Hydroxyl (B11/B12)", idx.get("hydroxyl", 0), "High = clay/alteration minerals"),
            ("Ferrous (B12/B8)", idx.get("ferrous", 0), "High = ferrous mineral presence"),
            ("Mn Indicator", idx.get("mn_indicator", 0), "Custom composite for manganese"),
            ("NDVI", idx.get("ndvi", 0), "Vegetation cover — affects accessibility"),
        ]
        for name, val, sig in index_info:
            sat_rows.append([name, f"{val:.4f}", sig])

        sat_table = Table(sat_rows, colWidths=[35*mm, 25*mm, 100*mm])
        sat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        story.append(sat_table)
    story.append(Spacer(1, 6*mm))

    # --- WEATHER SUMMARY ---
    if weather:
        story.append(Paragraph("Weather Summary (Last 6 Months)", styles["SectionHead"]))

        w_header = ["Month", "Rainfall (mm)", "Temp (C)", "Soil Moisture", "NDVI"]
        w_rows = [w_header]
        for w in weather:
            w_rows.append([
                w["month"],
                f"{w['rainfall_mm']:.0f}",
                f"{w['avg_temp_c']:.1f}",
                f"{w['soil_moisture']:.3f}",
                f"{w['ndvi']:.3f}",
            ])

        w_table = Table(w_rows, colWidths=[30*mm, 30*mm, 25*mm, 30*mm, 25*mm])
        w_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        story.append(w_table)
    story.append(Spacer(1, 6*mm))

    # --- MINE DETAILS ---
    story.append(Paragraph("Mine Profile", styles["SectionHead"]))

    profile_data = [
        ["Parameter", "Value"],
        ["Mine Name", mine["name"]],
        ["State", mine["state"]],
        ["Type", mine["type"].title()],
        ["Depth", f"{mine['depth_m']}m"],
        ["Base Monthly Output", f"{mine['base_monthly_tonnes']:,} tonnes"],
        ["Ore Grade", f"{mine['ore_grade_pct']}%"],
        ["Active Since", str(mine["active_since"])],
        ["Coordinates", f"{mine['lat']:.4f}N, {mine['lon']:.4f}E"],
    ]
    prof_table = Table(profile_data, colWidths=[50*mm, 80*mm])
    prof_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 1), (0, -1), LIGHT_GRAY),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ]))
    story.append(prof_table)

    # --- FOOTER ---
    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        f"Generated by MangaLens v1.0 — {now.strftime('%d %B %Y, %H:%M')} — "
        "SIH26009 | Ministry of Steel / MOIL Ltd.",
        styles["SmallNote"],
    ))
    story.append(Paragraph(
        "Ensemble Model: XGBoost (60%) + LSTM (40%) | Sentinel-2 Spectral Analysis | "
        "SHAP Explainability",
        styles["SmallNote"],
    ))

    doc.build(story)
    return buf.getvalue()
