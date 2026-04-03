"""
Routing service — builds a street graph and finds the safest route
between two streets using Dijkstra's algorithm.

Edge weight = 1 / safety_score  (lower score → higher cost → avoided).
Streets are connected when their geographic distance is below a threshold,
simulating walkable adjacency in Chennai.
"""

import heapq
import math
from typing import Dict, List, Optional, Tuple

from app.services.safety_service import _load_scored_data

# ── Street coordinates (must mirror frontend STREET_COORDS) ─────
STREET_COORDS: Dict[str, Tuple[float, float]] = {
    "CHN-001": (13.0604, 80.2496),
    "CHN-002": (13.0878, 80.2785),
    "CHN-003": (13.1067, 80.2849),
    "CHN-004": (13.0674, 80.2370),
    "CHN-005": (13.0500, 80.2121),
    "CHN-006": (13.0172, 80.2262),
    "CHN-007": (13.1150, 80.2912),
    "CHN-008": (13.0327, 80.2609),
    "CHN-009": (13.0438, 80.2339),
    "CHN-010": (13.1250, 80.2144),
    "CHN-011": (13.0985, 80.2656),
    "CHN-012": (13.0764, 80.2618),
    "CHN-013": (13.1097, 80.2920),
    "CHN-014": (13.0483, 80.2700),
    "CHN-015": (13.0595, 80.2760),
    "CHN-016": (13.0890, 80.2427),
    "CHN-017": (13.1044, 80.2300),
    "CHN-018": (13.1338, 80.2256),
    "CHN-019": (13.0713, 80.2938),
    "CHN-020": (13.0997, 80.2799),
    "CHN-021": (13.1072, 80.2610),
    "CHN-022": (13.1210, 80.2534),
    "CHN-023": (13.1330, 80.2690),
    "CHN-024": (13.1490, 80.2475),
    "CHN-025": (13.0637, 80.2876),
    "CHN-026": (13.0556, 80.2877),
    "CHN-027": (13.1110, 80.2370),
    "CHN-028": (13.0363, 80.2463),
    "CHN-029": (13.0106, 80.2200),
    "CHN-030": (13.1462, 80.2825),
    "CHN-031": (13.1587, 80.2636),
    "CHN-032": (13.1740, 80.2776),
    "CHN-033": (13.1289, 80.3012),
    "CHN-034": (13.1380, 80.2970),
    "CHN-035": (13.0916, 80.2927),
    "CHN-036": (13.0235, 80.2574),
    "CHN-037": (13.0008, 80.2566),
    "CHN-038": (13.0400, 80.2767),
    "CHN-039": (13.1570, 80.3016),
    "CHN-040": (13.1700, 80.2966),
    "CHN-041": (13.0826, 80.2370),
    "CHN-042": (13.0267, 80.2073),
    "CHN-043": (13.0550, 80.2210),
    "CHN-044": (13.1395, 80.2133),
    "CHN-045": (13.1520, 80.2310),
    "CHN-046": (13.0780, 80.2112),
    "CHN-047": (13.0320, 80.2380),
    "CHN-048": (13.0680, 80.2040),
    "CHN-049": (13.0160, 80.2470),
    "CHN-050": (13.1205, 80.2210),
    "CHN-051": (13.0840, 80.1920),  # Mogappair Main Road
    "CHN-052": (13.1100, 80.1450),  # Ambattur OT Road
    "CHN-053": (13.1150, 80.1100),  # Avadi Main Road
    "CHN-054": (13.1320, 80.2080),  # Kolathur High Road
    "CHN-055": (13.1180, 80.2850),  # Tondiarpet High Road
}

# Max distance (in km) to consider two streets adjacent / walkable
_ADJACENCY_RADIUS_KM = 3.0

# Minimum number of neighbours each node should have for connectivity
_MIN_NEIGHBOURS = 3


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lng points, in kilometres."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _build_adjacency() -> Dict[str, List[Tuple[str, float]]]:
    """
    Build an adjacency list based on geographic proximity.
    Each street connects to all streets within _ADJACENCY_RADIUS_KM.
    If a street has fewer than _MIN_NEIGHBOURS, its nearest ones are added
    to keep the graph connected.

    Returns {street_id: [(neighbour_id, distance_km), ...]}.
    """
    ids = list(STREET_COORDS.keys())
    adj: Dict[str, List[Tuple[str, float]]] = {sid: [] for sid in ids}

    # Precompute pairwise distances
    dists: Dict[Tuple[str, str], float] = {}
    for i, a in enumerate(ids):
        for b in ids[i + 1 :]:
            d = _haversine_km(*STREET_COORDS[a], *STREET_COORDS[b])
            dists[(a, b)] = d
            dists[(b, a)] = d

    # Connect within radius
    for a in ids:
        neighbours = []
        for b in ids:
            if a == b:
                continue
            d = dists.get((a, b), 0.0)
            if d <= _ADJACENCY_RADIUS_KM:
                neighbours.append((b, d))
        # Ensure minimum connectivity
        if len(neighbours) < _MIN_NEIGHBOURS:
            all_sorted = sorted(
                ((b, dists[(a, b)]) for b in ids if b != a), key=lambda x: x[1]
            )
            neighbours = all_sorted[: _MIN_NEIGHBOURS]
        adj[a] = neighbours
    return adj


# Module-level cache
_adjacency: Optional[Dict[str, List[Tuple[str, float]]]] = None


def _get_adjacency() -> Dict[str, List[Tuple[str, float]]]:
    global _adjacency
    if _adjacency is None:
        _adjacency = _build_adjacency()
    return _adjacency


def _get_score_map(hour: int) -> Dict[str, float]:
    """Map street_id → safety_score for a given hour."""
    data = _load_scored_data()
    scores: Dict[str, float] = {}
    for row in data:
        if row["hour"] == hour:
            scores[row["street_id"]] = row["safety_score"]
    return scores


def _get_name_map() -> Dict[str, str]:
    """Map street_id → street_name (first occurrence in data)."""
    data = _load_scored_data()
    names: Dict[str, str] = {}
    for row in data:
        if row["street_id"] not in names:
            names[row["street_id"]] = row["street_name"]
    return names


# ── Dijkstra ─────────────────────────────────────────────────────

def find_safest_route(
    start: str, end: str, hour: int
) -> Optional[Dict]:
    """
    Find the safest route between *start* and *end* at *hour*.

    Edge weight = geographic_distance / safety_score
    (low safety → high weight → Dijkstra avoids it).

    Returns dict with route details or None if no path exists.
    """
    adj = _get_adjacency()
    scores = _get_score_map(hour)
    names = _get_name_map()

    if start not in STREET_COORDS or end not in STREET_COORDS:
        return None

    # Dijkstra
    INF = float("inf")
    dist = {sid: INF for sid in STREET_COORDS}
    dist[start] = 0.0
    prev: Dict[str, Optional[str]] = {sid: None for sid in STREET_COORDS}
    heap: List[Tuple[float, str]] = [(0.0, start)]

    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        if u == end:
            break
        for neighbour, geo_dist in adj.get(u, []):
            # Safety score for the neighbour; default to 50 if missing
            score = scores.get(neighbour, 50.0)
            # Clamp score to at least 1 to avoid division by zero
            safe = max(score, 1.0)
            weight = geo_dist / safe  # lower safety → higher cost
            new_dist = dist[u] + weight
            if new_dist < dist[neighbour]:
                dist[neighbour] = new_dist
                prev[neighbour] = u
                heapq.heappush(heap, (new_dist, neighbour))

    # Reconstruct path
    if dist[end] == INF:
        return None

    path: List[str] = []
    node: Optional[str] = end
    while node is not None:
        path.append(node)
        node = prev[node]
    path.reverse()

    # Build response
    route_steps = []
    total_score = 0.0
    for sid in path:
        score = scores.get(sid, 50.0)
        total_score += score
        lat, lng = STREET_COORDS[sid]
        route_steps.append(
            {
                "street_id": sid,
                "street_name": names.get(sid, sid),
                "lat": lat,
                "lng": lng,
                "safety_score": round(score, 1),
                "zone": (
                    "SAFE" if score >= 70 else "CAUTION" if score >= 40 else "DANGER"
                ),
            }
        )

    avg_score = round(total_score / len(path), 1) if path else 0.0

    return {
        "start": start,
        "end": end,
        "hour": hour,
        "route": route_steps,
        "total_streets": len(path),
        "avg_safety_score": avg_score,
    }


def list_street_names() -> List[Dict[str, str]]:
    """Return [{street_id, street_name}, ...] for autocomplete."""
    names = _get_name_map()
    return [
        {"street_id": sid, "street_name": name}
        for sid, name in sorted(names.items())
    ]
