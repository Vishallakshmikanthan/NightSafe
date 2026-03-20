"""
Agent & Dashboard API endpoints

Provides:
- /api/agents/anomalies      — anomaly detection results
- /api/agents/geo-clusters    — spatial grid clusters with safety
- /api/agents/predict         — next-hour risk prediction
- /api/agents/police-alerts   — police dispatch dashboard
- /api/agents/gcc-alerts      — GCC infrastructure alerts
- /api/agents/feedback        — submit user safety feedback
- /api/agents/learning        — continuous learning status & trigger
- /api/agents/simulation      — real-time simulation control
- /api/agents/investment-report — investment report (alias)
"""

from __future__ import annotations

from fastapi import APIRouter, Query, HTTPException
from typing import List

from app.models.schemas import (
    AnomalyResponse,
    PoliceAlertResponse,
    GeoClusterResponse,
    FeedbackRequest,
    LearningStatusResponse,
    SimulationStatusResponse,
    PredictionResponse,
    InvestmentReport,
)
from app.services.agent_orchestrator import orchestrator

router = APIRouter()


# ── Anomaly Detection ───────────────────────────────────────────────

@router.get("/anomalies", response_model=List[AnomalyResponse])
async def anomalies(
    hour: int = Query(None, ge=0, le=23, description="Filter by hour (optional)"),
):
    """Return detected anomalies — sudden safety-score drops."""
    result = orchestrator.get_anomalies()
    if hour is not None:
        result = [a for a in result if a["hour"] == hour]
    return result


# ── Geo-Mapping Clusters ───────────────────────────────────────────

@router.get("/geo-clusters", response_model=List[GeoClusterResponse])
async def geo_clusters(
    hour: int = Query(22, ge=0, le=23, description="Hour for safety aggregation"),
):
    """Return spatial grid clusters with aggregated safety scores."""
    return orchestrator.get_geo_clusters(hour)


# ── Predictive Risk ────────────────────────────────────────────────

@router.get("/predict", response_model=List[PredictionResponse])
async def predict_next_hour(
    hour: int = Query(22, ge=0, le=23, description="Current hour to predict from"),
):
    """Predict safety scores for the next hour for all streets."""
    return orchestrator.predict_all(hour)


# ── Police Dashboard ───────────────────────────────────────────────

@router.get("/police-alerts", response_model=List[PoliceAlertResponse])
async def police_alerts():
    """Return alerts dispatched to police (HIGH / CRITICAL only)."""
    return orchestrator.get_police_alerts()


# ── GCC Infrastructure Dashboard ───────────────────────────────────

@router.get("/gcc-alerts", response_model=List[PoliceAlertResponse])
async def gcc_alerts():
    """Return alerts dispatched to GCC for infrastructure review."""
    return orchestrator.get_gcc_alerts()


# ── Investment Report (convenience alias) ──────────────────────────

@router.get("/investment-report", response_model=InvestmentReport)
async def investment_report(
    top: int = Query(10, ge=1, le=55, description="Top N streets"),
):
    """Return GCC investment priority report."""
    return orchestrator.get_investment_report(top)


# ── Continuous Learning — Feedback ─────────────────────────────────

@router.post("/feedback")
async def submit_feedback(body: FeedbackRequest):
    """Submit user safety feedback for continuous learning."""
    orchestrator.submit_feedback(
        street_id=body.street_id,
        hour=body.hour,
        reported_score=body.reported_score,
        actual_feeling=body.actual_feeling,
        source=body.source,
    )
    return {"status": "accepted", "pending": orchestrator.learning.get_feedback_count()}


@router.post("/learn")
async def trigger_learning():
    """Trigger a learning epoch on accumulated feedback."""
    result = orchestrator.learn()
    return result


@router.get("/learning", response_model=LearningStatusResponse)
async def learning_status():
    """Return current learning weights and epoch."""
    w = orchestrator.learning.weights
    return {
        "weights": w,
        "epoch": orchestrator.learning._epoch,
        "pending_feedback": orchestrator.learning.get_feedback_count(),
    }


@router.get("/learning/history")
async def learning_history():
    """Return the weight-adjustment history across all epochs."""
    return orchestrator.learning.get_score_history()


# ── Real-Time Simulation ───────────────────────────────────────────

@router.post("/simulation/start")
async def start_simulation(
    interval: float = Query(30.0, ge=5, le=300, description="Tick interval in seconds"),
):
    """Start the real-time simulation engine."""
    orchestrator.start_simulation(interval_seconds=interval)
    return {"status": "started", "interval": interval}


@router.post("/simulation/stop")
async def stop_simulation():
    """Stop the simulation engine."""
    orchestrator.stop_simulation()
    return {"status": "stopped"}


@router.get("/simulation/status", response_model=SimulationStatusResponse)
async def simulation_status():
    """Return simulation engine status."""
    return orchestrator.get_simulation_status()


@router.get("/simulation/snapshot")
async def simulation_snapshot(
    hour: int = Query(None, ge=0, le=23, description="Filter by hour (optional)"),
):
    """Return the latest simulated safety scores."""
    data = orchestrator.get_simulation_snapshot(hour)
    return data
