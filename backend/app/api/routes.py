from fastapi import APIRouter, Query, HTTPException
from typing import List

from app.models.schemas import SafeRouteResponse, StreetNameEntry, InvestmentReport
from app.services.routing_service import find_safest_route, list_street_names

import sys
from pathlib import Path
# Allow importing from the ml package at project root
_project_root = Path(__file__).resolve().parent.parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

router = APIRouter()


@router.get("/safe-route", response_model=SafeRouteResponse)
async def safe_route(
    start: str = Query(..., description="Start street ID, e.g. CHN-001"),
    end: str = Query(..., description="End street ID, e.g. CHN-010"),
    hour: int = Query(..., ge=0, le=23, description="Hour of the day (0-23)"),
):
    """Find the safest walking route between two streets using Dijkstra."""
    result = find_safest_route(start, end, hour)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No route found between '{start}' and '{end}' at hour {hour}.",
        )
    return result


@router.get("/street-names", response_model=List[StreetNameEntry])
async def street_names():
    """Return all street IDs and names for autocomplete."""
    return list_street_names()


@router.get("/investment", response_model=InvestmentReport)
async def investment_recommendations(
    top: int = Query(10, ge=1, le=55, description="Number of streets to return"),
):
    """Return top-N most critical streets for government safety investment."""
    from ml.investment_model import (
        _load_rows, aggregate_streets, compute_priority,
        rank_streets, generate_json,
    )
    rows = _load_rows()
    streets = aggregate_streets(rows)
    streets = compute_priority(streets)
    ranked = rank_streets(streets, top_n=top)
    report = generate_json(ranked)
    return report
