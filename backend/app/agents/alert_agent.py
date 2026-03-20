"""
Alert & Dispatch Agent

Responsible for:
- Generating alerts for end-users when they are near danger zones
- Dispatching notifications to police for CRITICAL / HIGH anomalies
- Maintaining an in-memory alert log for audit
- Providing structured alert payloads for the dashboard endpoints
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.agents.anomaly_agent import Anomaly


@dataclass
class Alert:
    """A dispatched alert record."""
    alert_id: str
    timestamp: str
    alert_type: str          # USER / POLICE / GCC
    severity: str            # LOW / MEDIUM / HIGH / CRITICAL
    street_id: str
    street_name: str
    hour: int
    safety_score: float
    message: str
    dispatched_to: str       # "user" / "police" / "gcc_dashboard"
    acknowledged: bool = False


class AlertAgent:
    """Generates and dispatches alerts based on danger zones and anomalies."""

    def __init__(self) -> None:
        self._alert_log: List[Alert] = []
        self._counter: int = 0

    # ── public API ──────────────────────────────────────────────────

    def generate_user_alerts(
        self, danger_zones: List[Dict[str, Any]],
    ) -> List[Alert]:
        """
        Create USER-level alerts for all streets currently in DANGER zone.
        These are shown as toasts / push notifications to nearby users.
        """
        alerts: List[Alert] = []
        for dz in danger_zones:
            alert = self._create_alert(
                alert_type="USER",
                severity="HIGH" if dz["safety_score"] < 25 else "MEDIUM",
                street_id=dz["street_id"],
                street_name=dz["street_name"],
                hour=dz.get("hour", 0),
                safety_score=dz["safety_score"],
                message=(
                    f"[!] DANGER: {dz['street_name']} - Safety Score "
                    f"{dz['safety_score']:.1f}. Avoid this area."
                ),
                dispatched_to="user",
            )
            alerts.append(alert)
        return alerts

    def generate_police_alerts(
        self, anomalies: List[Anomaly],
    ) -> List[Alert]:
        """
        Create POLICE-level alerts for anomalies rated HIGH or CRITICAL.
        Only serious anomalies warrant police dispatch.
        """
        alerts: List[Alert] = []
        for a in anomalies:
            if a.severity not in ("HIGH", "CRITICAL"):
                continue
            alert = self._create_alert(
                alert_type="POLICE",
                severity=a.severity,
                street_id=a.street_id,
                street_name=a.street_name,
                hour=a.hour,
                safety_score=a.score,
                message=(
                    f"[POLICE ALERT] {a.street_name} - Score dropped to "
                    f"{a.score:.1f} (expected {a.expected_score:.1f}). "
                    f"Severity: {a.severity}. Immediate patrol recommended."
                ),
                dispatched_to="police",
            )
            alerts.append(alert)
        return alerts

    def generate_gcc_alerts(
        self, anomalies: List[Anomaly],
    ) -> List[Alert]:
        """
        Create GCC (Greater Chennai Corporation) alerts for infrastructure
        issues — lighting failures, persistent danger zones, etc.
        """
        alerts: List[Alert] = []
        for a in anomalies:
            alert = self._create_alert(
                alert_type="GCC",
                severity=a.severity,
                street_id=a.street_id,
                street_name=a.street_name,
                hour=a.hour,
                safety_score=a.score,
                message=(
                    f"[GCC INFRA ALERT] {a.street_name} - Score {a.score:.1f} "
                    f"(deviation {a.deviation:.1f} std). Review lighting and "
                    f"infrastructure status."
                ),
                dispatched_to="gcc_dashboard",
            )
            alerts.append(alert)
        return alerts

    def get_alert_log(
        self,
        alert_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Return the alert log optionally filtered by type."""
        log = self._alert_log
        if alert_type:
            log = [a for a in log if a.alert_type == alert_type]
        return [self._to_dict(a) for a in log[-limit:]]

    def acknowledge(self, alert_id: str) -> bool:
        """Mark an alert as acknowledged. Returns False if not found."""
        for alert in self._alert_log:
            if alert.alert_id == alert_id:
                alert.acknowledged = True
                return True
        return False

    # ── internals ───────────────────────────────────────────────────

    def _create_alert(self, **kwargs: Any) -> Alert:
        self._counter += 1
        alert = Alert(
            alert_id=f"ALR-{self._counter:05d}",
            timestamp=datetime.utcnow().isoformat() + "Z",
            **kwargs,
        )
        self._alert_log.append(alert)
        return alert

    @staticmethod
    def _to_dict(alert: Alert) -> Dict[str, Any]:
        return {
            "alert_id": alert.alert_id,
            "timestamp": alert.timestamp,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "street_id": alert.street_id,
            "street_name": alert.street_name,
            "hour": alert.hour,
            "safety_score": alert.safety_score,
            "message": alert.message,
            "dispatched_to": alert.dispatched_to,
            "acknowledged": alert.acknowledged,
        }
