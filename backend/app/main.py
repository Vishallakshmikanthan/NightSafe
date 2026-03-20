from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import health, safety, routes

app = FastAPI(
    title="NightSafe API",
    description="AI-powered safe route navigation for nighttime travel",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health check for deployment platforms (Render, Railway)
@app.get("/health")
async def root_health():
    return {"status": "ok", "service": "NightSafe API"}

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(safety.router, prefix="/api", tags=["safety"])
app.include_router(routes.router, prefix="/api/routes", tags=["routes"])
