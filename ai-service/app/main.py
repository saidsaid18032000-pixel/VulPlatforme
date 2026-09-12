from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="VulnPlatform AI Service",
    description="Service IA — analyse et recommandations de vulnérabilités (Sprint 0 skeleton)",
    version="0.1.0",
)


class HealthResponse(BaseModel):
    service: str
    status: str


@app.get("/health", response_model=HealthResponse)
@app.get("/api/ai/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(service="ai-service", status="UP")


@app.get("/")
def root():
    return {"message": "AI Service ready — Sprint 0"}
