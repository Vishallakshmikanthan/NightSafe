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


class SafetyScoreResponse(BaseModel):
    street_id: str
    street_name: str
    hour: int
    safety_score: float
    zone: str


class DangerZoneResponse(BaseModel):
    street_id: str
    street_name: str
    hour: int
    safety_score: float
    zone: str


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
