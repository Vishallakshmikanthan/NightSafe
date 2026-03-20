"""
NightSafe — Multi-Agent Architecture

Five specialised agents that cooperate to deliver real-time safety
intelligence:

1. DataAgent      – ingests and normalises raw street data
2. GeoAgent       – spatial clustering and coordinate handling
3. RiskAgent      – predictive safety scoring
4. AnomalyAgent   – detects sudden safety-score drops
5. AlertAgent     – dispatches alerts to users and police
"""

from app.agents.data_agent import DataAgent
from app.agents.geo_agent import GeoAgent
from app.agents.risk_agent import RiskAgent
from app.agents.anomaly_agent import AnomalyAgent
from app.agents.alert_agent import AlertAgent

__all__ = [
    "DataAgent",
    "GeoAgent",
    "RiskAgent",
    "AnomalyAgent",
    "AlertAgent",
]
