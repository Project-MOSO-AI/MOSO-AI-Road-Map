@echo off
title MOSO AI Roadmap
cd /d "%~dp0"

echo [MOSO] Installing dependencies...
call npm install

echo [MOSO] Building site...
call npx vite build

echo [MOSO] Starting server on port 3000...
start "" /b cmd /c "cd /d "%~dp0" && node_modules\.bin\vite.cmd preview --port 3000 --host 0.0.0.0"

echo [MOSO] Waiting for server...
timeout /t 5 /nobreak >nul

echo [MOSO] Waiting for Tailscale...
"C:\Program Files\Tailscale\tailscale.exe" status >nul 2>&1
if %errorlevel% neq 0 (
  echo [MOSO] Tailscale not connected, waiting 30s...
  timeout /t 30 /nobreak >nul
)

echo [MOSO] Starting Tailscale Funnel...
"C:\Program Files\Tailscale\tailscale.exe" funnel --bg --yes 3000

echo.
echo ============================================
echo   LIVE: https://oxk.tail8d4074.ts.net
echo ============================================
echo.
