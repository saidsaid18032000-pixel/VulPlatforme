@echo off
chcp 65001 >nul
echo ========================================
echo  Activation des prerequis Docker
echo  (accepter le prompt UAC Administrateur)
echo ========================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0enable-docker-prereqs.ps1"
pause
