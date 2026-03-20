# NightSafe — Development Guide

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | >= 18 |
| Python | >= 3.10 |
| pip | latest |
| Git | latest |

## Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### ML Model

```bash
cd ml
pip install -r requirements.txt
python train.py
python predict.py
```

## Project Conventions

- **Python**: PEP 8, type hints where practical
- **JavaScript**: ESLint defaults, functional components
- **Git**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Branching**: `main` (stable), `dev` (integration), `feature/*`

## Folder Responsibilities

| Folder | Owner | Purpose |
|---|---|---|
| `frontend/` | Frontend team | React UI, Leaflet map, API calls |
| `backend/` | Backend team | FastAPI routes, services, data access |
| `data/` | Data team | CSV datasets, data pipeline scripts |
| `ml/` | ML team | Model training, evaluation, inference |
| `docs/` | All | Architecture docs, guides, ADRs |
