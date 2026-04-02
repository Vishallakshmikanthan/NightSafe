# Alerts System

**Location**: `backend/app/agents/alert_agent.py`  
**API Endpoints**: `/api/agents/police-alerts`, `/api/agents/gcc-alerts`

---

## Purpose

The Alerts System is NightSafe's **multi-channel notification engine** that dispatches danger warnings to three distinct audiences:

1. **Users** — Push notifications/toasts warning of nearby danger zones
2. **Police** — Immediate dispatch alerts for HIGH/CRITICAL anomalies requiring patrol
3. **GCC (Greater Chennai Corporation)** — Infrastructure alerts for persistent danger zones needing lighting/CCTV fixes

The system maintains an **audit log** of all alerts with acknowledgment tracking, enabling accountability and post-incident analysis.

---

## Inputs

### 1. Danger Zones (for User Alerts)

**Type**: `List[Dict]`

**Structure**:
```python
{
    "street_id": "CHN-001",
    "street_name": "Anna Salai",
    "hour": 22,
    "safety_score": 32.4,
    "zone": "DANGER"
}
```

**Source**: Filtered output from `RiskAgent.score_all()` where `zone == "DANGER"` (score < 40).

---

### 2. Anomalies (for Police/GCC Alerts)

**Type**: `List[Anomaly]`

**Structure** (from `AnomalyAgent`):
```python
Anomaly(
    street_id="CHN-007",
    street_name="T. Nagar Main",
    hour=22,
    score=24.1,
    expected_score=68.5,
    deviation=3.2,  # Z-score
    drop_magnitude=44.4,  # Absolute score drop
    severity="CRITICAL"  # LOW / MEDIUM / HIGH / CRITICAL
)
```

**Source**: Output from `AnomalyAgent.detect()`.

---

### 3. Safety Score Threshold (Configuration)

**Type**: `int`

**Default**:
```python
DANGER_THRESHOLD = 40  # Scores below this trigger user alerts
POLICE_SEVERITY = ["HIGH", "CRITICAL"]  # Only severe anomalies dispatch police
```

---

## Outputs

### Alert Object

**Type**: `Alert` dataclass

**Structure**:
```python
@dataclass
class Alert:
    alert_id: str              # Unique identifier (e.g., "ALR-00042")
    timestamp: str             # ISO 8601 UTC (e.g., "2026-04-02T22:15:30Z")
    alert_type: str            # "USER" | "POLICE" | "GCC"
    severity: str              # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    street_id: str             # Street identifier
    street_name: str           # Human-readable name
    hour: int                  # Hour of occurrence (0-23)
    safety_score: float        # Current safety score
    message: str               # Human-readable alert text
    dispatched_to: str         # "user" | "police" | "gcc_dashboard"
    acknowledged: bool         # False by default
```

**Example**:
```python
Alert(
    alert_id="ALR-00042",
    timestamp="2026-04-02T22:15:30Z",
    alert_type="POLICE",
    severity="CRITICAL",
    street_id="CHN-007",
    street_name="T. Nagar Main",
    hour=22,
    safety_score=24.1,
    message="[POLICE ALERT] T. Nagar Main - Score dropped to 24.1 (expected 68.5). "
            "Severity: CRITICAL. Immediate patrol recommended.",
    dispatched_to="police",
    acknowledged=False
)
```

---

## Logic

### Alert Generation Pipeline

```
Danger Zones ──────┐
                    │
Anomalies ─────────┼──> AlertAgent ──┐
                    │                 │
Thresholds ────────┘                 │
                                     ▼
                        ┌────────────────────────┐
                        │ Alert Classification   │
                        │ (USER/POLICE/GCC)      │
                        └────────────────────────┘
                                     │
                        ┌────────────┼────────────┐
                        │            │            │
                        ▼            ▼            ▼
                   User Toasts   Police Dispatch   GCC Dashboard
```

---

### 1. User Alerts

**Function**: `generate_user_alerts(danger_zones: List[Dict]) -> List[Alert]`

**Triggers**:
- Any street with `safety_score < 40` (DANGER zone)

**Severity Classification**:
```python
if safety_score < 25:
    severity = "HIGH"  # Extreme danger
else:
    severity = "MEDIUM"  # Standard danger
```

**Message Format**:
```
[!] DANGER: {street_name} - Safety Score {score}. Avoid this area.
```

**Example**:
```python
danger_zones = [
    {"street_id": "CHN-007", "street_name": "T. Nagar", "safety_score": 22.4, "hour": 22}
]

alerts = alert_agent.generate_user_alerts(danger_zones)
# Returns:
[
    Alert(
        alert_id="ALR-00001",
        timestamp="2026-04-02T22:15:30Z",
        alert_type="USER",
        severity="HIGH",  # score < 25
        street_id="CHN-007",
        street_name="T. Nagar",
        hour=22,
        safety_score=22.4,
        message="[!] DANGER: T. Nagar - Safety Score 22.4. Avoid this area.",
        dispatched_to="user",
        acknowledged=False
    )
]
```

---

### 2. Police Alerts

**Function**: `generate_police_alerts(anomalies: List[Anomaly]) -> List[Alert]`

**Triggers**:
- Anomalies with `severity` in `["HIGH", "CRITICAL"]`
- Sudden safety score drops requiring immediate intervention

**Severity Pass-Through**:
- Uses the `severity` level from `Anomaly` object (determined by `AnomalyAgent`)

**Message Format**:
```
[POLICE ALERT] {street_name} - Score dropped to {score} (expected {expected_score}). 
Severity: {severity}. Immediate patrol recommended.
```

**Example**:
```python
anomalies = [
    Anomaly(
        street_id="CHN-007",
        street_name="T. Nagar",
        hour=22,
        score=24.1,
        expected_score=68.5,
        deviation=3.2,
        drop_magnitude=44.4,
        severity="CRITICAL"
    )
]

alerts = alert_agent.generate_police_alerts(anomalies)
# Returns:
[
    Alert(
        alert_id="ALR-00002",
        timestamp="2026-04-02T22:16:00Z",
        alert_type="POLICE",
        severity="CRITICAL",
        street_id="CHN-007",
        street_name="T. Nagar",
        hour=22,
        safety_score=24.1,
        message="[POLICE ALERT] T. Nagar - Score dropped to 24.1 (expected 68.5). "
                "Severity: CRITICAL. Immediate patrol recommended.",
        dispatched_to="police",
        acknowledged=False
    )
]
```

**Filtering**:
- `LOW` and `MEDIUM` anomalies do **not** trigger police alerts (only logged for GCC)

---

### 3. GCC Alerts

**Function**: `generate_gcc_alerts(anomalies: List[Anomaly]) -> List[Alert]`

**Triggers**:
- **All anomalies** (regardless of severity)
- Infrastructure issues: persistent low scores, lighting failures, high-crime corridors

**Purpose**:
- Long-term infrastructure improvements (streetlights, CCTV, crowd management)
- Not immediate — queued for municipal review

**Severity Pass-Through**:
- Uses the `severity` level from `Anomaly` object

**Message Format**:
```
[GCC INFRA ALERT] {street_name} - Score {score} (deviation {deviation} std). 
Review lighting and infrastructure status.
```

**Example**:
```python
anomalies = [
    Anomaly(
        street_id="CHN-015",
        street_name="Pondy Bazaar",
        hour=21,
        score=42.7,
        expected_score=55.3,
        deviation=2.1,
        drop_magnitude=12.6,
        severity="MEDIUM"
    )
]

alerts = alert_agent.generate_gcc_alerts(anomalies)
# Returns:
[
    Alert(
        alert_id="ALR-00003",
        timestamp="2026-04-02T22:17:00Z",
        alert_type="GCC",
        severity="MEDIUM",
        street_id="CHN-015",
        street_name="Pondy Bazaar",
        hour=21,
        safety_score=42.7,
        message="[GCC INFRA ALERT] Pondy Bazaar - Score 42.7 (deviation 2.1 std). "
                "Review lighting and infrastructure status.",
        dispatched_to="gcc_dashboard",
        acknowledged=False
    )
]
```

---

### Alert Log & Acknowledgment

#### Alert Log

**Function**: `get_alert_log(alert_type: Optional[str] = None, limit: int = 100) -> List[Dict]`

**Purpose**: Retrieve historical alerts for audit and analysis.

**Filters**:
- `alert_type`: Filter by `"USER"`, `"POLICE"`, or `"GCC"` (omit for all)
- `limit`: Max number of recent alerts (default 100)

**Example**:
```python
# Get last 50 police alerts
police_log = alert_agent.get_alert_log(alert_type="POLICE", limit=50)

# Get all recent alerts (all types)
full_log = alert_agent.get_alert_log(limit=100)
```

**Output**:
```python
[
    {
        "alert_id": "ALR-00042",
        "timestamp": "2026-04-02T22:15:30Z",
        "alert_type": "POLICE",
        "severity": "CRITICAL",
        "street_id": "CHN-007",
        "street_name": "T. Nagar",
        "hour": 22,
        "safety_score": 24.1,
        "message": "[POLICE ALERT] ...",
        "dispatched_to": "police",
        "acknowledged": False
    },
    # ... more alerts
]
```

---

#### Acknowledgment

**Function**: `acknowledge(alert_id: str) -> bool`

**Purpose**: Mark an alert as acknowledged (e.g., police arrived on scene, GCC noted issue).

**Returns**: `True` if alert found and acknowledged, `False` if alert ID doesn't exist.

**Example**:
```python
success = alert_agent.acknowledge("ALR-00042")
if success:
    print("Alert acknowledged")
else:
    print("Alert not found")
```

**Use Case**:
- Police dashboard acknowledges dispatch after patrol arrives
- GCC marks infrastructure issue as "in review"
- Prevents duplicate dispatches for same incident

---

## Examples

### Example 1: Complete Alert Pipeline

```python
from backend.app.services.agent_orchestrator import orchestrator

# Boot agents
orchestrator.boot()

# Get danger zones (score < 40)
scored_data = orchestrator.risk_agent.get_cached()
danger_zones = [
    row for row in scored_data
    if row["hour"] == 22 and row["zone"] == "DANGER"
]

# Generate user alerts
user_alerts = orchestrator.alert_agent.generate_user_alerts(danger_zones)
print(f"Generated {len(user_alerts)} user alerts")
# Output: "Generated 8 user alerts"

# Detect anomalies
anomalies = orchestrator.anomaly_agent.detect(scored_data)

# Generate police alerts (HIGH/CRITICAL only)
police_alerts = orchestrator.alert_agent.generate_police_alerts(anomalies)
print(f"Dispatched {len(police_alerts)} police alerts")
# Output: "Dispatched 3 police alerts"

# Generate GCC alerts (all anomalies)
gcc_alerts = orchestrator.alert_agent.generate_gcc_alerts(anomalies)
print(f"Queued {len(gcc_alerts)} GCC alerts")
# Output: "Queued 12 GCC alerts"
```

---

### Example 2: Severity Escalation

```python
# Same street at different severity levels

danger_zones_medium = [
    {"street_id": "CHN-020", "street_name": "Adyar", "safety_score": 38.0, "hour": 21}
]
alerts = alert_agent.generate_user_alerts(danger_zones_medium)
assert alerts[0].severity == "MEDIUM"  # score 38 (25-40 range)

danger_zones_high = [
    {"street_id": "CHN-020", "street_name": "Adyar", "safety_score": 18.0, "hour": 22}
]
alerts = alert_agent.generate_user_alerts(danger_zones_high)
assert alerts[0].severity == "HIGH"  # score 18 (< 25)
```

---

### Example 3: Alert Log Retrieval

```python
# Generate multiple alerts over time
alert_agent.generate_user_alerts(danger_zones_8pm)
alert_agent.generate_police_alerts(anomalies_9pm)
alert_agent.generate_gcc_alerts(anomalies_10pm)

# Retrieve logs
all_alerts = alert_agent.get_alert_log(limit=50)
print(f"Total alerts: {len(all_alerts)}")

police_only = alert_agent.get_alert_log(alert_type="POLICE", limit=20)
print(f"Police alerts: {len(police_only)}")

# Filter for unacknowledged alerts
unack = [a for a in all_alerts if not a["acknowledged"]]
print(f"Pending: {len(unack)}")
```

---

### Example 4: API Integration

**Backend Endpoint** (`backend/app/api/agents.py`):
```python
from fastapi import APIRouter
from backend.app.services.agent_orchestrator import orchestrator

router = APIRouter(prefix="/api/agents")

@router.get("/police-alerts")
def get_police_alerts():
    """Retrieve police dispatch alerts (HIGH/CRITICAL anomalies)."""
    return orchestrator.get_police_alerts()

@router.get("/gcc-alerts")
def get_gcc_alerts():
    """Retrieve GCC infrastructure alerts (all anomalies)."""
    return orchestrator.get_gcc_alerts()

@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    """Mark an alert as acknowledged."""
    success = orchestrator.alert_agent.acknowledge(alert_id)
    if success:
        return {"status": "acknowledged", "alert_id": alert_id}
    return {"error": "Alert not found"}, 404
```

**Frontend Component** (`frontend/src/components/AlertPanel.jsx`):
```javascript
import { useEffect, useState } from 'react';
import axios from 'axios';

function AlertPanel() {
    const [policeAlerts, setPoliceAlerts] = useState([]);

    useEffect(() => {
        const fetchAlerts = async () => {
            const response = await axios.get('/api/agents/police-alerts');
            setPoliceAlerts(response.data);
        };
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);  // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const handleAcknowledge = async (alertId) => {
        await axios.post(`/api/agents/alerts/${alertId}/acknowledge`);
        setPoliceAlerts(prev => prev.map(a => 
            a.alert_id === alertId ? {...a, acknowledged: true} : a
        ));
    };

    return (
        <div className="alert-panel">
            <h2>Police Dispatch Alerts</h2>
            {policeAlerts.map(alert => (
                <div key={alert.alert_id} className={`alert ${alert.severity.toLowerCase()}`}>
                    <span className="severity-badge">{alert.severity}</span>
                    <p>{alert.message}</p>
                    <small>{new Date(alert.timestamp).toLocaleString()}</small>
                    {!alert.acknowledged && (
                        <button onClick={() => handleAcknowledge(alert.alert_id)}>
                            Acknowledge
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
```

---

## Alert Severity Matrix

| Condition | Severity | User Alert | Police Dispatch | GCC Queue |
|-----------|----------|------------|-----------------|-----------|
| Score 40-70 (CAUTION) | — | ❌ No | ❌ No | ❌ No |
| Score 25-39 (DANGER) | MEDIUM | ✅ Yes | ❌ No | ✅ Yes* |
| Score < 25 (EXTREME DANGER) | HIGH | ✅ Yes | ✅ Yes** | ✅ Yes |
| Anomaly deviation > 3.0 | CRITICAL | ✅ Yes | ✅ Yes | ✅ Yes |

\* GCC receives alert if anomaly detected  
\** Police only if anomaly (not just low score)

---

## Alert De-Duplication

**Problem**: Same street may trigger multiple alerts across consecutive hours.

**Solution**: Use `alert_id` and timestamp to track unique incidents.

**Future Enhancement**:
```python
def _is_duplicate(self, street_id: str, hour: int, alert_type: str) -> bool:
    """Check if alert already exists for street/hour/type."""
    recent = [a for a in self._alert_log[-100:] 
              if a.street_id == street_id 
              and a.hour == hour 
              and a.alert_type == alert_type]
    return len(recent) > 0
```

---

## Performance

### Memory Usage

- **Alert log**: Stored in-memory (list of `Alert` objects)
- **Growth rate**: ~100 alerts per hour (50 streets × 2 alerts avg)
- **Retention**: Keep last 1000 alerts (auto-purge older)

**Memory estimate**: 1000 alerts × 500 bytes ≈ **500 KB** (negligible)

---

### Latency

| Operation | Time |
|-----------|------|
| `generate_user_alerts(10 zones)` | < 1 ms |
| `generate_police_alerts(5 anomalies)` | < 1 ms |
| `get_alert_log(limit=100)` | < 1 ms |
| `acknowledge(alert_id)` | < 0.1 ms |

**Total pipeline**: Data ingestion → Scoring → Anomaly detection → Alert generation ≈ **200-300 ms**

---

## Related Files

- **Agent Implementation**: `backend/app/agents/alert_agent.py`
- **API Endpoints**: `backend/app/api/agents.py`
- **Frontend Dashboard**: `frontend/src/pages/DashboardPage.jsx`
- **Orchestrator Integration**: `backend/app/services/agent_orchestrator.py`
- **Anomaly Detection**: `backend/app/agents/anomaly_agent.py` (provides input)

---

## Testing

### Unit Tests

```python
def test_user_alert_generation():
    agent = AlertAgent()
    zones = [
        {"street_id": "CHN-001", "street_name": "Test St", 
         "safety_score": 30.0, "hour": 22}
    ]
    alerts = agent.generate_user_alerts(zones)
    assert len(alerts) == 1
    assert alerts[0].alert_type == "USER"
    assert alerts[0].severity == "MEDIUM"

def test_police_alert_filtering():
    agent = AlertAgent()
    anomalies = [
        Anomaly(street_id="CHN-001", severity="LOW", score=50.0, ...),
        Anomaly(street_id="CHN-002", severity="CRITICAL", score=15.0, ...),
    ]
    alerts = agent.generate_police_alerts(anomalies)
    assert len(alerts) == 1  # Only CRITICAL, not LOW
    assert alerts[0].severity == "CRITICAL"

def test_acknowledgment():
    agent = AlertAgent()
    zones = [{"street_id": "CHN-001", "street_name": "Test", "safety_score": 30, "hour": 22}]
    alerts = agent.generate_user_alerts(zones)
    alert_id = alerts[0].alert_id
    
    success = agent.acknowledge(alert_id)
    assert success is True
    
    log = agent.get_alert_log()
    assert log[0]["acknowledged"] is True
```

---

## Future Enhancements

1. **Push Notifications**: Integrate Firebase Cloud Messaging (FCM) for mobile alerts
2. **SMS Dispatch**: Send SMS to police/GCC contacts for CRITICAL alerts
3. **Alert Clustering**: Group nearby alerts (e.g., "3 danger zones in T. Nagar area")
4. **Smart Throttling**: Avoid alert fatigue with rate limiting (max 5 alerts per hour per user)
5. **Predictive Alerts**: "CHN-007 will become dangerous in 30 minutes" (pre-emptive)
6. **Multi-Language**: Tamil, Hindi translations for messages
