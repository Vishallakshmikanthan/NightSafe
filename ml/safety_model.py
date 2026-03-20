"""
NightSafe — Safety Score Model (Chennai)

Weighted scoring formula that converts street-level features into a
0–100 safety score and classifies each reading into a danger zone.

Feature weights (from NightSafe design doc):
  footfall          35 %   — lower crowd → more danger
  lighting_status   30 %   — failed light → strong danger spike
  liquor_distance   20 %   — proximity < 200 m → danger, spikes at 10 PM
  crime_score       15 %   — historical baseline risk (0-1)

Score bands:
  > 70   SAFE
  40-70  CAUTION
  < 40   DANGER

Usage:
    # Score a single observation
    from ml.safety_model import score_safety, classify, DANGER
    s = score_safety(footfall=120, lighting_status=0,
                     liquor_distance=350, crime_score=0.3, hour=21)
    print(s, classify(s))

    # Score the full Chennai CSV
    python -m ml.safety_model                # pretty-print summary
    python -m ml.safety_model --csv          # write scored CSV
"""

from __future__ import annotations

import csv
import math
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Weights (must sum to 1.0)
W_FOOTFALL = 0.35
W_LIGHTING = 0.30
W_LIQUOR = 0.20
W_CRIME = 0.15

# Thresholds
SAFE_THRESHOLD = 70
CAUTION_THRESHOLD = 40

# Zone labels
SAFE = "SAFE"
CAUTION = "CAUTION"
DANGER = "DANGER"

# Reference maxima for normalisation (derived from Chennai data ranges)
FOOTFALL_MAX = 400  # approx peak observed
LIQUOR_SAFE_DIST = 800  # meters — beyond this, minimal liquor effect

# ---------------------------------------------------------------------------
# Core scoring functions
# ---------------------------------------------------------------------------


def _footfall_component(footfall: int) -> float:
    """
    Higher footfall → safer (score closer to 1.0).
    Uses a sqrt curve so the first ~100 pedestrians matter most.
    """
    normed = min(footfall / FOOTFALL_MAX, 1.0)
    return math.sqrt(normed)


def _lighting_component(lighting_status: int) -> float:
    """
    0 (working) → 1.0, 1 (failed) → 0.0.
    Binary but dominant — a failed light is an immediate hazard.
    """
    return 1.0 if lighting_status == 0 else 0.0


def _liquor_component(liquor_distance: int, hour: int) -> float:
    """
    Farther from liquor outlet → safer.
    At 10 PM (hour == 22) TASMAC bars close — apply a penalty multiplier
    that decays in the hours after.
    """
    # Base distance score: linear up to LIQUOR_SAFE_DIST
    base = min(liquor_distance / LIQUOR_SAFE_DIST, 1.0)

    # Hour-based penalty (closing-time effect)
    hour_penalty = {
        20: 1.00,
        21: 1.00,
        22: 0.55,  # sharp penalty at 10 PM
        23: 0.75,  # dispersing
        0: 0.90,   # mostly gone
    }
    multiplier = hour_penalty.get(hour, 1.0)

    return base * multiplier


def _crime_component(crime_score: float) -> float:
    """
    crime_score is 0-1 where 1 = highest crime.
    Invert so 0 crime → 1.0 safety component.
    """
    return 1.0 - min(max(crime_score, 0.0), 1.0)


def score_safety(
    footfall: int,
    lighting_status: int,
    liquor_distance: int,
    crime_score: float,
    hour: int,
) -> float:
    """
    Compute a 0-100 safety score from street-level features.

    Parameters
    ----------
    footfall        : pedestrian count for the hour
    lighting_status : 0 = working, 1 = failed
    liquor_distance : meters to nearest liquor outlet
    crime_score     : 0-1 historical crime intensity
    hour            : 24-hour clock (20-23, 0 for midnight)

    Returns
    -------
    float : safety score rounded to 1 decimal place (0 = critical, 100 = safe)
    """
    raw = (
        W_FOOTFALL * _footfall_component(footfall)
        + W_LIGHTING * _lighting_component(lighting_status)
        + W_LIQUOR * _liquor_component(liquor_distance, hour)
        + W_CRIME * _crime_component(crime_score)
    )
    return round(max(0.0, min(raw * 100, 100.0)), 1)


# ---------------------------------------------------------------------------
# Explanation generator
# ---------------------------------------------------------------------------


def explain_safety(
    footfall: int,
    lighting_status: int,
    liquor_distance: int,
    crime_score: float,
    hour: int,
) -> List[str]:
    """
    Return a list of human-readable reasons explaining the safety score.
    Each string describes one contributing factor.
    """
    reasons: List[str] = []

    # Footfall
    footfall_pct = (footfall / FOOTFALL_MAX) * 100
    if footfall_pct < 20:
        reasons.append(f"Footfall dropped by {100 - footfall_pct:.0f}% (only {footfall} people/hr)")
    elif footfall_pct < 50:
        reasons.append(f"Moderate footfall ({footfall} people/hr)")

    # Lighting
    if lighting_status == 1:
        reasons.append("Streetlight failure detected")

    # Liquor proximity
    if liquor_distance < 150:
        reasons.append(f"Liquor outlet within {liquor_distance}m")
    elif liquor_distance < 300:
        reasons.append(f"Liquor outlet nearby ({liquor_distance}m)")

    # Liquor hour penalty
    if hour in (22, 23, 0) and liquor_distance < 500:
        reasons.append("Bar closing-time effect active")

    # Crime
    if crime_score > 0.7:
        reasons.append(f"High crime history for this time ({crime_score:.0%})")
    elif crime_score > 0.4:
        reasons.append(f"Moderate crime history ({crime_score:.0%})")

    # If nothing flagged, the street is relatively safe
    if not reasons:
        reasons.append("No major risk factors identified")

    return reasons


# ---------------------------------------------------------------------------
# Classification & transition detection
# ---------------------------------------------------------------------------


def classify(score: float) -> str:
    """Map a safety score to a zone label."""
    if score > SAFE_THRESHOLD:
        return SAFE
    if score >= CAUTION_THRESHOLD:
        return CAUTION
    return DANGER


@dataclass
class TransitionPoint:
    """Records the moment a street's score crosses into DANGER."""
    street_id: str
    street_name: str
    hour: int
    score: float
    prev_hour: Optional[int]
    prev_score: Optional[float]


def detect_transitions(rows: List[dict]) -> List[TransitionPoint]:
    """
    Walk through rows (sorted by street then hour) and find the first
    hour where each street's score drops below the CAUTION threshold (40).
    """
    # Group by street
    by_street: dict[str, list[dict]] = {}
    for r in rows:
        by_street.setdefault(r["street_id"], []).append(r)

    hour_order = [20, 21, 22, 23, 0]
    transitions: List[TransitionPoint] = []

    for sid, street_rows in sorted(by_street.items()):
        lookup = {r["hour"]: r for r in street_rows}
        prev_score: Optional[float] = None
        prev_hour: Optional[int] = None
        already_flagged = False

        for h in hour_order:
            row = lookup.get(h)
            if row is None:
                continue

            score = row["safety_score"]
            zone = classify(score)

            if zone == DANGER and not already_flagged:
                transitions.append(TransitionPoint(
                    street_id=sid,
                    street_name=row["street_name"],
                    hour=h,
                    score=score,
                    prev_hour=prev_hour,
                    prev_score=prev_score,
                ))
                already_flagged = True

            prev_score = score
            prev_hour = h

    return transitions


# ---------------------------------------------------------------------------
# Batch scoring — reads Chennai CSV, scores every row
# ---------------------------------------------------------------------------

SCORED_FIELDNAMES = [
    "street_id", "street_name", "hour",
    "footfall", "lighting_status", "liquor_distance", "crime_score",
    "safety_score", "zone",
]


def score_chennai_csv(
    input_path: Optional[Path] = None,
) -> List[dict]:
    """
    Load the Chennai street data CSV, compute safety scores, and return
    enriched rows.
    """
    if input_path is None:
        input_path = DATA_DIR / "chennai_street_data.csv"

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        raw_rows = list(reader)

    scored: List[dict] = []
    for r in raw_rows:
        footfall = int(r["footfall"])
        lighting = int(r["lighting_status"])
        liquor = int(r["liquor_distance"])
        crime = float(r["crime_score"])
        hour = int(r["hour"])

        s = score_safety(footfall, lighting, liquor, crime, hour)
        explanation = explain_safety(footfall, lighting, liquor, crime, hour)
        scored.append({
            "street_id": r["street_id"],
            "street_name": r["street_name"],
            "hour": hour,
            "footfall": footfall,
            "lighting_status": lighting,
            "liquor_distance": liquor,
            "crime_score": crime,
            "safety_score": s,
            "zone": classify(s),
            "explanation": explanation,
        })

    return scored


def write_scored_csv(rows: List[dict], path: Optional[Path] = None) -> Path:
    """Write scored rows to CSV."""
    if path is None:
        path = DATA_DIR / "chennai_scored.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SCORED_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    return path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    import argparse

    parser = argparse.ArgumentParser(description="NightSafe Safety Scorer")
    parser.add_argument("--csv", action="store_true",
                        help="Write scored CSV to data/chennai_scored.csv")
    args = parser.parse_args()

    rows = score_chennai_csv()

    # ---- Summary stats ----
    scores = [r["safety_score"] for r in rows]
    zones = [r["zone"] for r in rows]

    print(f"Scored {len(rows)} rows")
    print(f"  Score range : {min(scores):.1f} – {max(scores):.1f}")
    print(f"  Mean score  : {sum(scores) / len(scores):.1f}")
    print(f"  SAFE        : {zones.count(SAFE):>4}  ({zones.count(SAFE)/len(zones)*100:.1f}%)")
    print(f"  CAUTION     : {zones.count(CAUTION):>4}  ({zones.count(CAUTION)/len(zones)*100:.1f}%)")
    print(f"  DANGER      : {zones.count(DANGER):>4}  ({zones.count(DANGER)/len(zones)*100:.1f}%)")

    # ---- Hourly breakdown ----
    from collections import defaultdict
    by_hour: dict[int, list[float]] = defaultdict(list)
    for r in rows:
        by_hour[r["hour"]].append(r["safety_score"])

    print("\n  Hour   Avg Score   Zone Distribution")
    print("  ────   ─────────   ──────────────────")
    for h in [20, 21, 22, 23, 0]:
        vals = by_hour[h]
        avg = sum(vals) / len(vals)
        z_counts = {SAFE: 0, CAUTION: 0, DANGER: 0}
        for v in vals:
            z_counts[classify(v)] += 1
        print(f"  {h:02d}:00   {avg:6.1f}      "
              f"S:{z_counts[SAFE]:>2}  C:{z_counts[CAUTION]:>2}  D:{z_counts[DANGER]:>2}")

    # ---- Transition points ----
    transitions = detect_transitions(rows)
    print(f"\nDanger transition points: {len(transitions)} streets")
    for t in transitions[:10]:
        prev = f"{t.prev_hour:02d}:00 ({t.prev_score:.1f})" if t.prev_hour is not None else "—"
        print(f"  {t.street_id} {t.street_name:<30s}  "
              f"enters DANGER at {t.hour:02d}:00 (score {t.score:.1f})  "
              f"prev: {prev}")
    if len(transitions) > 10:
        print(f"  ... and {len(transitions) - 10} more")

    # ---- Optional CSV output ----
    if args.csv:
        out = write_scored_csv(rows)
        print(f"\nScored CSV written to {out}")


if __name__ == "__main__":
    main()
