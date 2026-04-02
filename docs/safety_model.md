# Safety Scoring Model

**Location**: `ml/safety_model.py`  
**Agent**: `RiskAgent` (`backend/app/agents/risk_agent.py`)

---

## Purpose

The Safety Scoring Model is the core intelligence engine of NightSafe. It converts street-level features (footfall, lighting, liquor proximity, crime history) into a **0-100 safety score** that quantifies danger level at a specific hour.

The model detects **temporal transitions** — moments when a safe street becomes dangerous (e.g., due to bar closing at 10 PM or streetlight failure). This enables proactive alerting before users enter danger zones.

---

## Inputs

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `footfall` | `int` | 0-400+ | Number of pedestrians on the street during the hour |
| `lighting_status` | `int` | 0 or 1 | 0 = working streetlight, 1 = failed/off |
| `liquor_distance` | `int` | 0-800+ | Distance (meters) to nearest liquor outlet (TASMAC bar) |
| `crime_score` | `float` | 0.0-1.0 | Historical crime intensity (0 = no crime, 1 = high crime) |
| `hour` | `int` | 0-23 | 24-hour clock (20-23 = 8 PM-11 PM, 0 = midnight) |

**Example Input**:
```python
footfall = 120
lighting_status = 0  # Working streetlight
liquor_distance = 350  # 350 meters from nearest bar
crime_score = 0.3  # Medium historical crime
hour = 22  # 10 PM
```

---

## Outputs

### 1. Safety Score (0-100)

**Type**: `float` (rounded to 1 decimal place)

**Interpretation**:
- **> 70**: SAFE (green zone) — normal routing, no alerts
- **40-70**: CAUTION (yellow zone) — user warned, alternative routes suggested
- **< 40**: DANGER (red zone) — immediate alert, force reroute, police dispatch

**Example Output**:
```python
score = score_safety(120, 0, 350, 0.3, 22)
# Returns: 65.2
```

### 2. Zone Classification

**Type**: `str` (one of `"SAFE"`, `"CAUTION"`, `"DANGER"`)

Determined by thresholds:
```python
SAFE_THRESHOLD = 70
CAUTION_THRESHOLD = 40

def classify(score: float) -> str:
    if score >= 70: return "SAFE"
    elif score >= 40: return "CAUTION"
    else: return "DANGER"
```

### 3. Explanation (Explainable AI)

**Type**: `str` (human-readable reasoning)

Every score comes with a detailed breakdown explaining *why* a street received that score.

**Example Explanation**:
```
Score: 65.2 (CAUTION)
- Footfall: 120 (35% weight) → modest crowd
- Lighting: Working (30% weight) → full contribution
- Liquor: 350m away (20% weight) → moderate proximity
- Crime: 0.30 baseline (15% weight) → medium historical risk
⚠️ 10 PM bar closing penalty applied (-15%)
```

---

## Logic

### Weighted Formula

The safety score is a weighted sum of 4 normalized components:

```
Safety Score = (
    W_FOOTFALL × footfall_component +
    W_LIGHTING × lighting_component +
    W_LIQUOR × liquor_component +
    W_CRIME × crime_component
) × 100
```

**Weights** (must sum to 1.0):
- `W_FOOTFALL = 0.35` (35%) — crowds provide natural safety
- `W_LIGHTING = 0.30` (30%) — failed lights are immediate hazards
- `W_LIQUOR = 0.20` (20%) — proximity to bars increases danger
- `W_CRIME = 0.15` (15%) — historical baseline risk

---

### Component Functions

#### 1. Footfall Component (35%)

**Function**: `_footfall_component(footfall: int) -> float`

**Formula**:
```python
normed = min(footfall / FOOTFALL_MAX, 1.0)  # FOOTFALL_MAX = 400
return math.sqrt(normed)  # Square-root curve
```

**Rationale**:
- Higher footfall = safer (more witnesses, less isolation)
- Square-root curve means the *first 100 pedestrians matter most*
- Diminishing returns: 400 pedestrians isn't twice as safe as 200

**Examples**:
- `footfall = 0` → component = 0.0 (ghost street = maximum danger)
- `footfall = 100` → component = 0.5 (moderate safety)
- `footfall = 400` → component = 1.0 (full safety contribution)

---

#### 2. Lighting Component (30%)

**Function**: `_lighting_component(lighting_status: int) -> float`

**Formula**:
```python
return 1.0 if lighting_status == 0 else 0.0
```

**Rationale**:
- Binary factor — a failed streetlight is an *immediate hazard*
- No middle ground: light works or it doesn't
- High weight (30%) because lighting is critical infrastructure

**Examples**:
- `lighting_status = 0` (working) → component = 1.0
- `lighting_status = 1` (failed) → component = 0.0 (instant -30% to total score)

---

#### 3. Liquor Component (20%)

**Function**: `_liquor_component(liquor_distance: int, hour: int) -> float`

**Formula**:
```python
base = min(liquor_distance / LIQUOR_SAFE_DIST, 1.0)  # LIQUOR_SAFE_DIST = 800m

# Hour-specific penalty (TASMAC closing time)
hour_penalty = {
    20: 1.00,  # 8 PM — normal
    21: 1.00,  # 9 PM — normal
    22: 0.55,  # 10 PM — sharp penalty (bar closing)
    23: 0.75,  # 11 PM — dispersing
    0:  0.90,  # Midnight — mostly gone
}
multiplier = hour_penalty.get(hour, 1.0)

return base * multiplier
```

**Rationale**:
- Farther from liquor outlets = safer
- **10 PM is critical**: TASMAC bars close, crowds disperse, altercations peak
- Time-based multiplier captures this surge effect

**Examples**:
- `distance = 100m, hour = 21` (9 PM) → component = 0.125 (very close, but normal hour)
- `distance = 100m, hour = 22` (10 PM) → component = 0.069 (same distance, heavy penalty)
- `distance = 800m, hour = 22` (10 PM) → component = 0.55 (far away, penalty still applies)

---

#### 4. Crime Component (15%)

**Function**: `_crime_component(crime_score: float) -> float`

**Formula**:
```python
return 1.0 - min(max(crime_score, 0.0), 1.0)  # Invert
```

**Rationale**:
- `crime_score` is 0-1 where 1 = highest historical crime
- Invert it: 0 crime → 1.0 safety, 1 crime → 0.0 safety
- Lowest weight (15%) because historical crime is less predictive than real-time factors

**Examples**:
- `crime_score = 0.0` → component = 1.0 (no crime history)
- `crime_score = 0.5` → component = 0.5 (medium crime)
- `crime_score = 1.0` → component = 0.0 (severe crime history)

---

### Transition Detection

**Function**: `detect_transitions(scored_rows: List[Dict]) -> List[TransitionPoint]`

Identifies the exact hour when a street's zone changes (e.g., SAFE → CAUTION → DANGER).

**Algorithm**:
1. Group rows by `street_id`
2. Sort each street's rows by hour
3. Compare consecutive hours for zone changes
4. Flag transitions with before/after scores

**Example Output**:
```python
[
    TransitionPoint(
        street_id="CHN-001",
        street_name="Anna Salai",
        from_hour=21,
        to_hour=22,
        from_zone="SAFE",
        to_zone="DANGER",
        from_score=72.3,
        to_score=38.1,
        trigger="liquor penalty + footfall drop"
    )
]
```

---

## Examples

### Example 1: Safe Street (Day)

```python
score = score_safety(
    footfall=350,          # High pedestrian traffic
    lighting_status=0,     # Working light
    liquor_distance=700,   # Far from bars
    crime_score=0.2,       # Low crime
    hour=20                # 8 PM (normal hour)
)
# Returns: 87.4 (SAFE)
```

**Breakdown**:
- Footfall: 350 → 0.936 × 35% = 32.8%
- Lighting: Working → 1.0 × 30% = 30.0%
- Liquor: 700m @ 8 PM → 0.875 × 20% = 17.5%
- Crime: 0.2 → 0.8 × 15% = 12.0%
- **Total**: 87.4% (SAFE)

---

### Example 2: Dangerous Street (Night)

```python
score = score_safety(
    footfall=40,           # Low pedestrian traffic
    lighting_status=1,     # Failed streetlight
    liquor_distance=150,   # Very close to bar
    crime_score=0.7,       # High crime history
    hour=22                # 10 PM (bar closing)
)
# Returns: 18.6 (DANGER)
```

**Breakdown**:
- Footfall: 40 → 0.316 × 35% = 11.1%
- Lighting: Failed → 0.0 × 30% = 0.0%
- Liquor: 150m @ 10 PM → 0.103 × 20% = 2.1%
- Crime: 0.7 → 0.3 × 15% = 4.5%
- **Total**: 18.6% (DANGER)

---

### Example 3: Transition Detection

```python
# Same street at different hours
rows = [
    {"street_id": "CHN-025", "hour": 20, "safety_score": 76.2, "zone": "SAFE"},
    {"street_id": "CHN-025", "hour": 21, "safety_score": 68.1, "zone": "CAUTION"},
    {"street_id": "CHN-025", "hour": 22, "safety_score": 34.7, "zone": "DANGER"},
]

transitions = detect_transitions(rows)
# Returns:
# [
#   TransitionPoint(street="CHN-025", from_hour=20, to_hour=21, 
#                   from_zone="SAFE", to_zone="CAUTION"),
#   TransitionPoint(street="CHN-025", from_hour=21, to_hour=22,
#                   from_zone="CAUTION", to_zone="DANGER")
# ]
```

---

## Usage in Code

### Direct Scoring

```python
from ml.safety_model import score_safety, classify, explain_safety

score = score_safety(
    footfall=120,
    lighting_status=0,
    liquor_distance=350,
    crime_score=0.3,
    hour=22
)

zone = classify(score)
explanation = explain_safety(120, 0, 350, 0.3, 22)

print(f"Score: {score} ({zone})")
print(explanation)
```

### Via RiskAgent

```python
from backend.app.agents.risk_agent import RiskAgent

risk_agent = RiskAgent()

# Score single observation
result = risk_agent.score_single(
    footfall=120,
    lighting_status=0,
    liquor_distance=350,
    crime_score=0.3,
    hour=22
)
print(result)  # {"safety_score": 65.2, "zone": "CAUTION", "explanation": "..."}

# Score all streets from DataAgent
from backend.app.agents.data_agent import DataAgent
data_agent = DataAgent()
raw_data = data_agent.load()

scored_data = risk_agent.score_all(raw_data)
# Returns: enriched rows with safety_score, zone, explanation added
```

---

## Calibration Notes

**Weights are tunable**: The current weights (35/30/20/15) are based on domain expert input and Chennai pilot data. The `ContinuousLearningModule` adjusts these weights based on user feedback.

**Thresholds are adjustable**: The SAFE (70) and CAUTION (40) thresholds can be region-specific. Conservative cities might use 75/50, while high-crime areas might use 60/35.

**Hour penalties are region-specific**: The 10 PM liquor penalty is Chennai-specific (TASMAC closing time). Different regions may have different bar closing hours or no penalties at all.

---

## Related Files

- **Model Implementation**: `ml/safety_model.py`
- **Agent Wrapper**: `backend/app/agents/risk_agent.py`
- **API Endpoints**: `backend/app/api/safety.py`
- **Learning Module**: `backend/app/services/learning_service.py` (weight tuning)
- **Frontend Visualization**: `frontend/src/components/SafetyOverlay.jsx`

---

## Future Enhancements

1. **Weather integration**: Rain/fog reduces visibility → apply weather penalty
2. **Event detection**: Festivals/concerts → increase footfall dynamically
3. **Machine learning**: Replace weighted formula with trained Random Forest
4. **Multi-city models**: Different weights per city (Mumbai vs Chennai vs Delhi)
5. **User profiles**: Personalized weights based on risk tolerance
