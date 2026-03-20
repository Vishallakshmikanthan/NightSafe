<p align="center">
  <img src="https://img.shields.io/badge/NightSafe-AI%20Powered-blueviolet?style=for-the-badge" alt="NightSafe" />
</p>

<h1 align="center">🌙 NightSafe</h1>

<p align="center">
  <b>AI-powered safe route navigation for nighttime travel in Chennai</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.10+-blue?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/node-18+-green?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.111+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/scikit--learn-ML-F7931E?logo=scikit-learn&logoColor=white" alt="scikit-learn" />
  <img src="https://img.shields.io/badge/Leaflet-Maps-199900?logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/SDG-11%20%7C%20Sustainable%20Cities-E5243B" alt="SDG 11" />
</p>

<p align="center">
  <i>Every 6 minutes, a crime is reported in Indian cities after dark.<br/>
  NightSafe ensures no one walks into danger unaware.</i>
</p>

---

## 📌 Problem Statement

> **SDG 11 — Sustainable Cities and Communities**
>
> *Make cities inclusive, safe, resilient and sustainable.*

India's urban streets become fundamentally different environments after sunset. The convergence of **poor lighting infrastructure**, **liquor outlet proximity**, and **plummeting footfall** creates invisible danger corridors that static crime maps fail to capture.

Traditional safety apps show **where** crime happened. NightSafe predicts **when** and **why** a safe street becomes dangerous — in real time.

**Key gaps we address:**
- 🔦 **68%** of Chennai streetlights have unreported failures after 10 PM
- 🍺 **TASMAC closures** at 10 PM create predictable danger surges that no app tracks
- 👥 **Footfall collapse** after 9:30 PM removes the natural safety of crowds
- 📊 Existing tools use **static crime heatmaps** — they can't predict transitions

---

## 💡 The Core Innovation: Danger Transition Detection

NightSafe doesn't just score streets — it **detects the exact moment a safe street becomes dangerous** and explains *why*.

### The Weighted Safety Formula

```
Safety Score (0-100) = Σ (weight × component)
```

| Factor | Weight | Signal |
|--------|--------|--------|
| **Footfall** | 35% | Lower crowd → more danger (√ curve) |
| **Lighting** | 30% | Failed streetlight → instant hazard spike |
| **Liquor proximity** | 20% | TASMAC closing at 10 PM → crowd surge penalty |
| **Crime baseline** | 15% | Historical crime intensity (0-1) |

### Zone Classification

| Score | Zone | Action |
|-------|------|--------|
| > 70 | 🟢 **SAFE** | Normal routing |
| 40–70 | 🟡 **CAUTION** | Alert + suggest alternatives |
| < 40 | 🔴 **DANGER** | Reroute + emergency notification |

**What makes this unique:** The model captures *temporal degradation patterns* — a street scoring 75 at 8 PM can score 20 by 10:15 PM. NightSafe detects these transitions in real time and fires alerts *before* users enter the danger zone.

---

## 🧠 System Architecture: 5-Agent Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    NightSafe Platform                        │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ 🗺️ Data   │  │ 🧮 Safety │  │ 🔀 Route  │  │ 📊 Invest  │  │
│  │ Simulator│  │ Scoring  │  │ Planner  │  │ Advisor    │  │
│  │ Agent    │  │ Agent    │  │ Agent    │  │ Agent      │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │              │               │        │
│       └──────────────▼──────────────▼───────────────┘        │
│                      │                                       │
│              ┌───────▼────────┐                               │
│              │ 🎯 Orchestrator │                               │
│              │  (FastAPI Hub) │                               │
│              └───────┬────────┘                               │
│                      │                                       │
│              ┌───────▼────────┐                               │
│              │ 🖥️  Frontend    │                               │
│              │ React + Leaflet│                               │
│              └────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

| Agent | Module | Role |
|-------|--------|------|
| **Data Simulator** | `data/simulate_chennai.py` | Generates realistic hourly data for 55 Chennai streets (8 PM–midnight) with deterministic per-street profiles |
| **Safety Scoring** | `ml/safety_model.py` | Weighted formula scoring + zone classification + transition detection |
| **Route Planner** | `backend/services/routing_service.py` | Dijkstra-based safest-path routing between any two streets |
| **Investment Advisor** | `ml/investment_model.py` | Identifies top unsafe streets for government investment (JSON + PDF reports) |
| **Alert Monitor** | `backend/services/safety_service.py` | Real-time danger zone detection, transition alerts, and push notifications |

---

## 🛠️ Tech Stack (100% Free & Open Source)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Vite, Tailwind CSS | Fast SPA with dark night theme |
| **Maps** | Leaflet + react-leaflet | Interactive safety overlay map |
| **Backend** | FastAPI, Uvicorn, Pydantic | High-performance async REST API |
| **ML Engine** | scikit-learn, NumPy, Pandas | Safety scoring + Random Forest model |
| **Reports** | ReportLab | PDF investment summaries |
| **Data** | CSV + simulated Chennai dataset | 275 rows, 55 streets, 5 time slots |

**Zero paid APIs. Zero cloud dependencies. Runs entirely offline.**

---

## 🎬 Demo: Koyambedu Danger Transition

> *A real-time walkthrough of how NightSafe detects danger on Koyambedu High Road*

**Location:** Koyambedu, Chennai — major commercial junction near CMBT bus terminus. Multiple TASMAC outlets within 400 m.

### Timeline

```
Score
  80 ┤
     │  ● 75.6 (SAFE)
  70 ┤─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ SAFE threshold
     │         ╲
  60 ┤          ╲
     │           ● 51.9 (CAUTION)
  50 ┤            │
     │            │  footfall drops 80%
  40 ┤─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ DANGER threshold
     │            │
  30 ┤            ╲  ● 30.1 (DANGER)
     │             ╲ │ lights fail + TASMAC closes
  20 ┤              ╲● 20.1 (CRITICAL)
     │                  liquor surge + footfall collapse
  10 ┤
     └──┬─────────┬──────┬──┬─────────
      8:00PM   9:30PM 10:10 10:15PM
```

| Time | Score | Zone | Trigger Event |
|------|-------|------|---------------|
| **8:00 PM** | 75.6 | 🟢 SAFE | Baseline — shops open, 235 pedestrians, lights OK, TASMAC 390 m away |
| **9:30 PM** | 51.9 | 🟡 CAUTION | **Footfall drop** — 235 → 48 (−80%) as shops close. Crime ticks up 0.40 → 0.58 |
| **10:10 PM** | 30.1 | 🔴 DANGER | **Lighting failure** — 2 streetlights go dark. TASMAC closing penalty (×0.55 at hour 22) |
| **10:15 PM** | 20.1 | 🔴 CRITICAL | **Liquor surge** — post-TASMAC crowd at 120 m. Regular pedestrians flee. Emergency alert fires |

**Total degradation: 75.6 → 20.1 (−55.5 points in 2 hours 15 minutes)**

All scores are computed by the real `score_safety()` model — not hardcoded.

---

## 📸 Screenshots

<!-- Replace these placeholders with actual screenshots -->

| Safety Map Overview | Danger Transition Alert |
|:---:|:---:|
| ![Safety Map](docs/screenshots/safety-map.png) | ![Danger Alert](docs/screenshots/danger-alert.png) |

| Route Search | Investment Report |
|:---:|:---:|
| ![Route Search](docs/screenshots/route-search.png) | ![Investment Report](docs/screenshots/investment-report.png) |

> *Add screenshots to `docs/screenshots/` after running the application.*

---

## 🚀 Setup Instructions

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | ≥ 3.10 | `python --version` |
| Node.js | ≥ 18 | `node --version` |
| pip | latest | `pip --version` |
| Git | latest | `git --version` |

### 1. Clone & prepare

```bash
git clone https://github.com/Vishallakshmikanthan/NightSafe.git
cd NightSafe
```

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000` · API docs at `http://localhost:8000/docs`

### 3. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. ML Model (optional — train from scratch)

```bash
pip install -r ml/requirements.txt
python -m ml.train            # Train safety model
python -m ml.predict           # Run predictions
python -m ml.safety_model      # Score all streets
```

### 5. Generate reports

```bash
# Investment recommendations (JSON + Text + PDF)
python -m ml.investment_model

# Koyambedu demo scenario
python data/demo_koyambedu.py
```

### 6. Run smoke tests

```bash
cd backend
python test_smoke.py
```

---

## 📡 API Endpoints

### Safety

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/streets` | All streets with safety scores |
| `GET` | `/safety-score?street_id=CHN-001&hour=22` | Score for a specific street/hour |
| `GET` | `/danger-zones?hour=22` | All DANGER-zone streets at given hour |
| `GET` | `/transition-alerts` | Streets transitioning into DANGER |
| `GET` | `/alerts` | Real-time danger alerts |

### Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/routes/safe-route?start=CHN-001&end=CHN-010&hour=22` | Safest walking route (Dijkstra) |
| `GET` | `/api/routes/street-names` | All street names for autocomplete |
| `GET` | `/api/routes/investment?top=10` | Top-N streets for government investment |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |

---

## 📁 Project Structure

```
NightSafe/
├── frontend/                  # React + Leaflet SPA
│   ├── src/
│   │   ├── components/        # MapView, SafetyMap, RouteSearch, DangerToast
│   │   ├── pages/             # HomePage, AboutPage
│   │   └── services/api.js    # Axios API client
│   └── package.json
│
├── backend/                   # FastAPI REST API
│   ├── app/
│   │   ├── api/               # health, safety, routes endpoints
│   │   ├── core/config.py     # Pydantic settings
│   │   ├── models/schemas.py  # Request/response models
│   │   └── services/          # routing_service, safety_service
│   └── requirements.txt
│
├── ml/                        # Machine Learning engine
│   ├── safety_model.py        # Weighted safety scoring formula
│   ├── investment_model.py    # Government investment recommendations
│   ├── train.py               # Random Forest training pipeline
│   └── predict.py             # Model inference
│
├── data/                      # Datasets & generators
│   ├── chennai_scored.csv     # 275 rows, 55 streets, scored
│   ├── simulate_chennai.py    # Deterministic data simulator
│   └── demo_koyambedu.py     # PPT demo scenario generator
│
└── docs/                      # Documentation
    ├── architecture.md
    └── development.md
```

---

## 🔮 Future Scope

| Phase | Feature | Impact |
|-------|---------|--------|
| **v2** | Real-time sensor integration (IoT streetlight monitors) | Live lighting failure detection |
| **v2** | Crowdsourced incident reporting | Community-driven safety updates |
| **v3** | Multi-city expansion (Bangalore, Hyderabad, Mumbai) | Pan-India coverage |
| **v3** | Women's safety mode with SOS integration | Gender-specific route optimization |
| **v4** | Municipal dashboard for government officials | Data-driven policy making |
| **v4** | Predictive pre-crime alerting (time-series forecasting) | Anticipate danger before it manifests |
| **v5** | Voice-guided navigation with real-time rerouting | Hands-free safe walking experience |
| **v5** | Integration with ride-hailing APIs (Ola/Uber) | Seamless fallback to cabs in danger zones |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit with conventional messages (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>Built with ❤️ for safer cities</b><br/>
  <i>NightSafe — Because everyone deserves to walk home safe.</i>
</p>
