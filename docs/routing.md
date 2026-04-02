# Routing System

**Location**: `backend/app/services/routing_service.py`  
**API Endpoint**: `GET /api/routes/safe`

---

## Purpose

The Routing System finds the **safest path** between two streets using Dijkstra's shortest-path algorithm with safety-weighted edges. Unlike traditional routing that optimizes only for distance, NightSafe's routing actively **avoids danger zones** by treating low-safety streets as high-cost paths.

The system can recommend a longer route if it significantly increases safety — prioritizing user well-being over convenience.

---

## Inputs

| Parameter | Type | Description |
|-----------|------|-------------|
| `start` | `str` | Street ID of origin (e.g., `"CHN-001"`) |
| `end` | `str` | Street ID of destination (e.g., `"CHN-050"`) |
| `hour` | `int` | Hour for safety score lookup (0-23) |

**Example Input**:
```python
start = "CHN-001"  # Anna Salai
end = "CHN-050"    # T. Nagar
hour = 22          # 10 PM
```

**API Request**:
```bash
GET /api/routes/safe?start=CHN-001&end=CHN-050&hour=22
```

---

## Outputs

### Route Object

**Type**: `dict` with the following structure:

```python
{
    "path": ["CHN-001", "CHN-012", "CHN-015", "CHN-050"],  # Waypoints
    "segments": [
        {
            "from": "CHN-001",
            "to": "CHN-012",
            "from_name": "Anna Salai",
            "to_name": "Mount Road",
            "distance_km": 2.3,
            "safety_score": 68.4,
            "zone": "CAUTION"
        },
        {
            "from": "CHN-012",
            "to": "CHN-015",
            "from_name": "Mount Road",
            "to_name": "Pondy Bazaar",
            "distance_km": 1.8,
            "safety_score": 72.1,
            "zone": "SAFE"
        },
        # ... more segments
    ],
    "total_distance_km": 8.7,
    "avg_safety": 64.2,
    "overall_zone": "CAUTION",
    "waypoints": [
        {"lat": 13.0604, "lng": 80.2496, "street_id": "CHN-001"},
        {"lat": 13.0764, "lng": 80.2618, "street_id": "CHN-012"},
        # ... more waypoints
    ],
    "duration_estimate_min": 104  # Walking at 5 km/h
}
```

### Key Fields Explained

- **`path`**: Ordered list of street IDs from start to end
- **`segments`**: Detailed breakdown of each edge (from → to) with distance and safety
- **`total_distance_km`**: Sum of all segment distances
- **`avg_safety`**: Weighted average safety score across route
- **`overall_zone`**: Worst zone encountered (DANGER > CAUTION > SAFE)
- **`waypoints`**: Lat/lng coordinates for map rendering
- **`duration_estimate_min`**: Walking time at average 5 km/h pace

---

## Logic

### Graph Construction

#### 1. Street Coordinates

50 Chennai streets are mapped to geographic coordinates (latitude/longitude):

```python
STREET_COORDS = {
    "CHN-001": (13.0604, 80.2496),  # Anna Salai
    "CHN-002": (13.0878, 80.2785),  # Besant Nagar
    # ... 48 more streets
}
```

#### 2. Adjacency List

Streets are connected based on **geographic proximity** using the Haversine distance formula:

```python
_ADJACENCY_RADIUS_KM = 3.0  # Max distance to consider streets "walkable"
_MIN_NEIGHBOURS = 3         # Min connections per street for graph connectivity
```

**Algorithm** (`_build_adjacency()`):
1. For each street A:
   - Find all streets B within 3 km radius
   - Store as edges: `(B, distance_km)`
2. If street has < 3 neighbors:
   - Connect to 3 nearest streets (ensures no isolated nodes)

**Example Adjacency**:
```python
{
    "CHN-001": [
        ("CHN-004", 1.8),  # 1.8 km away
        ("CHN-009", 2.3),
        ("CHN-012", 2.7)
    ],
    # ...
}
```

#### 3. Haversine Distance

**Function**: `_haversine_km(lat1, lon1, lat2, lon2) -> float`

Calculates great-circle distance between two lat/lng points on Earth's surface.

**Formula**:
```python
R = 6371.0  # Earth radius in km
dlat = radians(lat2 - lat1)
dlon = radians(lon2 - lon1)
a = sin(dlat/2)^2 + cos(lat1) * cos(lat2) * sin(dlon/2)^2
distance = R * 2 * atan2(sqrt(a), sqrt(1-a))
```

**Example**:
```python
distance = _haversine_km(13.0604, 80.2496, 13.0878, 80.2785)
# Returns: 3.48 km
```

---

### Dijkstra's Algorithm with Safety Weights

**Function**: `find_safest_route(start, end, hour) -> dict`

#### Edge Weight Formula

```python
weight = geographic_distance / safety_score
```

**Interpretation**:
- **Low safety → High weight → Algorithm avoids it**
- **High safety → Low weight → Algorithm prefers it**

**Example**:
- Edge A→B: distance = 2.0 km, safety = 80 → weight = 0.025
- Edge C→D: distance = 1.5 km, safety = 30 → weight = 0.050

Even though C→D is shorter, it has a higher weight due to danger, so Dijkstra prefers A→B.

#### Algorithm Steps

1. **Initialize**:
   ```python
   dist = {street: INF for all streets}
   dist[start] = 0.0
   prev = {street: None for all streets}
   heap = [(0.0, start)]  # (distance, node)
   ```

2. **Main Loop**:
   ```python
   while heap:
       current_dist, u = heappop(heap)
       if u == end:
           break  # Found shortest path
       for neighbor, geo_dist in adjacency[u]:
           safety_score = scores[neighbor]  # From RiskAgent
           weight = geo_dist / max(safety_score, 1.0)  # Clamp min 1.0
           new_dist = dist[u] + weight
           if new_dist < dist[neighbor]:
               dist[neighbor] = new_dist
               prev[neighbor] = u
               heappush(heap, (new_dist, neighbor))
   ```

3. **Path Reconstruction**:
   ```python
   path = []
   node = end
   while node is not None:
       path.append(node)
       node = prev[node]
   path.reverse()
   return path
   ```

#### Safety Score Lookup

```python
scores = _get_score_map(hour)
# Returns: {"CHN-001": 72.3, "CHN-002": 45.8, ...}
```

Scores are fetched from the RiskAgent's cached data for the specified hour.

---

## Examples

### Example 1: Safe Hour (8 PM)

```python
route = find_safest_route("CHN-001", "CHN-050", hour=20)
```

**Output**:
```json
{
    "path": ["CHN-001", "CHN-004", "CHN-016", "CHN-022", "CHN-050"],
    "total_distance_km": 9.2,
    "avg_safety": 74.6,
    "overall_zone": "SAFE"
}
```

**Explanation**: Most streets are safe at 8 PM; algorithm chooses a relatively direct path.

---

### Example 2: Dangerous Hour (10 PM)

```python
route = find_safest_route("CHN-001", "CHN-050", hour=22)
```

**Output**:
```json
{
    "path": ["CHN-001", "CHN-009", "CHN-012", "CHN-015", "CHN-026", "CHN-050"],
    "total_distance_km": 11.7,
    "avg_safety": 58.3,
    "overall_zone": "CAUTION"
}
```

**Explanation**: At 10 PM, some direct streets are in DANGER zone. The algorithm takes a **longer but safer route** (+2.5 km) to avoid dangerous areas.

---

### Example 3: No Safe Path Available

```python
route = find_safest_route("CHN-001", "CHN-007", hour=23)
```

**Output**:
```json
{
    "path": ["CHN-001", "CHN-013", "CHN-007"],
    "total_distance_km": 5.1,
    "avg_safety": 32.4,
    "overall_zone": "DANGER",
    "warning": "All available routes pass through danger zones. Recommend taxi or delay travel."
}
```

**Explanation**: When **all paths are dangerous**, the system returns the *least dangerous* route with a prominent warning.

---

### Example 4: Segment-by-Segment Breakdown

```python
route = find_safest_route("CHN-001", "CHN-010", hour=21)
segments = route["segments"]

for seg in segments:
    print(f"{seg['from_name']} → {seg['to_name']}: "
          f"{seg['distance_km']:.1f} km, "
          f"Safety: {seg['safety_score']:.1f} ({seg['zone']})")
```

**Output**:
```
Anna Salai → T. Nagar: 2.3 km, Safety: 68.4 (CAUTION)
T. Nagar → Pondy Bazaar: 1.8 km, Safety: 72.1 (SAFE)
Pondy Bazaar → Nungambakkam: 3.4 km, Safety: 55.7 (CAUTION)
```

---

## Usage in Code

### Direct Usage

```python
from backend.app.services.routing_service import find_safest_route

route = find_safest_route(
    start="CHN-001",
    end="CHN-050",
    hour=22
)

if route is None:
    print("No path exists between these streets")
else:
    print(f"Route: {' → '.join(route['path'])}")
    print(f"Distance: {route['total_distance_km']:.1f} km")
    print(f"Avg Safety: {route['avg_safety']:.1f}")
    print(f"Zone: {route['overall_zone']}")
```

### Via API Endpoint

**Backend** (`backend/app/api/routes.py`):
```python
from fastapi import APIRouter
from backend.app.services.routing_service import find_safest_route

router = APIRouter(prefix="/api/routes")

@router.get("/safe")
def get_safe_route(start: str, end: str, hour: int):
    route = find_safest_route(start, end, hour)
    if route is None:
        return {"error": "No path found"}
    return route
```

**Frontend** (`frontend/src/services/api.js`):
```javascript
export async function fetchSafeRoute(start, end, hour) {
    const response = await axios.get('/api/routes/safe', {
        params: { start, end, hour }
    });
    return response.data;
}
```

**React Component** (`frontend/src/components/RouteSearch.jsx`):
```javascript
const [route, setRoute] = useState(null);

const handleSearch = async () => {
    const result = await fetchSafeRoute(startId, endId, currentHour);
    setRoute(result);
    // Render route on map as polyline
};
```

---

## Performance Considerations

### Time Complexity

- **Graph construction**: O(N²) where N = 50 streets (one-time cost, cached)
- **Dijkstra's algorithm**: O((V + E) log V) = O(150 log 50) ≈ **O(255)** per query
- **Very fast** for 50-street graph; queries complete in < 10 ms

### Caching Strategy

1. **Adjacency list**: Built once at module load, never changes
2. **Safety scores**: Cached by RiskAgent per hour (5 lookups max for 20-23, 0)
3. **Street names**: Loaded once from CSV

**Result**: Repeated route queries for same hour are instant (< 1 ms).

---

## Alternative Routes (Future Enhancement)

Current system returns **one optimal route**. Future versions could support:

1. **K-shortest paths**: Show 3 alternative routes with trade-offs
   - Fastest route (least distance)
   - Safest route (highest avg safety)
   - Balanced route (optimized safety × distance)

2. **Turn-by-turn navigation**: Break segments into actual street turns

3. **Real-time rerouting**: If user enters danger zone, recalculate from current position

---

## Edge Cases

### 1. Isolated Streets

**Scenario**: Street has no neighbors within 3 km radius.

**Handling**: `_build_adjacency()` ensures minimum 3 connections by connecting to nearest streets regardless of distance. Prevents graph disconnection.

### 2. Zero Safety Score

**Scenario**: Street scores 0.0 (complete danger).

**Handling**: Clamp safety to minimum 1.0 before division:
```python
weight = geo_dist / max(safety_score, 1.0)
```
Prevents division by zero and treats score=0 as score=1 (almost infinite weight).

### 3. Start == End

**Scenario**: User searches route from street to same street.

**Handling**: Return immediate success:
```python
if start == end:
    return {
        "path": [start],
        "total_distance_km": 0.0,
        "avg_safety": scores[start],
        "overall_zone": classify(scores[start])
    }
```

### 4. Missing Hour Data

**Scenario**: Safety scores not available for requested hour.

**Handling**: Fall back to default score of 50 (CAUTION):
```python
score = scores.get(street_id, 50.0)
```

---

## Comparison: Distance-Only vs Safety-Weighted

| Metric | Distance-Only | Safety-Weighted (NightSafe) |
|--------|---------------|------------------------------|
| **Algorithm** | Dijkstra (distance edges) | Dijkstra (distance/safety edges) |
| **Objective** | Minimize km | Maximize safety |
| **Route Length** | Always shortest | Sometimes longer |
| **Safety Score** | Ignored | Central factor |
| **Use Case** | Daytime, low-risk areas | Nighttime, high-risk areas |

**Example**:
- **Distance-only**: CHN-001 → CHN-007 (5.1 km, safety=25, DANGER)
- **Safety-weighted**: CHN-001 → CHN-012 → CHN-015 → CHN-007 (7.8 km, safety=62, CAUTION)

NightSafe chooses the 7.8 km route because it's **significantly safer** (+37 points).

---

## Related Files

- **Service Implementation**: `backend/app/services/routing_service.py`
- **API Endpoint**: `backend/app/api/routes.py`
- **Frontend Component**: `frontend/src/components/RouteSearch.jsx`
- **Safety Scoring**: `ml/safety_model.py` (provides safety scores)
- **Map Rendering**: `frontend/src/components/NightSafeMap.jsx` (draws polylines)

---

## Testing

### Unit Tests

```python
# Test adjacency construction
adj = _build_adjacency()
assert all(len(neighbors) >= 3 for neighbors in adj.values())

# Test Haversine distance
dist = _haversine_km(13.0604, 80.2496, 13.0878, 80.2785)
assert 3.0 < dist < 4.0  # Approx 3.48 km

# Test routing
route = find_safest_route("CHN-001", "CHN-050", 22)
assert route is not None
assert route["path"][0] == "CHN-001"
assert route["path"][-1] == "CHN-050"
assert 0 <= route["avg_safety"] <= 100
```

### Integration Tests

```bash
# Backend smoke test
pytest backend/test_smoke.py::test_routing

# Manual API test
curl "http://localhost:8000/api/routes/safe?start=CHN-001&end=CHN-050&hour=22"
```

---

## Future Enhancements

1. **Multi-modal routing**: Walking + bus/metro combinations
2. **Real-time traffic**: Factor in current pedestrian density
3. **User preferences**: Risk tolerance slider (prefer safety vs speed)
4. **Accessibility**: Wheelchair-friendly routes, well-lit paths
5. **Landmarks**: "Turn left after X landmark" instead of street IDs
