"""
Continuous Learning Module

Responsible for:
- Storing past safety scores with timestamps for trend analysis
- Accepting user / patrol feedback to refine scoring weights
- Dynamically adjusting weight parameters based on feedback history
- Improving predictions over time through a feedback loop
- Providing a learning report (weight drift over time)
"""

from __future__ import annotations

import json
import math
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Default weights (from ml/safety_model.py)
_DEFAULT_WEIGHTS = {
    "footfall": 0.35,
    "lighting": 0.30,
    "liquor": 0.20,
    "crime": 0.15,
}

# Learning rate — controls how quickly weights shift per feedback batch
_LEARNING_RATE = 0.02

# Minimum / maximum bounds so weights never collapse to zero or dominate
_WEIGHT_MIN = 0.05
_WEIGHT_MAX = 0.60

# Persistence path
_STATE_DIR = Path(__file__).resolve().parents[3] / "data"
_STATE_FILE = _STATE_DIR / "learning_state.json"


@dataclass
class FeedbackRecord:
    """A single user / patrol feedback entry."""
    street_id: str
    hour: int
    reported_score: float   # what the system predicted
    actual_feeling: float   # user's perceived safety (0-100)
    timestamp: float = field(default_factory=time.time)
    source: str = "user"    # "user" / "police" / "sensor"


class ContinuousLearningModule:
    """
    Feedback-driven weight tuner.

    The module collects feedback comparing predicted scores to real-world
    perception, then nudges the four scoring weights so that future
    predictions better match reality.

    Weights are constrained to always sum to 1.0 and stay within bounds.
    """

    def __init__(self, state_path: Optional[Path] = None) -> None:
        self._state_path = state_path or _STATE_FILE
        self._weights: Dict[str, float] = dict(_DEFAULT_WEIGHTS)
        self._feedback: List[FeedbackRecord] = []
        self._weight_history: List[Dict[str, Any]] = []
        self._epoch: int = 0
        self._load_state()

    # ── public API ──────────────────────────────────────────────────

    @property
    def weights(self) -> Dict[str, float]:
        """Current scoring weights (read-only copy)."""
        return dict(self._weights)

    def submit_feedback(
        self,
        street_id: str,
        hour: int,
        reported_score: float,
        actual_feeling: float,
        source: str = "user",
    ) -> FeedbackRecord:
        """
        Record one feedback entry.  Call learn() to apply accumulated
        feedback to the weights.
        """
        fb = FeedbackRecord(
            street_id=street_id,
            hour=hour,
            reported_score=reported_score,
            actual_feeling=actual_feeling,
            source=source,
        )
        self._feedback.append(fb)
        return fb

    def learn(self, min_samples: int = 5) -> Dict[str, Any]:
        """
        Run one learning epoch on accumulated feedback.

        For each feedback record, compare the error between the predicted
        score and the actual feeling.  If the system consistently over-
        predicts safety, the dominant weight components are nudged down.

        Returns a summary of the learning step.
        """
        if len(self._feedback) < min_samples:
            return {
                "status": "insufficient_data",
                "samples": len(self._feedback),
                "required": min_samples,
            }

        self._epoch += 1
        errors = [fb.actual_feeling - fb.reported_score for fb in self._feedback]
        mean_error = sum(errors) / len(errors)

        # Compute per-factor error contribution heuristic:
        # If mean_error < 0 → system is too optimistic → reduce highest weight
        # If mean_error > 0 → system is too pessimistic → reduce lowest weight
        old_weights = dict(self._weights)

        # Scale of adjustment proportional to mean error magnitude
        adjustment = _LEARNING_RATE * (mean_error / 100.0)

        # Apply adjustment to all weights proportionally
        sorted_keys = sorted(self._weights, key=lambda k: self._weights[k], reverse=True)

        for i, key in enumerate(sorted_keys):
            # Alternate direction: boost underweighted, reduce overweighted
            sign = -1 if i < 2 else 1
            self._weights[key] += sign * adjustment
            self._weights[key] = max(_WEIGHT_MIN, min(_WEIGHT_MAX, self._weights[key]))

        # Re-normalise to sum to 1.0
        total = sum(self._weights.values())
        self._weights = {k: round(v / total, 4) for k, v in self._weights.items()}

        # Record history
        self._weight_history.append({
            "epoch": self._epoch,
            "mean_error": round(mean_error, 2),
            "samples": len(self._feedback),
            "weights_before": old_weights,
            "weights_after": dict(self._weights),
        })

        # Clear processed feedback
        processed_count = len(self._feedback)
        self._feedback.clear()

        self._save_state()

        return {
            "status": "learned",
            "epoch": self._epoch,
            "samples_processed": processed_count,
            "mean_error": round(mean_error, 2),
            "weights": dict(self._weights),
        }

    def get_score_history(self) -> List[Dict[str, Any]]:
        """Return the full weight-adjustment history across epochs."""
        return list(self._weight_history)

    def get_feedback_count(self) -> int:
        """Number of pending (unprocessed) feedback entries."""
        return len(self._feedback)

    def reset(self) -> None:
        """Reset weights to defaults and clear all history."""
        self._weights = dict(_DEFAULT_WEIGHTS)
        self._feedback.clear()
        self._weight_history.clear()
        self._epoch = 0
        self._save_state()

    # ── persistence ─────────────────────────────────────────────────

    def _save_state(self) -> None:
        """Persist current state to JSON."""
        state = {
            "weights": self._weights,
            "epoch": self._epoch,
            "weight_history": self._weight_history[-50:],  # keep last 50
        }
        self._state_path.parent.mkdir(parents=True, exist_ok=True)
        self._state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")

    def _load_state(self) -> None:
        """Load persisted state if it exists."""
        if not self._state_path.exists():
            return
        try:
            state = json.loads(self._state_path.read_text(encoding="utf-8"))
            self._weights = state.get("weights", dict(_DEFAULT_WEIGHTS))
            self._epoch = state.get("epoch", 0)
            self._weight_history = state.get("weight_history", [])
        except (json.JSONDecodeError, KeyError):
            # Corrupted state — reset to defaults silently
            pass
