# NightSafe — Architecture

## System Overview

```
┌────────────────────────────────────────────────────────┐
│                     Client (Browser)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React + Leaflet UI                              │  │
│  │  • MapView with safety overlays                  │  │
│  │  • Route search form                             │  │
│  │  • Real-time safety indicators                   │  │
│  └──────────────────┬───────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────┘
                      │ REST API (JSON)
                      ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐    │
│  │  /health │  │  /safety │  │    /routes         │    │
│  └──────────┘  └────┬─────┘  └────────┬──────────┘    │
│                     │                  │               │
│            ┌────────▼──────────────────▼──────────┐    │
│            │        Safety Service                │    │
│            │  • Crime data aggregation            │    │
│            │  • Lighting data lookup              │    │
│            │  • ML model inference                │    │
│            └────────┬────────────────────────────┘    │
└─────────────────────┼──────────────────────────────────┘
                      │
         ┌────────────▼────────────┐
         │     ML Safety Model     │
         │  (scikit-learn / joblib) │
         │  Random Forest Regressor │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │       Data Layer        │
         │  • crime_data.csv       │
         │  • lighting_data.csv    │
         │  • route_segments.csv   │
         │  • SQLite (production)  │
         └─────────────────────────┘
```

## Components

### Frontend (`/frontend`)
- **Framework**: React 18 + Vite
- **Map**: Leaflet via `react-leaflet`
- **Styling**: Tailwind CSS with custom night theme
- **Routing**: React Router v6
- **HTTP**: Axios client with proxy to backend

### Backend (`/backend`)
- **Framework**: FastAPI with Uvicorn
- **Config**: Pydantic Settings (`.env` based)
- **Endpoints**:
  - `GET /api/health` — service health check
  - `GET /api/safety/scores` — safety scores for an area
  - `GET /api/routes/safe` — safest route between two points
- **Services**: Modular service layer for business logic

### ML Module (`/ml`)
- **Model**: Random Forest Regressor (scikit-learn)
- **Features**: crime count, lighting lux, CCTV presence, pedestrian traffic, segment distance
- **Target**: Safety score 0-100
- **Persistence**: joblib serialization

### Data (`/data`)
- Sample CSV files for development
- Production: NYC Open Data, municipal APIs

## Multi-Agent Scaling Plan

The architecture is designed to evolve into a multi-agent system:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Routing     │  │   Safety     │  │  Incident    │
│  Agent       │  │   Scoring    │  │  Monitor     │
│              │  │   Agent      │  │  Agent       │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └─────────────────▼──────────────────┘
                   Orchestrator
                   (message bus)
                         │
              ┌──────────▼──────────┐
              │    User Preference  │
              │    Learning Agent   │
              └─────────────────────┘
```

Each agent will operate independently with its own data pipeline,
communicate via an async message bus, and be deployable as a
separate microservice.

## API Design Principles

1. **RESTful** — resource-oriented endpoints
2. **Versioned** — `/api/v1/` prefix (future)
3. **Schema-validated** — Pydantic models for all I/O
4. **CORS-safe** — configurable allowed origins
5. **Environment-driven** — secrets via `.env`, never hardcoded
