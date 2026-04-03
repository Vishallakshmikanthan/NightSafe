# NightSafe

NightSafe is an AI-driven urban safety platform for safer movement through Chennai after dark. It combines live safety scoring, explainable routing, predictive alerts, personal safety tools, and a city-scale multi-agent intelligence layer into one system.

The project is built as a full-stack application:

- Frontend: React, Vite, Tailwind, Framer Motion, Deck.gl, Leaflet
- Backend: FastAPI, Pydantic, service-oriented APIs
- ML and analytics: Pandas, NumPy, scikit-learn
- Data: Chennai street, crime, lighting, routing, and simulation datasets

## Why NightSafe Exists

Most safety apps are reactive. They show where incidents have already happened.

NightSafe is designed to answer higher-value questions:

- Which streets are safe right now?
- Which route is safest, not just fastest?
- Why is a route becoming dangerous?
- What changes as the hour moves from evening into late night?
- Which parts of the city need infrastructure intervention next?

That turns NightSafe from a map into an intelligence system.

## Core Capabilities

### Real-time safety map

- City-wide safety visualization for Chennai
- Danger zones and safer corridors by hour
- Live alerts and route overlays
- Cinematic, high-clarity map interface built for quick reading under pressure

### Safe route planning

- Route search with safety-aware alternatives
- Safest, balanced, and fastest route variants
- Route-level explainability with segment-by-segment reasons
- Dynamic route insights such as danger segment counts and safer alternatives

### Predictive intelligence

- Predictive insights for selected streets and routes
- Safety trend view across the night
- Incident replay and time-travel timeline to inspect how city risk changes by hour
- Rule-based forecasting that surfaces likely unsafe windows before users enter them

### Personal safety system

- SOS trigger with visible and silent activation modes
- Safety timer with automatic escalation
- Fake call mode for social escape scenarios
- Geofencing and safe zone monitoring
- Trip sharing and live trip status
- Crash detection simulation and escalation flow
- Local-first emergency profile and offline alert queueing

### Multi-agent AI orchestrator

The latest flagship feature adds a city-scale orchestration engine that simulates multiple specialized agents working together:

- Risk Agent
- Crowd Agent
- Alert Agent
- Route Agent
- Investment Agent

These agents analyze current conditions and produce:

- city risk summaries
- footfall and density interpretations
- predictive warnings
- rerouting guidance
- infrastructure and investment recommendations

This system is exposed in the frontend through the AI agent dashboard and orchestrated client-side without changing backend APIs.

## Architecture Snapshot

```text
NightSafe
├── frontend
│   ├── map and overlays
│   ├── route planning and trip safety UX
│   ├── explainability and timeline views
│   ├── AI agent dashboard
│   └── personal safety features
├── backend
│   ├── health, safety, routes, alerts APIs
│   ├── agent-related endpoints
│   ├── routing and safety services
│   └── schema and config layers
├── ml
│   ├── safety scoring
│   ├── investment analysis
│   ├── training and prediction scripts
│   └── model artifacts
└── data
    ├── Chennai scored datasets
    ├── route segments
    ├── demo scenarios
    └── simulation inputs
```

## Notable Frontend Features

- Deck.gl map rendering and safety overlays
- Route planner with explainability panel
- Predictive insights panel
- Incident timeline replay
- AI companion and live intelligence components
- Safety hub for SOS, timer, geofence, fake call, and crash detection
- Agent dashboard with tabs for risk, crowd, alerts, routes, and investment

## Multi-Agent Engine

The orchestration engine lives in:

- frontend/src/agents/agentEngine.js

It runs five specialized agents and returns structured intelligence for the UI:

```js
{
  risk,
  crowd,
  alert,
  route,
  investment,
  timestamp,
}
```

Design goals of the agent engine:

- no backend API changes
- safe fallback behavior on partial failures
- Promise.allSettled for graceful degradation
- lightweight, rule-based orchestration to avoid browser overload
- debounced refresh and interval cleanup in UI consumers

## Project Structure

```text
NightSafe/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   └── services/
│   ├── requirements.txt
│   └── test_smoke.py
├── data/
│   ├── chennai_scored.csv
│   ├── chennai_street_data.csv
│   ├── crime_data.csv
│   ├── lighting_data.csv
│   ├── route_segments.csv
│   └── demo and report artifacts
├── docs/
├── frontend/
│   ├── src/
│   │   ├── agents/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── ml/
│   ├── investment_model.py
│   ├── safety_model.py
│   ├── predict.py
│   ├── train.py
│   └── requirements.txt
├── render.yaml
└── README.md
```

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Vishallakshmikanthan/NightSafe.git
cd NightSafe
```

### 2. Start the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Local backend runs at:

- API: http://localhost:8001
- OpenAPI docs: http://localhost:8001/docs

Note: the frontend is currently configured to use port 8001 for local backend access.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL:

- http://localhost:5173

If that port is occupied, Vite may move to the next available port such as 5174.

### 4. Optional ML workflows

```bash
pip install -r ml/requirements.txt
python -m ml.train
python -m ml.predict
python -m ml.safety_model
python -m ml.investment_model
```

### 5. Smoke test

```bash
cd backend
python test_smoke.py
```

## API Overview

Representative endpoints already used by the frontend:

### Safety and alerts

- GET /api/streets
- GET /api/safety-score
- GET /api/danger-zones
- GET /api/transition-alerts
- GET /api/alerts

### Routing

- GET /api/routes/safe-route
- GET /api/routes/street-names

### Agent and analytics endpoints

- GET /api/agents/anomalies
- GET /api/agents/geo-clusters
- GET /api/agents/predict
- GET /api/agents/police-alerts
- GET /api/agents/gcc-alerts
- GET /api/agents/investment-report
- POST /api/agents/feedback
- POST /api/agents/learn
- GET /api/agents/learning
- POST /api/agents/simulation/start
- POST /api/agents/simulation/stop
- GET /api/agents/simulation/status

## Deployment

Render deployment config is included in render.yaml.

Current Render setup:

- Python web service
- build installs backend and ML dependencies
- start command launches FastAPI from backend/app.main
- health check path: /health

## Engineering Notes

This project intentionally emphasizes robust UI behavior and safe degradation:

- null-safe rendering across route and alert surfaces
- try/catch around orchestrated agent runs
- interval and listener cleanup in interactive components
- local-first fallbacks for offline and safety features
- minimal browser load with debounced orchestration updates

## Roadmap

- real sensor integration for lighting and crowd density
- stronger predictive modeling for hourly deterioration
- production-grade trip monitoring and contact delivery
- municipal operations dashboard for public agencies
- broader multi-city rollout beyond Chennai

## Screenshots and Demo Assets

The repository already includes demo datasets and scenario files under data/. You can add product screenshots under docs/ and link them here once final captures are ready.

## License

MIT

## Author

Vishallakshmikanthan

If you are viewing this on GitHub, this README reflects the current NightSafe platform including the new multi-agent AI orchestration layer.
