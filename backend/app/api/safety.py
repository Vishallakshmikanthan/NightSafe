from fastapi import APIRouter, Query, HTTPException
from typing import List

from app.models.schemas import (
    StreetRecord,
    SafetyScoreResponse,
    DangerZoneResponse,
    TransitionAlertResponse,
)
from app.services.safety_service import (
    get_all_streets,
    get_safety_score,
    get_danger_zones,
    get_transition_alerts,
)

router = APIRouter()


@router.get("/streets", response_model=List[StreetRecord])
async def streets():
    """Return all street data with computed safety scores."""
    return get_all_streets()


@router.get("/safety-score", response_model=SafetyScoreResponse)
async def safety_score(
    street_id: str = Query(..., description="Street identifier, e.g. CHN-001"),
    hour: int = Query(..., ge=0, le=23, description="Hour of the day (0-23)"),
):
    """Return the computed safety score for a specific street and hour."""
    result = get_safety_score(street_id, hour)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Street '{street_id}' not found")
    return result


@router.get("/danger-zones", response_model=List[DangerZoneResponse])
async def danger_zones(
    hour: int = Query(..., ge=0, le=23, description="Hour of the day (0-23)"),
):
    """Return all streets with a safety score below 40 at the given hour."""
    return get_danger_zones(hour)


@router.get("/transition-alerts", response_model=List[TransitionAlertResponse])
async def transition_alerts():
    """Return streets where safety dropped from SAFE/CAUTION into DANGER."""
    return get_transition_alerts()
