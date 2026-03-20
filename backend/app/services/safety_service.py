"""
Safety service — loads Chennai CSV data and delegates scoring to
the ML safety_model module.
"""

import sys
from pathlib import Path
from typing import Optional, List, Dict, Any

# Ensure the project root is importable so `ml.safety_model` resolves.
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from ml.safety_model import (
    score_chennai_csv,
    score_safety,
    classify,
    detect_transitions,
    explain_safety,
)

# ---------------------------------------------------------------------------
# Module-level cache: scored data is loaded once on first access.
# ---------------------------------------------------------------------------

_scored_data: Optional[List[Dict[str, Any]]] = None


def _load_scored_data() -> List[Dict[str, Any]]:
    """Load and score the Chennai street CSV (cached)."""
    global _scored_data
    if _scored_data is None:
        _scored_data = score_chennai_csv()
    return _scored_data


# ---------------------------------------------------------------------------
# Public helpers consumed by the API layer
# ---------------------------------------------------------------------------


def get_all_streets() -> List[Dict[str, Any]]:
    """Return every scored street record."""
    return _load_scored_data()


def get_safety_score(street_id: str, hour: int) -> Optional[Dict[str, Any]]:
    """
    Compute a safety score for a specific street at a given hour.

    First looks for a matching row in the dataset.  If found, returns
    the pre-computed score.  If only the street exists (but not at that
    hour), re-scores using the street's features at the closest available
    hour as a proxy.
    """
    data = _load_scored_data()

    # Exact match
    for row in data:
        if row["street_id"] == street_id and row["hour"] == hour:
            return {
                "street_id": row["street_id"],
                "street_name": row["street_name"],
                "hour": row["hour"],
                "safety_score": row["safety_score"],
                "zone": row["zone"],
                "explanation": row.get("explanation", []),
            }

    # Street exists but not at this hour — re-score with closest-hour features
    street_rows = [r for r in data if r["street_id"] == street_id]
    if not street_rows:
        return None

    closest = min(street_rows, key=lambda r: abs(r["hour"] - hour))
    new_score = score_safety(
        footfall=closest["footfall"],
        lighting_status=closest["lighting_status"],
        liquor_distance=closest["liquor_distance"],
        crime_score=closest["crime_score"],
        hour=hour,
    )
    new_explanation = explain_safety(
        footfall=closest["footfall"],
        lighting_status=closest["lighting_status"],
        liquor_distance=closest["liquor_distance"],
        crime_score=closest["crime_score"],
        hour=hour,
    )
    return {
        "street_id": street_id,
        "street_name": closest["street_name"],
        "hour": hour,
        "safety_score": new_score,
        "zone": classify(new_score),
        "explanation": new_explanation,
    }


def get_danger_zones(hour: int) -> List[Dict[str, Any]]:
    """Return all street records at *hour* whose score < 40 (DANGER)."""
    return [
        {
            "street_id": r["street_id"],
            "street_name": r["street_name"],
            "hour": r["hour"],
            "safety_score": r["safety_score"],
            "zone": r["zone"],
            "explanation": r.get("explanation", []),
        }
        for r in _load_scored_data()
        if r["hour"] == hour and r["safety_score"] < 40
    ]


def get_transition_alerts() -> List[Dict[str, Any]]:
    """Return streets where safety dropped into DANGER."""
    data = _load_scored_data()
    transitions = detect_transitions(data)
    return [
        {
            "street_id": t.street_id,
            "street_name": t.street_name,
            "hour": t.hour,
            "score": t.score,
            "prev_hour": t.prev_hour,
            "prev_score": t.prev_score,
        }
        for t in transitions
    ]


def get_alerts() -> List[Dict[str, Any]]:
    """Return danger alerts (score < 40) for the current hour."""
    from datetime import datetime

    current_hour = datetime.now().hour
    danger_streets = get_danger_zones(current_hour)
    return [
        {
            **street,
            "message": f"DANGER ALERT: {street['street_name']} \u2014 Score: {street['safety_score']:.1f}",
        }
        for street in danger_streets
    ]
