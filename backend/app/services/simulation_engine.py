"""
Real-Time Simulation Engine

Responsible for:
- Simulating live safety-score updates on a configurable interval
- Applying small stochastic perturbations to model real-world noise
- Cycling through hours to emulate nighttime progression
- Providing a snapshot of the latest simulated state to the API
"""

from __future__ import annotations

import math
import random
import time
import threading
from typing import Any, Dict, List, Optional


class SimulationEngine:
    """
    Periodically perturbs the baseline safety scores to mimic a live
    data feed.  Runs in a background daemon thread so it doesn't block
    the FastAPI event loop.
    """

    def __init__(
        self,
        baseline_rows: List[Dict[str, Any]],
        interval_seconds: float = 30.0,
        noise_pct: float = 5.0,
    ) -> None:
        """
        Parameters
        ----------
        baseline_rows : scored street records (from RiskAgent / safety_service)
        interval_seconds : how often to refresh the simulated scores
        noise_pct : max percentage perturbation per tick (default ±5 %)
        """
        self._baseline = baseline_rows
        self._interval = interval_seconds
        self._noise_pct = noise_pct
        self._current_state: List[Dict[str, Any]] = list(baseline_rows)
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._tick: int = 0
        self._last_update: float = time.time()
        self._rng = random.Random(42)

    # ── public API ──────────────────────────────────────────────────

    def start(self) -> None:
        """Launch the background simulation loop."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Gracefully stop the simulation."""
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=5)
            self._thread = None

    @property
    def is_running(self) -> bool:
        return self._running

    def snapshot(self) -> List[Dict[str, Any]]:
        """Return the latest simulated state (thread-safe read)."""
        return list(self._current_state)

    def snapshot_for_hour(self, hour: int) -> List[Dict[str, Any]]:
        """Filter the current snapshot to a specific hour."""
        return [r for r in self._current_state if r["hour"] == hour]

    def get_status(self) -> Dict[str, Any]:
        """Return simulation metadata."""
        return {
            "running": self._running,
            "tick": self._tick,
            "interval_seconds": self._interval,
            "noise_pct": self._noise_pct,
            "last_update": self._last_update,
            "total_records": len(self._current_state),
        }

    # ── internal loop ───────────────────────────────────────────────

    def _loop(self) -> None:
        """Background tick loop."""
        while self._running:
            self._tick += 1
            self._simulate_tick()
            self._last_update = time.time()
            time.sleep(self._interval)

    def _simulate_tick(self) -> None:
        """
        Apply stochastic perturbation to every record's safety_score.

        The noise is Gaussian with a small magnitude so scores drift
        gradually — mimicking real sensor/data fluctuation.
        """
        from ml.safety_model import classify

        updated: List[Dict[str, Any]] = []
        for row in self._current_state:
            base_score = row["safety_score"]

            # Gaussian noise bounded by ±noise_pct% of score
            max_delta = base_score * (self._noise_pct / 100.0)
            delta = self._rng.gauss(0, max_delta / 2)  # 95 % within ±max_delta

            new_score = round(max(0.0, min(100.0, base_score + delta)), 1)

            updated.append({
                **row,
                "safety_score": new_score,
                "zone": classify(new_score),
                "simulated": True,
                "tick": self._tick,
            })

        self._current_state = updated
