from pydantic import BaseModel
from typing import Optional, List


class SafetyPoint(BaseModel):
    lat: float
    lng: float
    score: float  # 0-100
    label: Optional[str] = None


class RouteRequest(BaseModel):
    origin: str
    destination: str


class RouteResponse(BaseModel):
    origin: str
    destination: str
    route: List[SafetyPoint]
    total_safety_score: float


# ── Street & safety-score response models ──────────────────────────

class StreetRecord(BaseModel):
    street_id: str
    street_name: str
    hour: int
    footfall: int
    lighting_status: int
    liquor_distance: int
    crime_score: float
    safety_score: float
    zone: str
    explanation: List[str] = []


class SafetyScoreResponse(BaseModel):
    street_id: str
    street_name: str
    hour: int
    safety_score: float
    zone: str
    explanation: List[str] = []


class DangerZoneResponse(BaseModel):
    street_id: str
    street_name: str
    hour: int
    safety_score: float
    zone: str
    explanation: List[str] = []


class TransitionAlertResponse(BaseModel):
    street_id: str
    street_name: str
    hour: int
    score: float
    prev_hour: Optional[int] = None
    prev_score: Optional[float] = None


class AlertResponse(BaseModel):
    street_id: str
    street_name: str
    hour: int
    safety_score: float
    zone: str
    explanation: List[str] = []
    message: str


# ── Safe-route response models ─────────────────────────────────────

class SafeRouteStep(BaseModel):
    street_id: str
    street_name: str
    lat: float
    lng: float
    safety_score: float
    zone: str


class SafeRouteResponse(BaseModel):
    start: str
    end: str
    hour: int
    route: List[SafeRouteStep]
    total_streets: int
    avg_safety_score: float


class StreetNameEntry(BaseModel):
    street_id: str
    street_name: str


# ── Investment recommendation models ───────────────────────────────

class InvestmentRecommendation(BaseModel):
    rank: int
    street_id: str
    street_name: str
    investment_priority: float
    danger_freq_pct: float
    avg_safety_score: float
    min_safety_score: float
    total_footfall: int
    avg_crime_score: float
    lighting_failures: int


class InvestmentReport(BaseModel):
    metadata: dict
    recommendations: List[InvestmentRecommendation]


# ── Anomaly detection models ───────────────────────────────────────

class AnomalyResponse(BaseModel):
    street_id: str
    street_name: str
    hour: int
    score: float
    expected_score: float
    deviation: float
    drop_magnitude: float
    severity: str


# ── Police & GCC dashboard models ─────────────────────────────────

class PoliceAlertResponse(BaseModel):
    alert_id: str
    timestamp: str
    alert_type: str
    severity: str
    street_id: str
    street_name: str
    hour: int
    safety_score: float
    message: str
    dispatched_to: str
    acknowledged: bool


# ── Geo-cluster models ─────────────────────────────────────────────

class GeoClusterResponse(BaseModel):
    grid: List[int]
    center_lat: float
    center_lng: float
    street_count: int
    street_ids: List[str]
    avg_safety: Optional[float] = None


# ── Continuous learning models ─────────────────────────────────────

class FeedbackRequest(BaseModel):
    street_id: str
    hour: int
    reported_score: float
    actual_feeling: float
    source: str = "user"


class LearningStatusResponse(BaseModel):
    weights: dict
    epoch: int
    pending_feedback: int


# ── Simulation models ──────────────────────────────────────────────

class SimulationStatusResponse(BaseModel):
    running: bool
    tick: int
    interval_seconds: float
    noise_pct: float
    last_update: float
    total_records: int


# ── Risk prediction models ─────────────────────────────────────────

class PredictionResponse(BaseModel):
    street_id: str
    street_name: str
    predicted_hour: int
    predicted_score: float
    predicted_zone: str
    trend: str
    confidence: str
