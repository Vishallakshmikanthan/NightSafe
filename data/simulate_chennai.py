"""
NightSafe — Chennai Street-Level Data Simulator

Generates realistic hourly safety-related data for 50+ streets in Chennai
covering the 8 PM – 12 AM window.

Simulated features per street per hour:
  - footfall          : pedestrian count (drops after 9 PM)
  - lighting_status   : 0 = working, 1 = failed
  - liquor_distance   : meters to nearest liquor outlet (shrinks near 10 PM)
  - crime_score       : 0–1 historical crime intensity

Usage:
    python simulate_chennai.py          # writes data/chennai_street_data.csv
    python simulate_chennai.py --rows   # print row count and exit
"""

import csv
import random
from pathlib import Path

# ---------------------------------------------------------------------------
# Street catalog — 55 real Chennai streets / areas
# ---------------------------------------------------------------------------
STREETS = [
    "Anna Salai", "Mount Road", "T Nagar Main Road", "Pondy Bazaar",
    "Ranganathan Street", "Mylapore Kutchery Road", "Cathedral Road",
    "Nungambakkam High Road", "Cenotaph Road", "TTK Road",
    "Adyar Main Road", "Sardar Patel Road", "Dr Radhakrishnan Salai",
    "Chamiers Road", "RK Salai", "GST Road", "Velachery Main Road",
    "Tambaram Main Road", "Pallavaram High Road", "Chromepet High Road",
    "OMR Thoraipakkam", "OMR Sholinganallur", "OMR Navalur",
    "ECR Thiruvanmiyur", "ECR Besant Nagar", "Triplicane Big Street",
    "Royapettah High Road", "Egmore High Road", "Poonamallee High Road",
    "Arcot Road Vadapalani", "Kodambakkam High Road", "Ashok Nagar 3rd Ave",
    "Porur Main Road", "Guindy Industrial Estate Rd", "Perambur High Road",
    "Broadway", "NSC Bose Road", "Rajaji Salai", "Kamarajar Salai",
    "Marina Beach Road", "Santhome High Road", "Foreshore Estate Rd",
    "RA Puram 1st Main Road", "Besant Nagar 5th Avenue",
    "Thiruvanmiyur Bank Colony", "Palavakkam Main Road",
    "Neelankarai Main Road", "Injambakkam Coast Road",
    "Anna Nagar 2nd Avenue", "Anna Nagar Tower Park Road",
    "Mogappair Main Road", "Ambattur OT Road", "Avadi Main Road",
    "Kolathur High Road", "Tondiarpet High Road",
]

HOURS = [20, 21, 22, 23, 0]  # 8 PM through midnight

# ---------------------------------------------------------------------------
# Per-street baseline profiles (seeded from street index for determinism)
# ---------------------------------------------------------------------------


def _street_profile(idx: int) -> dict:
    """Return a deterministic baseline profile for a street."""
    rng = random.Random(idx * 7 + 3)  # per-street seed
    return {
        "base_footfall": rng.randint(80, 350),       # peak-hour footfall
        "light_fail_prob": rng.uniform(0.02, 0.20),   # prob a light is failed
        "base_liquor_dist": rng.randint(30, 800),      # meters
        "base_crime": round(rng.uniform(0.05, 0.85), 3),
        "is_commercial": rng.random() < 0.45,
    }


# ---------------------------------------------------------------------------
# Hourly modulation functions
# ---------------------------------------------------------------------------

def _footfall(base: int, hour: int, is_commercial: bool, rng: random.Random) -> int:
    """
    Realistic footfall curve:
      8 PM  — peak (100 % of base)
      9 PM  — starts dropping (~75 %)
      10 PM — sharper drop (~45 %), commercial areas hold ~60 %
      11 PM — low (~25 %)
      12 AM — very low (~12 %)
    """
    multipliers = {
        20: 1.00,
        21: 0.75,
        22: 0.60 if is_commercial else 0.45,
        23: 0.25,
        0:  0.12,
    }
    m = multipliers[hour]
    noise = rng.gauss(0, 0.08)
    return max(0, int(base * (m + noise)))


def _lighting_status(fail_prob: float, hour: int, rng: random.Random) -> int:
    """
    Light failure probability increases slightly as night progresses
    (maintenance crews off-shift).  Returns 0 (working) or 1 (failed).
    """
    hour_bump = {20: 0.0, 21: 0.01, 22: 0.02, 23: 0.04, 0: 0.05}
    p = min(fail_prob + hour_bump[hour], 0.40)
    return 1 if rng.random() < p else 0


def _liquor_distance(base_dist: int, hour: int, rng: random.Random) -> int:
    """
    Effective perceived proximity to liquor outlets.
    At 10 PM TASMAC bars close — crowds spill out, effectively
    reducing 'safe distance'.  Models a spike at 10 PM.
    """
    scale = {
        20: 1.0,
        21: 0.90,
        22: 0.50,   # 10 PM spike — closing-time crowds
        23: 0.70,   # dispersing
        0:  0.85,
    }
    noise = rng.gauss(0, 0.06)
    dist = int(base_dist * max(0.15, scale[hour] + noise))
    return max(5, dist)


def _crime_score(base: float, hour: int, lighting_failed: bool,
                 rng: random.Random) -> float:
    """
    Crime score rises as night deepens and lighting fails.
    """
    hour_bump = {20: 0.0, 21: 0.03, 22: 0.08, 23: 0.14, 0: 0.20}
    light_bump = 0.10 if lighting_failed else 0.0
    noise = rng.gauss(0, 0.03)
    score = base + hour_bump[hour] + light_bump + noise
    return round(min(max(score, 0.0), 1.0), 3)


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

def generate_rows(seed: int = 42) -> list[dict]:
    """Produce all rows for the Chennai street dataset."""
    master_rng = random.Random(seed)
    rows = []

    for idx, street_name in enumerate(STREETS):
        profile = _street_profile(idx)
        street_id = f"CHN-{idx + 1:03d}"

        for hour in HOURS:
            # Fresh per-row RNG derived from master to stay reproducible
            row_seed = master_rng.randint(0, 2**31)
            rng = random.Random(row_seed)

            lit = _lighting_status(profile["light_fail_prob"], hour, rng)
            rows.append({
                "street_id": street_id,
                "street_name": street_name,
                "hour": hour,
                "footfall": _footfall(
                    profile["base_footfall"], hour,
                    profile["is_commercial"], rng,
                ),
                "lighting_status": lit,
                "liquor_distance": _liquor_distance(
                    profile["base_liquor_dist"], hour, rng,
                ),
                "crime_score": _crime_score(
                    profile["base_crime"], hour, lit == 1, rng,
                ),
            })

    return rows


# ---------------------------------------------------------------------------
# CSV writer
# ---------------------------------------------------------------------------

FIELDNAMES = [
    "street_id", "street_name", "hour",
    "footfall", "lighting_status", "liquor_distance", "crime_score",
]


def write_csv(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Simulate Chennai street data")
    parser.add_argument("--rows", action="store_true", help="Print row count only")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    data = generate_rows(seed=args.seed)

    if args.rows:
        print(f"{len(data)} rows ({len(STREETS)} streets × {len(HOURS)} hours)")
        return

    out_path = Path(__file__).resolve().parent / "chennai_street_data.csv"
    write_csv(data, out_path)
    print(f"Wrote {len(data)} rows to {out_path}")


if __name__ == "__main__":
    main()
