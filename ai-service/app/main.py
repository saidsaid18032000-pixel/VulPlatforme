from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from app import service as ai_service

app = FastAPI(
    title="VulnPlatform AI Service",
    description="Sprint 5 — priorisation intelligente et recommandations de remédiation SOC",
    version="0.5.0",
)


class HealthResponse(BaseModel):
    service: str
    status: str


class AnalyzeRequest(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)


@app.get("/health", response_model=HealthResponse)
@app.get("/api/ai/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(service="ai-service", status="UP")


@app.get("/")
def root():
    return {
        "message": "AI Service ready — Sprint 5",
        "endpoints": [
            "/api/ai/health",
            "/api/ai/insights",
            "/api/ai/prioritize",
            "/api/ai/recommend/{vulnerabilityId}",
        ],
    }


@app.get("/api/ai/insights")
def insights():
    try:
        return ai_service.build_insights()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Impossible de calculer les insights: {exc}") from exc


@app.get("/api/ai/prioritize")
def prioritize(limit: int = Query(default=20, ge=1, le=100)):
    try:
        return ai_service.prioritize(limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Échec de priorisation: {exc}") from exc


@app.post("/api/ai/prioritize")
def prioritize_post(body: AnalyzeRequest):
    return prioritize(limit=body.limit)


@app.get("/api/ai/recommend/{vulnerability_id}")
def recommend(vulnerability_id: str):
    try:
        result = ai_service.recommend(vulnerability_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Échec de recommandation: {exc}") from exc
    if not result:
        raise HTTPException(status_code=404, detail="Vulnérabilité introuvable")
    return result
