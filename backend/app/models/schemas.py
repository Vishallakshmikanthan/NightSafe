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
