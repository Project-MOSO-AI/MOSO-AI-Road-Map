@echo off
title MOSO AI Roadmap - Tunnel
cd /d "%~dp0"

echo [MOSO] Installing dependencies...
call npm install

echo [MOSO] Building site...
call npx vite build

echo [MOSO] Starting local server on port 3000...
start "" /b cmd /c "cd /d "%~dp0" && node_modules\.bin\vite.cmd preview --port 3000 --host 0.0.0.0"

echo [MOSO] Waiting for server...
timeout /t 5 /nobreak >nul

echo [MOSO] Starting Cloudflare Tunnel...
echo.
echo ============================================
echo   Your site will be live at:
echo   (check tunnel-log.txt for the URL)
echo ============================================
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
