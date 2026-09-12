# Initialise / vérifie PostgreSQL pour VulnPlatform (Sprint 0)
# Usage: .\scripts\init-db.ps1

param(
  [string]$PgHost = "localhost",
  [int]$Port = 5432,
  [string]$User = "vuln",
  [string]$Password = "vuln_secret_change_me",
  [string]$Database = "vulnplatform"
)

$ErrorActionPreference = "Stop"
$schema = Join-Path $PSScriptRoot "..\infra\postgres\init\01_schema.sql" | Resolve-Path

$env:PGPASSWORD = $Password
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  $candidates = @(
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { $psql = $c; break }
  }
}
if (-not $psql) {
  Write-Error "psql introuvable. Installe PostgreSQL 16 ou démarre Docker (docker compose up -d postgres)."
}

Write-Host "Application du schéma: $schema"
& $psql -h $PgHost -p $Port -U $User -d $Database -f $schema
Write-Host "OK — tables disponibles."
& $psql -h $PgHost -p $Port -U $User -d $Database -c "\dt"
