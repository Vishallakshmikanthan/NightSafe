# NightSafe — GitHub Copilot Instructions

This file provides guidance for all Copilot interactions within the NightSafe project.

---

## 1. Project Overview

**NightSafe** is an AI-powered street safety prediction system for nighttime travel in Chennai.

**Core Innovation**: Time-of-night danger transition detection  
- Streets are scored 0-100 based on real-time factors (footfall, lighting, liquor proximity, crime)
- The system detects the exact moment a safe street becomes dangerous (e.g., 75 at 8 PM → 20 at 10:15 PM)
- Alerts users *before* they enter danger zones

**Problem Addressed**: Traditional safety apps use static crime maps; NightSafe predicts *when* and *why* streets become dangerous in real-time.

---

## 2. Architecture Rules

### Modular Structure

```
/backend    → FastAPI server, agents, services
/frontend   → React + Leaflet UI
/ml         → Safety scoring model, investment optimization
/data       → CSV datasets (Chennai street data)
/docs       → Architecture and development guides
```

### Agent-Based Architecture

The system uses **5 coordinated agents**:

1. **DataAgent** (`backend/app/agents/data_agent.py`)  
   - Loads and validates CSV data
   - Normalizes raw inputs

2. **RiskAgent** (`backend/app/agents/risk_agent.py`)  
   - Computes safety scores using weighted formula
   - Predicts next-hour trends
   - Provides explainable AI reasoning

3. **AnomalyAgent** (`backend/app/agents/anomaly_agent.py`)  
   - Detects outliers using Z-score analysis
   - Identifies sudden safety score drops

4. **GeoAgent** (`backend/app/agents/geo_agent.py`)  
   - Clusters danger zones spatially
   - Calculates Haversine distances

5. **AlertAgent** (`backend/app/agents/alert_agent.py`)  
   - Dispatches 3 types of alerts: User toasts, Police dispatch, GCC infrastructure

**Orchestrator** (`backend/app/services/agent_orchestrator.py`)  
- Central coordinator that wires all agents together
- Singleton instance imported throughout the app
- Exposes high-level API operations

**Pipeline Flow**:
```
DataAgent → RiskAgent → {AnomalyAgent, GeoAgent, AlertAgent}
```

---

## 3. Coding Standards

### General Principles
- **Clean, readable, modular code** — each agent/service has a single responsibility
- **Meaningful variable names** — `footfall`, `safety_score`, not `x`, `val`
- **Comment all core logic** — especially scoring formulas, thresholds, and algorithms
- **Avoid hardcoding** — use constants at module level (e.g., `W_FOOTFALL = 0.35`, `SAFE_THRESHOLD = 70`)

### Python (Backend + ML)
- Follow PEP 8 style
- Use type hints for function signatures
- Prefer dataclasses for structured data
- Docstrings for all agents and services

### JavaScript (Frontend)
- Use functional React components (hooks, not classes)
- ESLint defaults
- Descriptive component names (`NightSafeMap`, `RouteSearch`, not `Map1`, `Search`)

### File Organization
- One agent per file in `backend/app/agents/`
- One service per file in `backend/app/services/`
- Reusable UI components in `frontend/src/components/`

---

## 4. Feature Requirements

The system MUST support these core features (as specified in the project presentation):

### Time-Based Safety Scoring
- Score formula: `(footfall × 35%) + (lighting × 30%) + (liquor × 20%) + (crime × 15%)`
- Score bands: > 70 = SAFE, 40-70 = CAUTION, < 40 = DANGER
- Hour-specific penalties (e.g., 10 PM bar closing → liquor penalty surge)

### Real-Time Updates
- Background simulation engine that updates safety scores every 30 seconds
- Simulates footfall drops, lighting failures, liquor surge events

### Safe Routing
- Dijkstra's algorithm on 50-street graph
- Edge weight = `distance / safety_score` (low safety → avoid)
- Returns safest route with total safety score

### Alerts System
- **User alerts**: Danger zone warnings (toasts/push notifications)
- **Police alerts**: HIGH/CRITICAL anomalies requiring patrol
- **GCC alerts**: Infrastructure issues (lighting failures, persistent danger zones)

### Explainable AI
- Every safety score comes with human-readable explanation
- Example: "Score: 32. Low footfall (120), failed streetlight, TASMAC nearby (150m)"

### Investment Optimization
- Ranks streets by danger frequency, average safety score, footfall
- Recommends top N streets for government lighting/CCTV investment

### Multi-Agent Pipeline
- All 5 agents orchestrated via `agent_orchestrator.py`
- Supports parallel execution (AnomalyAgent, GeoAgent, AlertAgent run independently)

---

## 5. Git Rules

### Commit Message Format

Use the following prefixes:

- `[feature]` — new functionality  
  Example: `[feature] add safety score prediction endpoint`

- `[fix]` — bug fixes  
  Example: `[fix] handle missing street_id in routing`

- `[refactor]` — code restructuring (no behavior change)  
  Example: `[refactor] extract scoring logic to RiskAgent`

- `[docs]` — documentation updates  
  Example: `[docs] add architecture diagram to README`

- `[test]` — test additions/updates  
  Example: `[test] add unit tests for anomaly detection`

### Commit Granularity
- **Small commits per feature** — don't bundle unrelated changes
- One logical change per commit (e.g., "add footfall normalization" not "add footfall and fix routing")

### Branching (if applicable)
- `main` — stable production-ready code
- `dev` — integration branch for feature development
- `feature/` — individual feature branches (e.g., `feature/real-time-alerts`)

---

## 6. Tech Stack

### Frontend
- **React 18** with Vite (fast dev server)
- **Leaflet.js** for map rendering (`react-leaflet`)
- **Tailwind CSS** for styling (with custom night theme)
- **Axios** for HTTP requests to backend

### Backend
- **FastAPI** 0.111+ (async Python web framework)
- **Uvicorn** (ASGI server)
- **Pydantic** for request/response validation (schemas in `models/schemas.py`)

### ML / Data Science
- **Scikit-learn** for clustering (KMeans in GeoAgent)
- **Custom safety model** in `ml/safety_model.py` (weighted scoring, no external ML model)
- **CSV files** for Chennai street data (simulated real-time data)

### Data Storage
- **In-memory** caching (lists, dicts)
- **JSON files** for persistent learning state (`weights.json`)
- SQLite configured but unused (future production enhancement)

### Deployment (Render)
- Backend: `render.yaml` specifies build + start commands
- Frontend: Vite build → static files served via CDN

---

## 7. Development Workflow

### Local Setup
1. **Backend**: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
2. **Frontend**: `cd frontend && npm install && npm run dev`
3. **ML**: `cd ml && python train.py` (if retraining models)

### Testing
- Run smoke tests: `cd backend && pytest test_smoke.py`
- Manual testing: Use Postman or `curl` for API endpoints
- Frontend testing: Browser console + visual inspection

### Before Committing
- Ensure no hardcoded credentials (use `.env` files)
- Run linters: `black`, `flake8` (Python), `eslint` (JavaScript)
- Test affected endpoints/components

---

## 8. Key Constraints

- **Chennai-specific**: System is hardcoded for 50 Chennai streets (IDs: CHN-001 to CHN-050)
- **Nighttime hours**: Model tested for 8 PM - midnight (hours 20-23, 0)
- **No live data**: Currently uses CSV simulation; real-time feeds are architecture-ready but not connected
- **Single user**: No authentication or multi-user support yet

---

## 9. Resources

- **Architecture**: See `docs/architecture.md` for system design
- **Development guide**: See `docs/development.md` for setup instructions
- **Data**: See `data/README.md` for dataset descriptions
- **API endpoints**: See `backend/app/api/routes.py` for full list

---

**When in doubt**: Follow the agent-based architecture. Every new feature should either enhance an existing agent or justify creating a new one.
