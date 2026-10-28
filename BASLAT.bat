@echo off
title PIXELA
cd /d "%~dp0"
python --version >nul 2>nul
if not errorlevel 1 (
  python sunucu.py
  goto :end
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sunucu.ps1"
:end
pause
