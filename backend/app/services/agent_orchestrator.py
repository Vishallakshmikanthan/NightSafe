"""
Agent Orchestrator

Central coordinator that initialises all five agents, wires them
together, and exposes high-level operations consumed by the API layer.

This is a singleton — import ``orchestrator`` from this module.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project root is importable
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.agents.data_agent import DataAgent
from app.agents.geo_agent import GeoAgent
from app.agents.risk_agent import RiskAgent
from app.agents.anomaly_agent import AnomalyAgent
from app.agents.alert_agent import AlertAgent
from app.services.learning_service import ContinuousLearningModule
from app.services.simulation_engine import SimulationEngine


class AgentOrchestrator:
    """
    Coordinates the five-agent pipeline:

    DataAgent → RiskAgent → AnomalyAgent
                         ↘ GeoAgent (spatial)
                         ↘ AlertAgent (dispatch)

    Plus: ContinuousLearningModule and SimulationEngine as support services.
    """

    def __init__(self) -> None:
        # Agents
        self.data_agent = DataAgent()
        self.geo_agent = GeoAgent()
        self.risk_agent = RiskAgent()
        self.anomaly_agent = AnomalyAgent()
        self.alert_agent = AlertAgent()

        # Services
        self.learning = ContinuousLearningModule()
        self._simulation: Optional[SimulationEngine] = None

        # Internal state
        self._scored_data: Optional[List[Dict[str, Any]]] = None

    # ── Bootstrap ───────────────────────────────────────────────────

    def boot(self) -> None:
        """
        Run the full agent pipeline once at startup:
        1. DataAgent loads raw data
        2. RiskAgent scores everything
        3. AnomalyAgent builds baseline history
        """
        raw = self.data_agent.load()
        self._scored_data = self.risk_agent.score_all(raw)
        self.anomaly_agent.update_history(self._scored_data)

    def _ensure_booted(self) -> List[Dict[str, Any]]:
        """Lazy-boot on first API call if not already initialised."""
        if self._scored_data is None:
            self.boot()
        return self._scored_data  # type: ignore[return-value]

    # ── Anomaly detection ───────────────────────────────────────────

    def get_anomalies(self) -> List[Dict[str, Any]]:
        data = self._ensure_booted()
        anomalies = self.anomaly_agent.detect(data)
        return [
            {
                "street_id": a.street_id,
                "street_name": a.street_name,
                "hour": a.hour,
                "score": a.score,
                "expected_score": a.expected_score,
                "deviation": a.deviation,
                "drop_magnitude": a.drop_magnitude,
                "severity": a.severity,
            }
            for a in anomalies
        ]

    # ── Geo-mapping clusters ───────────────────────────────────────

    def get_geo_clusters(self, hour: int) -> List[Dict[str, Any]]:
        data = self._ensure_booted()
        score_map = {
            r["street_id"]: r["safety_score"]
            for r in data if r["hour"] == hour
        }
        clusters = self.geo_agent.cluster_safety(score_map)
        # Convert tuple keys to lists for JSON serialisation
        for c in clusters:
            c["grid"] = list(c["grid"])
        return clusters

    # ── Predictive risk ────────────────────────────────────────────

    def predict_all(self, current_hour: int) -> List[Dict[str, Any]]:
        data = self._ensure_booted()

        # Group by street
        by_street: Dict[str, List[Dict[str, Any]]] = {}
        for r in data:
            by_street.setdefault(r["street_id"], []).append(r)

        predictions: List[Dict[str, Any]] = []
        for sid, rows in by_street.items():
            pred = self.risk_agent.predict_next_hour(rows)
            if pred is not None:
                predictions.append(pred)

        return predictions

    # ── Police & GCC alerts ────────────────────────────────────────

    def get_police_alerts(self) -> List[Dict[str, Any]]:
        data = self._ensure_booted()
        anomalies = self.anomaly_agent.detect(data)
        alerts = self.alert_agent.generate_police_alerts(anomalies)
        return self.alert_agent.get_alert_log(alert_type="POLICE")

    def get_gcc_alerts(self) -> List[Dict[str, Any]]:
        data = self._ensure_booted()
        anomalies = self.anomaly_agent.detect(data)
        alerts = self.alert_agent.generate_gcc_alerts(anomalies)
        return self.alert_agent.get_alert_log(alert_type="GCC")

    # ── Investment report ──────────────────────────────────────────

    def get_investment_report(self, top_n: int = 10) -> Dict[str, Any]:
        from ml.investment_model import (
            _load_rows, aggregate_streets, compute_priority,
            rank_streets, generate_json,
        )
        rows = _load_rows()
        streets = aggregate_streets(rows)
        streets = compute_priority(streets)
        ranked = rank_streets(streets, top_n=top_n)
        return generate_json(ranked)

    # ── Continuous learning ────────────────────────────────────────

    def submit_feedback(
        self,
        street_id: str,
        hour: int,
        reported_score: float,
        actual_feeling: float,
        source: str = "user",
    ) -> None:
        self.learning.submit_feedback(
            street_id=street_id,
            hour=hour,
            reported_score=reported_score,
            actual_feeling=actual_feeling,
            source=source,
        )

    def learn(self) -> Dict[str, Any]:
        return self.learning.learn()

    # ── Real-time simulation ───────────────────────────────────────

    def start_simulation(self, interval_seconds: float = 30.0) -> None:
        data = self._ensure_booted()
        if self._simulation is not None and self._simulation.is_running:
            self._simulation.stop()
        self._simulation = SimulationEngine(
            baseline_rows=data,
            interval_seconds=interval_seconds,
        )
        self._simulation.start()

    def stop_simulation(self) -> None:
        if self._simulation is not None:
            self._simulation.stop()

    def get_simulation_status(self) -> Dict[str, Any]:
        if self._simulation is None:
            return {
                "running": False, "tick": 0,
                "interval_seconds": 0, "noise_pct": 0,
                "last_update": 0, "total_records": 0,
            }
        return self._simulation.get_status()

    def get_simulation_snapshot(self, hour: Optional[int] = None) -> List[Dict[str, Any]]:
        if self._simulation is None:
            return []
        if hour is not None:
            return self._simulation.snapshot_for_hour(hour)
        return self._simulation.snapshot()


# ── Module-level singleton ──────────────────────────────────────────

orchestrator = AgentOrchestrator()
