# NightSafe — Implementation Steps

This document provides a step-by-step implementation roadmap for the NightSafe system. Each step is designed to be executable independently with clear dependencies and expected outputs.

---

## Feature Breakdown

The NightSafe system consists of 6 major features:

1. **Safety Scoring Model** — Core risk calculation engine
2. **Routing System** — Safe path planning with Dijkstra's algorithm
3. **Alerts System** — Multi-channel danger notifications
4. **Anomaly Detection** — Outlier identification for sudden danger spikes
5. **Continuous Learning** — Feedback-driven weight optimization
6. **Frontend UI** — Interactive map and dashboard

---

## Step 1: Data Layer — Load and Validate Street Data

**Description**: Implement the data ingestion pipeline that loads, normalizes, and validates Chennai street data from CSV files.

**Files to Modify**:
- `backend/app/agents/data_agent.py` — Main data loading logic
- `data/chennai_street_data.csv` — Raw input data

**Dependencies**: None (foundational step)

**Implementation**:
1. Create `DataAgent` class with `load()` method
2. Read CSV using Python's `csv.DictReader`
3. Normalize fields (cast strings to int/float)
4. Validate data quality:
   - Check for missing required fields
   - Validate hour range (0-23)
   - Validate lighting_status (0 or 1)
   - Validate crime_score (0-1 range)
5. Return list of clean dictionaries

**Expected Output**:
- `DataAgent.load()` returns ~250 rows (50 streets × 5 hours)
- Each row has: `street_id`, `street_name`, `hour`, `footfall`, `lighting_status`, `liquor_distance`, `crime_score`
- Invalid rows are filtered out with validation

**Testing**:
```python
agent = DataAgent()
data = agent.load()
print(f"Loaded {len(data)} valid rows")
assert all("street_id" in row for row in data)
```

---

## Step 2: Safety Scoring Model — Weighted Formula Implementation

**Description**: Build the core safety scoring engine that converts street features into 0-100 safety scores using a weighted formula.

**Files to Modify**:
- `ml/safety_model.py` — Scoring functions
- `backend/app/agents/risk_agent.py` — Agent wrapper for scoring

**Dependencies**: Step 1 (needs clean data)

**Implementation**:
1. Define scoring constants:
   - Weights: `W_FOOTFALL = 0.35`, `W_LIGHTING = 0.30`, `W_LIQUOR = 0.20`, `W_CRIME = 0.15`
   - Thresholds: `SAFE_THRESHOLD = 70`, `CAUTION_THRESHOLD = 40`
2. Implement component functions:
   - `_footfall_component()` — sqrt curve (first 100 pedestrians matter most)
   - `_lighting_component()` — binary (0 = safe, 1 = immediate hazard)
   - `_liquor_component()` — distance decay + hour penalty (spike at 10 PM)
   - `_crime_component()` — invert crime_score (0 crime = 1.0 safety)
3. Implement `score_safety()` — weighted sum of components × 100
4. Implement `classify()` — map score to SAFE/CAUTION/DANGER zones
5. Implement `explain_safety()` — human-readable reasoning for each score

**Expected Output**:
- `score_safety(footfall=120, lighting_status=0, liquor_distance=350, crime_score=0.3, hour=21)` returns ~65.2
- `classify(65.2)` returns `"CAUTION"`
- `explain_safety(...)` returns detailed breakdown with component contributions

**Testing**:
```python
score = score_safety(120, 0, 350, 0.3, 21)
assert 0 <= score <= 100
assert classify(80) == "SAFE"
assert classify(50) == "CAUTION"
assert classify(30) == "DANGER"
```

---

## Step 3: Risk Agent — Scoring Wrapper and Caching

**Description**: Create `RiskAgent` to orchestrate safety scoring for all streets with caching and prediction capabilities.

**Files to Modify**:
- `backend/app/agents/risk_agent.py` — Agent implementation

**Dependencies**: Step 2 (needs scoring functions)

**Implementation**:
1. Create `RiskAgent` class with internal cache
2. Implement `score_all()`:
   - Accept list of raw rows from DataAgent
   - Call `score_safety()` for each row
   - Add `safety_score`, `zone`, `explanation` to each row
   - Cache results for reuse
3. Implement `score_single()` — score one observation on demand
4. Implement `predict_next_hour()`:
   - Take consecutive hourly readings for one street
   - Calculate score delta (trend)
   - Extrapolate next hour's score (clamped 0-100)
   - Return prediction with confidence level

**Expected Output**:
- `RiskAgent.score_all(data)` returns enriched rows with `safety_score` and `zone`
- Predictions show trend direction (declining/stable/rising)

**Testing**:
```python
risk_agent = RiskAgent()
scored = risk_agent.score_all(raw_data)
assert all("safety_score" in row for row in scored)
```

---

## Step 4: Routing System — Safe Path Planning

**Description**: Implement safe route finding using Dijkstra's algorithm on a street graph where edge weights are inversely proportional to safety scores.

**Files to Modify**:
- `backend/app/services/routing_service.py` — Routing logic
- Add `STREET_COORDS` dictionary (lat/lng for 50 streets)

**Dependencies**: Step 3 (needs safety scores)

**Implementation**:
1. Define `STREET_COORDS` mapping street_id → (latitude, longitude)
2. Implement `_haversine_km()` for geographic distance calculation
3. Implement `_build_adjacency()`:
   - Connect streets within 3 km radius
   - Ensure minimum 3 neighbors per street for connectivity
4. Implement `find_safest_route()`:
   - Build graph with safety-weighted edges: `weight = distance / safety_score`
   - Run Dijkstra's algorithm from start to end
   - Reconstruct path from predecessor map
   - Calculate total distance and average safety score
5. Return route with segments, waypoints, and metadata

**Expected Output**:
- `find_safest_route("CHN-001", "CHN-010", hour=22)` returns path avoiding low-safety streets
- Route includes: waypoints, segment details, total distance, average safety

**Testing**:
```python
route = find_safest_route("CHN-001", "CHN-050", 22)
assert route["path"][0] == "CHN-001"
assert route["path"][-1] == "CHN-050"
assert route["avg_safety"] > 40  # Avoids danger zones
```

---

## Step 5: Anomaly Detection — Outlier Identification

**Description**: Implement Z-score-based anomaly detection to identify sudden safety score drops indicating emerging dangers.

**Files to Modify**:
- `backend/app/agents/anomaly_agent.py` — Detection logic

**Dependencies**: Step 3 (needs scored data)

**Implementation**:
1. Create `Anomaly` dataclass with fields: `street_id`, `hour`, `score`, `expected_score`, `deviation`, `severity`
2. Create `AnomalyAgent` with historical score tracking
3. Implement `update_history()`:
   - Store score history per street (rolling window)
   - Calculate mean and std dev for each street
4. Implement `detect()`:
   - Compare current score to historical mean
   - Calculate Z-score: `(score - mean) / std_dev`
   - Flag anomalies where deviation > 2.0 (2 standard deviations)
   - Classify severity:
     - `CRITICAL`: deviation > 3.0 or score < 20
     - `HIGH`: deviation > 2.5 or score < 30
     - `MEDIUM`: deviation > 2.0 or score < 40
5. Return list of `Anomaly` objects

**Expected Output**:
- Detects sudden drops (e.g., street normally 70 now at 25)
- Returns anomalies with severity classification
- Filters out false positives (normal score variations)

**Testing**:
```python
anomaly_agent = AnomalyAgent()
anomaly_agent.update_history(baseline_data)
anomalies = anomaly_agent.detect(current_data)
assert all(a.deviation > 2.0 for a in anomalies)
```

---

## Step 6: Alerts System — Multi-Channel Notifications

**Description**: Implement alert dispatch system with 3 channels (user toasts, police dispatch, GCC infrastructure).

**Files to Modify**:
- `backend/app/agents/alert_agent.py` — Alert generation and dispatch

**Dependencies**: Step 3 (needs safety scores), Step 5 (needs anomalies)

**Implementation**:
1. Create `Alert` dataclass with fields: `alert_id`, `timestamp`, `alert_type`, `severity`, `street_id`, `message`, `dispatched_to`
2. Create `AlertAgent` with internal alert log
3. Implement `generate_user_alerts()`:
   - Create alerts for all streets in DANGER zone (score < 40)
   - Severity: HIGH if score < 25, MEDIUM otherwise
   - Message format: "[!] DANGER: {street_name} - Safety Score {score}. Avoid this area."
4. Implement `generate_police_alerts()`:
   - Create alerts only for HIGH/CRITICAL anomalies
   - Message includes expected vs actual score, deviation magnitude
   - Recommends immediate patrol
5. Implement `generate_gcc_alerts()`:
   - Create alerts for infrastructure issues (persistent low scores)
   - Recommends lighting/CCTV improvements
6. Implement `get_alert_log()` — retrieve alerts with optional filtering by type
7. Implement `acknowledge()` — mark alerts as acknowledged

**Expected Output**:
- User alerts for danger zones appear as toasts in UI
- Police alerts dispatched for anomalies requiring patrol
- GCC alerts queued for infrastructure team
- All alerts stored in searchable log

**Testing**:
```python
alert_agent = AlertAgent()
user_alerts = alert_agent.generate_user_alerts(danger_zones)
assert all(a.alert_type == "USER" for a in user_alerts)
police_alerts = alert_agent.generate_police_alerts(anomalies)
assert all(a.severity in ("HIGH", "CRITICAL") for a in police_alerts)
```

---

## Step 7: Agent Orchestrator — Central Coordination

**Description**: Create central orchestrator that wires all agents together and exposes high-level API operations.

**Files to Modify**:
- `backend/app/services/agent_orchestrator.py` — Orchestration logic

**Dependencies**: Steps 1-6 (needs all agents)

**Implementation**:
1. Create `AgentOrchestrator` class
2. Initialize all 5 agents in constructor:
   - `self.data_agent = DataAgent()`
   - `self.risk_agent = RiskAgent()`
   - `self.anomaly_agent = AnomalyAgent()`
   - `self.geo_agent = GeoAgent()`
   - `self.alert_agent = AlertAgent()`
3. Implement `boot()` — startup pipeline:
   - DataAgent loads raw data
   - RiskAgent scores all data
   - AnomalyAgent builds baseline history
4. Implement high-level operations:
   - `get_anomalies()` — run anomaly detection and return results
   - `get_police_alerts()` — generate police alerts from anomalies
   - `get_gcc_alerts()` — generate GCC alerts from anomalies
   - `predict_all()` — predict next hour for all streets
5. Create singleton instance: `orchestrator = AgentOrchestrator()`
6. Export orchestrator for use in API routes

**Expected Output**:
- Single entry point for all agent operations
- Lazy initialization (boots on first API call)
- Cached results for performance

**Testing**:
```python
from backend.app.services.agent_orchestrator import orchestrator
orchestrator.boot()
anomalies = orchestrator.get_anomalies()
assert len(anomalies) >= 0
```

---

## Step 8: API Endpoints — REST Interface

**Description**: Create FastAPI endpoints that expose agent operations to the frontend.

**Files to Modify**:
- `backend/app/api/agents.py` — Agent-specific endpoints
- `backend/app/api/safety.py` — Safety scoring endpoints
- `backend/app/api/routes.py` — Routing endpoints
- `backend/app/main.py` — FastAPI app initialization

**Dependencies**: Step 7 (needs orchestrator)

**Implementation**:
1. Create API router in each file:
   ```python
   from fastapi import APIRouter
   router = APIRouter(prefix="/api", tags=["agents"])
   ```

2. Implement key endpoints:
   - `GET /api/safety/scores?hour={hour}` — all safety scores for given hour
   - `GET /api/safety/danger-zones?hour={hour}` — streets in danger zone
   - `GET /api/routes/safe?start={id}&end={id}&hour={hour}` — safest route
   - `GET /api/agents/anomalies` — current anomalies
   - `GET /api/agents/predictions?hour={hour}` — next-hour predictions
   - `GET /api/agents/police-alerts` — police dispatch alerts
   - `GET /api/agents/gcc-alerts` — GCC infrastructure alerts

3. Wire routers into main app:
   ```python
   from app.api import agents, safety, routes as route_api
   app.include_router(agents.router)
   app.include_router(safety.router)
   app.include_router(route_api.router)
   ```

4. Add CORS middleware for frontend access

**Expected Output**:
- All endpoints return JSON responses
- Swagger docs available at `/docs`
- Frontend can fetch data via HTTP

**Testing**:
```bash
curl http://localhost:8000/api/safety/scores?hour=22
curl http://localhost:8000/api/routes/safe?start=CHN-001&end=CHN-050&hour=22
```

---

## Step 9: Continuous Learning — Feedback Loop

**Description**: Implement feedback collection and weight adjustment system for continuous model improvement.

**Files to Modify**:
- `backend/app/services/learning_service.py` — Learning logic
- Add to orchestrator: feedback submission and learning trigger

**Dependencies**: Step 3 (needs scoring model)

**Implementation**:
1. Create `ContinuousLearningModule` class
2. Implement `submit_feedback()`:
   - Accept: `street_id`, `hour`, `reported_score` (model's score), `actual_feeling` (user's rating 0-100), `source`
   - Store feedback in memory buffer
3. Implement `learn()`:
   - Calculate error for each feedback: `error = reported_score - actual_feeling`
   - Aggregate errors by component (footfall, lighting, liquor, crime)
   - Adjust weights proportionally (increase weight if component is underestimated)
   - Clamp weights to sum to 1.0
   - Persist updated weights to `data/weights.json`
4. Add endpoints:
   - `POST /api/agents/feedback` — submit user feedback
   - `POST /api/agents/learn` — trigger learning cycle

**Expected Output**:
- Feedback collected from users over time
- Weights automatically adjusted to reduce prediction error
- System becomes more accurate with usage

**Testing**:
```python
learning = ContinuousLearningModule()
learning.submit_feedback("CHN-001", 22, 65.0, 40.0, "user")
result = learning.learn()
assert "weights_updated" in result
```

---

## Step 10: Frontend UI — Map Visualization

**Description**: Build interactive React map component that displays safety scores with color-coded overlays.

**Files to Modify**:
- `frontend/src/components/NightSafeMap.jsx` — Main map component
- `frontend/src/components/SafetyOverlay.jsx` — Color-coded street overlays
- `frontend/src/components/LegendPanel.jsx` — Map legend (SAFE/CAUTION/DANGER)

**Dependencies**: Step 8 (needs API endpoints)

**Implementation**:
1. Install Leaflet: `npm install react-leaflet leaflet`
2. Create `NightSafeMap` component:
   - Initialize Leaflet map centered on Chennai (13.08°N, 80.27°E)
   - Add OpenStreetMap tile layer
3. Create `SafetyOverlay` component:
   - Fetch safety scores from API: `GET /api/safety/scores?hour={currentHour}`
   - For each street, draw circle marker at lat/lng
   - Color by zone: Green (SAFE), Yellow (CAUTION), Red (DANGER)
   - Size by footfall (larger circle = more pedestrians)
4. Add time slider (8 PM - midnight) to change displayed hour
5. Add click handler to show street details panel
6. Create `LegendPanel` with color guide

**Expected Output**:
- Interactive map displaying all 50 Chennai streets
- Streets dynamically change color as time slider moves
- Click on street shows: name, safety score, explanation

**Testing**:
- Drag time slider from 8 PM to midnight → observe color changes
- Click dangerous street (red) → details panel appears

---

## Step 11: Frontend UI — Route Search

**Description**: Build route search interface that finds and displays safest path between two streets.

**Files to Modify**:
- `frontend/src/components/RouteSearch.jsx` — Search form
- Update `NightSafeMap.jsx` to render route paths

**Dependencies**: Step 4 (routing backend), Step 10 (map component)

**Implementation**:
1. Create `RouteSearch` component:
   - Two autocomplete inputs for start/end streets
   - "Find Safe Route" button
2. On submit:
   - Fetch route: `GET /api/routes/safe?start={start}&end={end}&hour={hour}`
   - Parse response: path, segments, total_distance, avg_safety
3. Render route on map:
   - Draw polyline connecting waypoints
   - Color polyline by average safety (green/yellow/red)
   - Add markers at start/end with labels
4. Display route summary:
   - Total distance (km)
   - Average safety score
   - Estimated walk time
   - List of waypoints

**Expected Output**:
- User selects start="CHN-001", end="CHN-050"
- Route drawn on map avoiding danger zones
- Summary shows safer path even if slightly longer

**Testing**:
- Search route at 8 PM (safe time) vs 11 PM (dangerous time)
- Verify route changes to avoid streets that became dangerous

---

## Step 12: Frontend UI — Dashboard Panels

**Description**: Create dashboard page displaying agent outputs (anomalies, predictions, alerts).

**Files to Modify**:
- `frontend/src/pages/DashboardPage.jsx` — Main dashboard
- `frontend/src/components/AnomalyPanel.jsx` — Anomaly list
- `frontend/src/components/PredictionPanel.jsx` — Prediction list

**Dependencies**: Step 8 (API endpoints)

**Implementation**:
1. Create `DashboardPage` with 3 panels:
   - **Anomalies Panel**: Shows current anomalies with severity badges
   - **Predictions Panel**: Shows next-hour predictions with trend arrows
   - **Alerts Panel**: Shows police/GCC alerts with acknowledgment buttons
2. Fetch data on mount:
   - Anomalies: `GET /api/agents/anomalies`
   - Predictions: `GET /api/agents/predictions?hour={currentHour}`
   - Police alerts: `GET /api/agents/police-alerts`
3. Auto-refresh every 30 seconds
4. Add filters (severity, street name)
5. Add export buttons (CSV/JSON download)

**Expected Output**:
- Real-time dashboard showing system intelligence
- Anomalies highlighted with CRITICAL/HIGH tags
- Predictions show which streets will become dangerous next hour

**Testing**:
- Load dashboard → verify all panels populate
- Wait 30 seconds → verify auto-refresh updates data

---

## Step 13: Real-Time Simulation Engine (Optional Enhancement)

**Description**: Add background simulation that updates safety scores in real-time to demo live system behavior.

**Files to Modify**:
- `backend/app/services/simulation_engine.py` — Simulation logic
- Add to orchestrator: start/stop simulation controls

**Dependencies**: Step 3 (needs scoring model)

**Implementation**:
1. Create `SimulationEngine` class
2. Implement `start()`:
   - Launch background thread
   - Every 30 seconds: randomly modify baseline data (±10% noise)
   - Simulate events: footfall drop, lighting failure, liquor surge
   - Re-score affected streets
3. Implement `get_snapshot()` — return current simulated state
4. Add API endpoints:
   - `POST /api/agents/simulation/start` — start simulation
   - `POST /api/agents/simulation/stop` — stop simulation
   - `GET /api/agents/simulation/status` — check if running
5. Update frontend to poll simulation snapshot instead of static data

**Expected Output**:
- Safety scores change dynamically (demo feels live)
- Random events trigger anomalies and alerts
- Dashboard updates in real-time without page reload

**Testing**:
```python
orchestrator.start_simulation(interval_seconds=30)
time.sleep(35)
snapshot = orchestrator.get_simulation_snapshot(hour=22)
assert len(snapshot) > 0
```

---

## Dependencies Summary

```
Step 1 (Data) → Step 2 (Scoring) → Step 3 (Risk Agent)
                                       ↓
Step 4 (Routing) ← Step 3         Step 5 (Anomaly) ← Step 3
       ↓                                 ↓
Step 8 (API) ← Step 7 (Orchestrator) ← Step 6 (Alerts) ← Step 5
       ↓                                 ↓
Step 10 (Map UI)                   Step 9 (Learning) ← Step 3
       ↓
Step 11 (Route UI) ← Step 4
       ↓
Step 12 (Dashboard) ← Step 8
       ↓
Step 13 (Simulation) ← Step 3
```

---

## Execution Strategy

### Phase 1: Core Backend (Steps 1-7)
Build the complete agent pipeline before touching the frontend. This ensures all business logic is testable via Python REPL or curl.

**Time estimate**: 6-8 hours

### Phase 2: API Layer (Step 8)
Expose agent operations via REST endpoints. Test with Postman or curl before building UI.

**Time estimate**: 2-3 hours

### Phase 3: Frontend Foundation (Steps 10-11)
Build map visualization and routing UI. Focus on getting one feature working end-to-end.

**Time estimate**: 4-5 hours

### Phase 4: Intelligence Features (Steps 9, 12)
Add learning system and dashboard to showcase agent intelligence.

**Time estimate**: 3-4 hours

### Phase 5: Polish (Step 13)
Add real-time simulation for impressive demo effect.

**Time estimate**: 2-3 hours

**Total estimate**: 17-23 hours of focused development

---

## Review Checklist

Before moving to the next step, verify:

- [ ] All files mentioned in "Files to Modify" have been updated
- [ ] Testing commands produce expected output
- [ ] No hardcoded values (use module-level constants)
- [ ] Docstrings added for all new functions/classes
- [ ] Git commit made with proper `[feature]` prefix
- [ ] Dependencies from previous steps are satisfied

---

**Remember**: Each step should be fully functional before moving to the next. Don't skip the testing phase!
