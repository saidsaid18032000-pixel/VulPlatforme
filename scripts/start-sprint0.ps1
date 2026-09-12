$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "=== Sprint 0 — verification Docker ==="
docker version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker engine KO. Active VT-x dans le BIOS, relance Docker Desktop, puis reessaie."
    exit 1
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Fichier .env cree depuis .env.example"
}

Write-Host "Lancement docker compose (build + up)..."
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "docker compose a echoue"
    exit 1
}

Write-Host "Attente des healthchecks (90s)..."
Start-Sleep -Seconds 90

Write-Host "`n=== Conteneurs ==="
docker compose ps

Write-Host "`n=== Tests HTTP ==="
$urls = @(
    "http://localhost:8080/actuator/health",
    "http://localhost:8081/api/auth/health",
    "http://localhost:8082/api/assets/health",
    "http://localhost:8083/api/scans/health",
    "http://localhost:8084/api/vulnerabilities/health",
    "http://localhost:8085/api/alerts/health",
    "http://localhost:8086/api/reports/health",
    "http://localhost:8000/health",
    "http://localhost:4200"
)
foreach ($u in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 10
        Write-Host "OK  $($r.StatusCode) $u"
    } catch {
        Write-Host "FAIL $u — $($_.Exception.Message)"
    }
}

Write-Host "`n=== Tables PostgreSQL ==="
docker exec vuln-postgres psql -U vuln -d vulnplatform -c "\dt"
