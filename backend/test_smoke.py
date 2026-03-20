"""Quick smoke test for the service layer."""
from app.services.safety_service import (
    get_all_streets,
    get_safety_score,
    get_danger_zones,
    get_transition_alerts,
)

streets = get_all_streets()
print(f"Total street records: {len(streets)}")
print(f"First record: {streets[0]}")

score = get_safety_score("CHN-001", 22)
print(f"Safety score CHN-001 @22h: {score}")

score_missing = get_safety_score("INVALID", 22)
print(f"Missing street: {score_missing}")

danger = get_danger_zones(23)
print(f"Danger zones at 23h: {len(danger)} streets")
for d in danger[:3]:
    print(f"  {d['street_id']} {d['street_name']} -> {d['safety_score']}")

alerts = get_transition_alerts()
print(f"Transition alerts: {len(alerts)}")
for a in alerts[:3]:
    print(f"  {a['street_id']} {a['street_name']} dropped to {a['score']} at hour {a['hour']}")
