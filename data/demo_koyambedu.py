"""
NightSafe — Koyambedu Danger Transition Demo Scenario

Generates a scripted, PPT-ready demo dataset showing a realistic
safety degradation timeline for Koyambedu High Road:

  8:00 PM  → SAFE     (score ~75)
  9:30 PM  → CAUTION  (score ~50)
 10:10 PM  → DANGER   (score ~30)
 10:15 PM  → CRITICAL (score ~20)

Outputs:
  data/demo_koyambedu_scenario.json   — full scenario with explanation logs
  data/demo_koyambedu_timeline.json   — minimal timeline for frontend

Usage:
    python data/demo_koyambedu.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

# Allow importing ml package from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.safety_model import score_safety, classify, DANGER, CAUTION, SAFE  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Street identity
# ---------------------------------------------------------------------------
STREET_ID = "CHN-KYB-DEMO"
STREET_NAME = "Koyambedu High Road"
STREET_LAT = 13.0694
STREET_LNG = 80.1948

# ---------------------------------------------------------------------------
# Scripted timeline — each point is hand-tuned to hit the PPT targets
# when passed through the real score_safety() formula.
# ---------------------------------------------------------------------------
TIMELINE = [
    {
        "time": "20:00",
        "label": "8:00 PM — SAFE",
        "hour": 20,
        "footfall": 235,
        "lighting_status": 0,
        "liquor_distance": 390,
        "crime_score": 0.40,
        "target_zone": "SAFE",
        "narrative": "Evening bustle. Streets are well-lit, shops open, "
                     "healthy pedestrian traffic. Nearest TASMAC outlet "
                     "is 390 m away — no visible crowd.",
        "trigger": None,
    },
    {
        "time": "21:30",
        "label": "9:30 PM — CAUTION",
        "hour": 21,
        "footfall": 48,
        "lighting_status": 0,
        "liquor_distance": 140,
        "crime_score": 0.58,
        "target_zone": "CAUTION",
        "narrative": "Footfall drops sharply as shops close. Lighting "
                     "still functional, but TASMAC crowd activity "
                     "pulls the effective liquor distance to 140 m. "
                     "Crime baseline rises with fewer witnesses.",
        "trigger": "footfall_drop",
    },
    {
        "time": "22:10",
        "label": "10:10 PM — DANGER",
        "hour": 22,
        "footfall": 100,
        "lighting_status": 1,
        "liquor_distance": 260,
        "crime_score": 0.40,
        "target_zone": "DANGER",
        "narrative": "Critical lighting failure at 10:07 PM — two "
                     "consecutive streetlights go dark (maintenance "
                     "off-shift). TASMAC bars closing; crowd spills "
                     "onto the street. The 30% lighting weight crashes "
                     "the score despite moderate footfall.",
        "trigger": "lighting_failure",
    },
    {
        "time": "22:15",
        "label": "10:15 PM — CRITICAL",
        "hour": 22,
        "footfall": 45,
        "lighting_status": 1,
        "liquor_distance": 120,
        "crime_score": 0.55,
        "target_zone": "DANGER",
        "narrative": "Post-TASMAC surge: intoxicated crowds at 120 m "
                     "proximity. Footfall collapses to 45 as regular "
                     "pedestrians avoid the area. Lighting still "
                     "failed. Crime risk spikes. Score enters critical "
                     "band (<25) — NightSafe triggers emergency alert.",
        "trigger": "liquor_surge",
    },
]


# ---------------------------------------------------------------------------
# Score each timeline point with the REAL safety model
# ---------------------------------------------------------------------------

def build_scenario() -> dict:
    """Build the full demo scenario with computed scores and explanation logs."""
    points = []
    prev_score = None
    prev_zone = None

    for tp in TIMELINE:
        score = score_safety(
            footfall=tp["footfall"],
            lighting_status=tp["lighting_status"],
            liquor_distance=tp["liquor_distance"],
            crime_score=tp["crime_score"],
            hour=tp["hour"],
        )
        zone = classify(score)

        # Build per-factor breakdown
        from ml.safety_model import (
            _footfall_component, _lighting_component,
            _liquor_component, _crime_component,
            W_FOOTFALL, W_LIGHTING, W_LIQUOR, W_CRIME,
        )
        f_foot = round(_footfall_component(tp["footfall"]) * 100, 1)
        f_light = round(_lighting_component(tp["lighting_status"]) * 100, 1)
        f_liq = round(_liquor_component(tp["liquor_distance"], tp["hour"]) * 100, 1)
        f_crime = round(_crime_component(tp["crime_score"]) * 100, 1)

        # Explanation log for this transition
        explanation = {
            "factors": {
                "footfall": {
                    "value": tp["footfall"],
                    "component_score": f_foot,
                    "weight": f"{int(W_FOOTFALL*100)}%",
                    "weighted": round(W_FOOTFALL * f_foot, 1),
                },
                "lighting": {
                    "status": "FAILED" if tp["lighting_status"] == 1 else "OK",
                    "component_score": f_light,
                    "weight": f"{int(W_LIGHTING*100)}%",
                    "weighted": round(W_LIGHTING * f_light, 1),
                },
                "liquor_proximity": {
                    "distance_m": tp["liquor_distance"],
                    "component_score": f_liq,
                    "weight": f"{int(W_LIQUOR*100)}%",
                    "weighted": round(W_LIQUOR * f_liq, 1),
                },
                "crime_baseline": {
                    "score": tp["crime_score"],
                    "component_score": f_crime,
                    "weight": f"{int(W_CRIME*100)}%",
                    "weighted": round(W_CRIME * f_crime, 1),
                },
            },
        }

        # Delta from previous point
        if prev_score is not None:
            delta = round(score - prev_score, 1)
            explanation["delta_from_previous"] = delta
            explanation["transition"] = (
                f"{prev_zone} → {zone}" if prev_zone != zone
                else f"remains {zone}"
            )
        else:
            explanation["delta_from_previous"] = 0
            explanation["transition"] = f"baseline ({zone})"

        # Trigger explanation
        trigger_text = {
            None: "Baseline evening reading. No adverse triggers.",
            "footfall_drop": (
                "FOOTFALL DROP: Pedestrian count fell from 235 to 48 "
                "(−80%) as shops shuttered. Fewer witnesses on the "
                "street raises vulnerability. Crime score ticked up "
                "from 0.40 → 0.58."
            ),
            "lighting_failure": (
                "LIGHTING FAILURE: Two consecutive streetlights failed "
                "at 10:07 PM (maintenance off-shift). The 30% lighting "
                "weight crashes from 100 → 0, instantly dropping the "
                "composite score by ~30 points. Coincides with TASMAC "
                "closing-time penalty (hour 22 multiplier = 0.55)."
            ),
            "liquor_surge": (
                "LIQUOR SURGE: Post-TASMAC closure crowd at 120 m "
                "proximity (was 260 m). Intoxicated pedestrians "
                "replace regular foot traffic. Combined with ongoing "
                "lighting failure and elevated crime, score enters "
                "critical band (<25). NightSafe emergency alert fires."
            ),
        }
        explanation["trigger"] = tp["trigger"] or "none"
        explanation["trigger_explanation"] = trigger_text[tp["trigger"]]

        point = {
            "time": tp["time"],
            "label": tp["label"],
            "street_id": STREET_ID,
            "street_name": STREET_NAME,
            "lat": STREET_LAT,
            "lng": STREET_LNG,
            "hour": tp["hour"],
            "inputs": {
                "footfall": tp["footfall"],
                "lighting_status": tp["lighting_status"],
                "liquor_distance": tp["liquor_distance"],
                "crime_score": tp["crime_score"],
            },
            "safety_score": score,
            "zone": zone,
            "narrative": tp["narrative"],
            "explanation": explanation,
        }
        points.append(point)
        prev_score = score
        prev_zone = zone

    scenario = {
        "scenario": "Koyambedu Danger Transition — NightSafe Demo",
        "street": {
            "id": STREET_ID,
            "name": STREET_NAME,
            "lat": STREET_LAT,
            "lng": STREET_LNG,
            "area": "Koyambedu, Chennai",
            "description": (
                "Major commercial junction near CMBT bus terminus. "
                "High evening footfall from wholesale market workers "
                "and commuters. Multiple TASMAC outlets within 400 m."
            ),
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "scoring_model": "ml.safety_model.score_safety (weighted formula)",
        "timeline": points,
        "summary": {
            "start_score": points[0]["safety_score"],
            "end_score": points[-1]["safety_score"],
            "total_drop": round(points[0]["safety_score"] - points[-1]["safety_score"], 1),
            "transitions": [
                p["explanation"]["transition"] for p in points
            ],
            "primary_triggers": [
                "footfall_drop",
                "lighting_failure",
                "liquor_surge",
            ],
        },
    }
    return scenario


def build_minimal_timeline(scenario: dict) -> list[dict]:
    """Extract a minimal timeline array for frontend consumption."""
    return [
        {
            "time": p["time"],
            "score": p["safety_score"],
            "zone": p["zone"],
            "label": p["label"],
            "trigger": p["explanation"]["trigger"],
        }
        for p in scenario["timeline"]
    ]


# ---------------------------------------------------------------------------
# Console pretty-print
# ---------------------------------------------------------------------------

def print_scenario(scenario: dict) -> None:
    """Print a formatted summary to the console."""
    print("=" * 70)
    print(f"  {scenario['scenario']}")
    print("=" * 70)
    print(f"  Street : {scenario['street']['name']}")
    print(f"  Area   : {scenario['street']['area']}")
    print(f"  Coords : {scenario['street']['lat']}, {scenario['street']['lng']}")
    print()

    for p in scenario["timeline"]:
        expl = p["explanation"]
        zone_icon = {"SAFE": "[OK]", "CAUTION": "[!!]", "DANGER": "[XX]"}
        icon = zone_icon.get(p["zone"], "[??]")

        print(f"  {icon}  {p['label']}")
        print(f"       Score: {p['safety_score']:.1f}/100  |  Zone: {p['zone']}")
        print(f"       Footfall: {p['inputs']['footfall']:<6} "
              f"Light: {'FAIL' if p['inputs']['lighting_status'] else ' OK '} "
              f"Liquor: {p['inputs']['liquor_distance']}m  "
              f"Crime: {p['inputs']['crime_score']}")
        print(f"       Delta: {expl['delta_from_previous']:+.1f}  |  "
              f"{expl['transition']}")
        if expl["trigger"] != "none":
            print(f"       >>> {expl['trigger_explanation'][:100]}...")
        print()

    s = scenario["summary"]
    print("-" * 70)
    print(f"  Total score drop: {s['start_score']:.1f} → {s['end_score']:.1f} "
          f"(−{s['total_drop']:.1f} points)")
    print(f"  Triggers: {', '.join(s['primary_triggers'])}")
    print("=" * 70)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    scenario = build_scenario()

    # Write full scenario JSON
    full_path = DATA_DIR / "demo_koyambedu_scenario.json"
    with open(full_path, "w", encoding="utf-8") as f:
        json.dump(scenario, f, indent=2)
    print(f"[+] Full scenario  → {full_path}")

    # Write minimal timeline JSON
    timeline = build_minimal_timeline(scenario)
    tl_path = DATA_DIR / "demo_koyambedu_timeline.json"
    with open(tl_path, "w", encoding="utf-8") as f:
        json.dump(timeline, f, indent=2)
    print(f"[+] Timeline       → {tl_path}")
    print()

    # Pretty-print
    print_scenario(scenario)


if __name__ == "__main__":
    main()
