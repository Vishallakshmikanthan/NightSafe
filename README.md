# NightSafe

**AI-powered safe route navigation for nighttime travel.**

NightSafe uses crime data, lighting information, and ML-based safety scoring to recommend the safest walking routes at night.

## Project Structure

```
nightsafe/
├── frontend/   → React + Leaflet map UI (Vite)
├── backend/    → FastAPI REST API
├── data/       → Sample CSV datasets (crime, lighting, routes)
├── ml/         → Safety scoring ML model
└── docs/       → Architecture diagrams & documentation
```

## Quick Start

### Prerequisites

- Node.js >= 18
- Python >= 3.10
- pip / venv

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # fill in your API keys
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in your API keys
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 3. ML Model

```bash
cd ml
pip install -r requirements.txt
python train.py        # train the safety scoring model
python predict.py      # run predictions on sample data
```

## Environment Variables

Copy each `.env.example` to `.env` and fill in the required values:

| Variable | Location | Description |
|---|---|---|
| `MAPBOX_TOKEN` | frontend | Mapbox GL / Leaflet tile token |
| `GOOGLE_MAPS_API_KEY` | backend | Google Maps API key (routing) |
| `DATABASE_URL` | backend | Database connection string |
| `SECRET_KEY` | backend | JWT / session secret |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Leaflet, Tailwind CSS |
| Backend | Python 3.10+, FastAPI, Uvicorn |
| ML | scikit-learn, pandas, numpy |
| Data | CSV datasets, SQLite (dev) |

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full system design.

## License

MIT
