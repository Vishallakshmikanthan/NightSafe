"""
Predictive Risk Agent

Responsible for:
- Scoring streets using the weighted safety formula
- Predicting future risk based on time-series patterns
- Providing explainable AI — human-readable reasons for every score
- Caching scored results for efficient retrieval
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure the project root is importable
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from ml.safety_model import (
    score_safety,
    classify,
    explain_safety,
    detect_transitions,
    score_chennai_csv,
    TransitionPoint,
)


class RiskAgent:
    """Predictive risk scoring with caching and trend analysis."""

    def __init__(self) -> None:
        self._scored_cache: Optional[List[Dict[str, Any]]] = None

    # ── public API ──────────────────────────────────────────────────

    def score_all(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Score every row in the dataset and cache the result.
        Each dict must have: footfall, lighting_status, liquor_distance,
        crime_score, hour, street_id, street_name.
        """
        scored: List[Dict[str, Any]] = []
        for r in rows:
            s = score_safety(
                r["footfall"], r["lighting_status"],
                r["liquor_distance"], r["crime_score"], r["hour"],
            )
            explanation = explain_safety(
                r["footfall"], r["lighting_status"],
                r["liquor_distance"], r["crime_score"], r["hour"],
            )
            scored.append({
                **r,
                "safety_score": s,
                "zone": classify(s),
                "explanation": explanation,
            })

        self._scored_cache = scored
        return scored

    def score_single(
        self,
        footfall: int,
        lighting_status: int,
        liquor_distance: int,
        crime_score: float,
        hour: int,
    ) -> Dict[str, Any]:
        """Score a single observation and return score + zone + explanation."""
        s = score_safety(footfall, lighting_status, liquor_distance, crime_score, hour)
        return {
            "safety_score": s,
            "zone": classify(s),
            "explanation": explain_safety(
                footfall, lighting_status, liquor_distance, crime_score, hour,
            ),
        }

    def predict_next_hour(self, street_rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Simple trend-based prediction: given consecutive hourly readings for
        one street, predict the score for the next hour by linear extrapolation.
        """
        if len(street_rows) < 2:
            return None

        hour_order = [20, 21, 22, 23, 0]
        sorted_rows = sorted(
            street_rows,
            key=lambda r: hour_order.index(r["hour"]) if r["hour"] in hour_order else r["hour"],
        )

        last = sorted_rows[-1]
        prev = sorted_rows[-2]
        delta = last["safety_score"] - prev["safety_score"]

        # Predict next hour's score (clamped 0-100)
        predicted_score = max(0.0, min(100.0, round(last["safety_score"] + delta, 1)))
        next_hour = (last["hour"] + 1) % 24

        return {
            "street_id": last["street_id"],
            "street_name": last["street_name"],
            "predicted_hour": next_hour,
            "predicted_score": predicted_score,
            "predicted_zone": classify(predicted_score),
            "trend": "declining" if delta < -5 else ("rising" if delta > 5 else "stable"),
            "confidence": "low" if len(street_rows) < 3 else "medium",
        }

    def detect_transitions(self, scored_rows: List[Dict[str, Any]]) -> List[TransitionPoint]:
        """Delegate to the ML model's transition detector."""
        return detect_transitions(scored_rows)

    def get_cached(self) -> Optional[List[Dict[str, Any]]]:
        """Return previously scored data, or None if not yet scored."""
        return self._scored_cache
