"""
Data Ingestion Agent

Responsible for:
- Loading raw CSV / database records
- Normalising feature names and types
- Validating data quality (missing values, out-of-range)
- Providing a clean DataFrame-like list of dicts to downstream agents
"""

from __future__ import annotations

import csv
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

# Root data directory (project-level)
_DATA_DIR = Path(__file__).resolve().parents[3] / "data"


class DataAgent:
    """Ingests raw street data, normalises it, and exposes clean records."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self._data_dir = data_dir or _DATA_DIR
        self._cache: Optional[List[Dict[str, Any]]] = None

    # ── public API ──────────────────────────────────────────────────

    def load(self, filename: str = "chennai_street_data.csv") -> List[Dict[str, Any]]:
        """Load and normalise the street CSV into clean typed dicts."""
        if self._cache is not None:
            return self._cache

        path = self._data_dir / filename
        with open(path, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            raw = list(reader)

        self._cache = [self._normalise(row) for row in raw if self._validate(row)]
        return self._cache

    def invalidate_cache(self) -> None:
        """Force fresh data on next load()."""
        self._cache = None

    def ingest_single(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Normalise a single incoming record (e.g. from a real-time feed)."""
        if not self._validate(row):
            raise ValueError(f"Invalid row: {row}")
        return self._normalise(row)

    # ── internals ───────────────────────────────────────────────────

    @staticmethod
    def _normalise(row: Dict[str, Any]) -> Dict[str, Any]:
        """Cast CSV strings to proper Python types."""
        return {
            "street_id": str(row["street_id"]).strip(),
            "street_name": str(row["street_name"]).strip(),
            "hour": int(row["hour"]),
            "footfall": int(row["footfall"]),
            "lighting_status": int(row["lighting_status"]),
            "liquor_distance": int(row["liquor_distance"]),
            "crime_score": round(float(row["crime_score"]), 4),
        }

    @staticmethod
    def _validate(row: Dict[str, Any]) -> bool:
        """Return True when the row has all required fields with sane values."""
        required = [
            "street_id", "street_name", "hour",
            "footfall", "lighting_status", "liquor_distance", "crime_score",
        ]
        for key in required:
            if key not in row or row[key] in (None, ""):
                return False

        try:
            h = int(row["hour"])
            if not (0 <= h <= 23):
                return False
            if int(row["footfall"]) < 0:
                return False
            if int(row["lighting_status"]) not in (0, 1):
                return False
            if float(row["crime_score"]) < 0 or float(row["crime_score"]) > 1:
                return False
        except (ValueError, TypeError):
            return False

        return True
