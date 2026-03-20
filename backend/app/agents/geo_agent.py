"""
Geo-Mapping Agent

Responsible for:
- Converting streets into grid-based spatial clusters
- Handling geo-coordinate lookups via the STREET_COORDS registry
- Computing inter-street distances (Haversine)
- Identifying spatial neighbours within a configurable radius
- Providing cluster-level safety aggregation
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

# ── Chennai street coordinates (50 streets) ─────────────────────────
# Same canonical registry used by routing_service — kept here so the
# agent layer has its own self-contained geo reference.

STREET_COORDS: Dict[str, Tuple[float, float]] = {
    "CHN-001": (13.0827, 80.2707), "CHN-002": (13.0569, 80.2425),
    "CHN-003": (13.0500, 80.2340), "CHN-004": (13.0674, 80.2376),
    "CHN-005": (13.0878, 80.2785), "CHN-006": (13.0604, 80.2496),
    "CHN-007": (13.0044, 80.2509), "CHN-008": (13.0108, 80.2274),
    "CHN-009": (13.0340, 80.2711), "CHN-010": (13.0731, 80.2559),
    "CHN-011": (13.0986, 80.2867), "CHN-012": (13.0850, 80.2150),
    "CHN-013": (13.1021, 80.2634), "CHN-014": (13.0764, 80.2195),
    "CHN-015": (13.0667, 80.2612), "CHN-016": (13.0937, 80.2305),
    "CHN-017": (13.0444, 80.2450), "CHN-018": (13.0293, 80.2586),
    "CHN-019": (13.1076, 80.2423), "CHN-020": (13.0385, 80.2283),
    "CHN-021": (13.0525, 80.2580), "CHN-022": (13.0699, 80.2830),
    "CHN-023": (13.0132, 80.2680), "CHN-024": (13.0455, 80.2103),
    "CHN-025": (13.0618, 80.2751), "CHN-026": (13.0781, 80.2481),
    "CHN-027": (13.0356, 80.2395), "CHN-028": (13.0910, 80.2550),
    "CHN-029": (13.1050, 80.2740), "CHN-030": (13.0200, 80.2450),
    "CHN-031": (13.0643, 80.2185), "CHN-032": (13.0895, 80.2673),
    "CHN-033": (13.0498, 80.2765), "CHN-034": (13.0154, 80.2333),
    "CHN-035": (13.0722, 80.2907), "CHN-036": (13.0813, 80.2041),
    "CHN-037": (13.0577, 80.2658), "CHN-038": (13.0271, 80.2521),
    "CHN-039": (13.0960, 80.2459), "CHN-040": (13.0411, 80.2617),
    "CHN-041": (13.0682, 80.2533), "CHN-042": (13.1003, 80.2200),
    "CHN-043": (13.0546, 80.2289), "CHN-044": (13.0321, 80.2781),
    "CHN-045": (13.0866, 80.2358), "CHN-046": (13.0474, 80.2500),
    "CHN-047": (13.0750, 80.2700), "CHN-048": (13.0185, 80.2399),
    "CHN-049": (13.1045, 80.2561), "CHN-050": (13.0237, 80.2640),
    "CHN-051": (13.0645, 80.2458), "CHN-052": (13.0920, 80.2790),
    "CHN-053": (13.0780, 80.2329), "CHN-054": (13.0502, 80.2690),
    "CHN-055": (13.0370, 80.2560),
}

# ── Grid configuration ──────────────────────────────────────────────

GRID_SIZE_KM = 0.5  # each grid cell is ~500 m × 500 m


@dataclass
class SpatialCluster:
    """A grid cell containing a group of streets."""
    grid_row: int
    grid_col: int
    street_ids: List[str] = field(default_factory=list)
    center_lat: float = 0.0
    center_lng: float = 0.0
    avg_safety: Optional[float] = None


class GeoAgent:
    """Converts streets into a spatial grid and provides geo-operations."""

    _EARTH_RADIUS_KM = 6_371.0

    def __init__(self, grid_size_km: float = GRID_SIZE_KM) -> None:
        self._grid_size = grid_size_km
        self._clusters: Optional[Dict[Tuple[int, int], SpatialCluster]] = None

    # ── public API ──────────────────────────────────────────────────

    def get_coords(self, street_id: str) -> Optional[Tuple[float, float]]:
        """Return (lat, lng) for a street, or None if unknown."""
        return STREET_COORDS.get(street_id)

    def haversine_km(
        self, lat1: float, lon1: float, lat2: float, lon2: float,
    ) -> float:
        """Great-circle distance between two points in kilometres."""
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lon / 2) ** 2
        )
        return self._EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def neighbours(
        self, street_id: str, radius_km: float = 3.0,
    ) -> List[Tuple[str, float]]:
        """Return street IDs within *radius_km*, sorted by distance."""
        origin = self.get_coords(street_id)
        if origin is None:
            return []

        results: List[Tuple[str, float]] = []
        for sid, (lat, lng) in STREET_COORDS.items():
            if sid == street_id:
                continue
            d = self.haversine_km(origin[0], origin[1], lat, lng)
            if d <= radius_km:
                results.append((sid, round(d, 3)))

        return sorted(results, key=lambda t: t[1])

    def build_grid(self) -> Dict[Tuple[int, int], SpatialCluster]:
        """Partition all streets into a grid of ~GRID_SIZE_KM cells."""
        if self._clusters is not None:
            return self._clusters

        # Reference point: bottom-left corner of Chennai bounding box
        ref_lat = min(c[0] for c in STREET_COORDS.values())
        ref_lng = min(c[1] for c in STREET_COORDS.values())

        clusters: Dict[Tuple[int, int], SpatialCluster] = {}

        for sid, (lat, lng) in STREET_COORDS.items():
            # Distance from reference in km → compute grid cell
            row = int(self.haversine_km(ref_lat, ref_lng, lat, ref_lng) / self._grid_size)
            col = int(self.haversine_km(ref_lat, ref_lng, ref_lat, lng) / self._grid_size)

            key = (row, col)
            if key not in clusters:
                clusters[key] = SpatialCluster(grid_row=row, grid_col=col)
            clusters[key].street_ids.append(sid)

        # Compute cluster centres
        for cl in clusters.values():
            lats = [STREET_COORDS[s][0] for s in cl.street_ids]
            lngs = [STREET_COORDS[s][1] for s in cl.street_ids]
            cl.center_lat = round(sum(lats) / len(lats), 6)
            cl.center_lng = round(sum(lngs) / len(lngs), 6)

        self._clusters = clusters
        return clusters

    def cluster_safety(
        self, score_map: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """
        Given a {street_id → safety_score} mapping, compute average
        safety per spatial cluster.
        """
        grid = self.build_grid()
        result: List[Dict[str, Any]] = []

        for key, cl in sorted(grid.items()):
            scores = [score_map[s] for s in cl.street_ids if s in score_map]
            avg = round(sum(scores) / len(scores), 1) if scores else None
            result.append({
                "grid": key,
                "center_lat": cl.center_lat,
                "center_lng": cl.center_lng,
                "street_count": len(cl.street_ids),
                "street_ids": cl.street_ids,
                "avg_safety": avg,
            })

        return result
