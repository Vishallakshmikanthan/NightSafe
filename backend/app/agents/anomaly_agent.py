"""
Anomaly Detection Agent

Responsible for:
- Detecting sudden drops in safety scores (statistical anomaly)
- Flagging streets with abnormal score changes between consecutive hours
- Using z-score thresholding for lightweight anomaly detection
- Tracking historical baselines per street for drift detection
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class Anomaly:
    """Represents an anomalous safety-score event."""
    street_id: str
    street_name: str
    hour: int
    score: float
    expected_score: float
    deviation: float       # how far from expected (in std-dev units)
    drop_magnitude: float  # absolute score drop from previous hour
    severity: str          # LOW / MEDIUM / HIGH / CRITICAL


# Severity thresholds (based on z-score magnitude)
_SEVERITY_MAP: List[Tuple[float, str]] = [
    (3.0, "CRITICAL"),
    (2.0, "HIGH"),
    (1.5, "MEDIUM"),
    (1.0, "LOW"),
]


def _severity_from_zscore(z: float) -> str:
    """Map an absolute z-score to a severity label."""
    for threshold, label in _SEVERITY_MAP:
        if abs(z) >= threshold:
            return label
    return "LOW"


class AnomalyAgent:
    """Detects sudden abnormal changes in safety scores."""

    def __init__(self, z_threshold: float = 1.5) -> None:
        # Minimum z-score to flag an anomaly
        self._z_threshold = z_threshold
        # Historical baselines: street_id → list of past scores
        self._history: Dict[str, List[float]] = {}

    # ── public API ──────────────────────────────────────────────────

    def update_history(self, scored_rows: List[Dict[str, Any]]) -> None:
        """
        Feed a batch of scored rows to build per-street baseline.
        Call this whenever new data arrives to improve baseline accuracy.
        """
        for row in scored_rows:
            sid = row["street_id"]
            score = row["safety_score"]
            self._history.setdefault(sid, []).append(score)

    def detect(self, scored_rows: List[Dict[str, Any]]) -> List[Anomaly]:
        """
        Scan scored rows for anomalies.  Two detection methods:

        1. **Z-score**: current score deviates significantly from the
           street's historical mean.
        2. **Hour-over-hour drop**: a sudden large drop from the
           previous hour signals an emerging danger.
        """
        anomalies: List[Anomaly] = []

        # Group rows by street for hour-over-hour comparison
        by_street: Dict[str, List[Dict[str, Any]]] = {}
        for row in scored_rows:
            by_street.setdefault(row["street_id"], []).append(row)

        hour_order = [20, 21, 22, 23, 0]

        for sid, rows in by_street.items():
            sorted_rows = sorted(
                rows,
                key=lambda r: hour_order.index(r["hour"]) if r["hour"] in hour_order else r["hour"],
            )

            # Compute baseline stats from history
            history = self._history.get(sid, [])
            mean_score = sum(history) / len(history) if history else 50.0
            std_score = self._std(history) if len(history) >= 3 else 15.0

            prev_score: Optional[float] = None

            for row in sorted_rows:
                score = row["safety_score"]

                # --- Z-score anomaly ---
                z = (score - mean_score) / std_score if std_score > 0 else 0.0

                # We care about DROPS (negative z-scores = worse than expected)
                is_z_anomaly = z < -self._z_threshold

                # --- Hour-over-hour drop ---
                drop = (prev_score - score) if prev_score is not None else 0.0
                is_drop_anomaly = drop > 20  # >20 point drop in one hour

                if is_z_anomaly or is_drop_anomaly:
                    anomalies.append(Anomaly(
                        street_id=sid,
                        street_name=row["street_name"],
                        hour=row["hour"],
                        score=score,
                        expected_score=round(mean_score, 1),
                        deviation=round(abs(z), 2),
                        drop_magnitude=round(drop, 1),
                        severity=_severity_from_zscore(z) if is_z_anomaly else (
                            "HIGH" if drop > 30 else "MEDIUM"
                        ),
                    ))

                prev_score = score

        # Sort by severity (CRITICAL first), then by score (lowest first)
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        anomalies.sort(key=lambda a: (severity_order.get(a.severity, 4), a.score))

        return anomalies

    def detect_realtime(self, street_id: str, street_name: str, hour: int, score: float) -> Optional[Anomaly]:
        """
        Check a single incoming score against the baseline for that street.
        Returns an Anomaly if detected, else None.
        """
        history = self._history.get(street_id, [])
        mean_score = sum(history) / len(history) if history else 50.0
        std_score = self._std(history) if len(history) >= 3 else 15.0

        z = (score - mean_score) / std_score if std_score > 0 else 0.0

        if z < -self._z_threshold:
            return Anomaly(
                street_id=street_id,
                street_name=street_name,
                hour=hour,
                score=score,
                expected_score=round(mean_score, 1),
                deviation=round(abs(z), 2),
                drop_magnitude=round(mean_score - score, 1),
                severity=_severity_from_zscore(z),
            )
        return None

    # ── internals ───────────────────────────────────────────────────

    @staticmethod
    def _std(values: List[float]) -> float:
        """Compute population standard deviation."""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        return math.sqrt(variance)
