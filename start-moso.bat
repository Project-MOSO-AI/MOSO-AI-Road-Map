@echo off
title MOSO AI Roadmap - Tunnel
cd /d "%~dp0"

echo [MOSO] Building Docker image if needed...
docker build -t moso-roadmap . >nul 2>&1

echo [MOSO] Starting container on port 8080...
docker rm -f moso-roadmap >nul 2>&1
docker run -d -p 8080:80 --name moso-roadmap moso-roadmap >nul 2>&1

echo [MOSO] Waiting for container...
timeout /t 3 /nobreak >nul

echo [MOSO] Starting Cloudflare Tunnel...
echo. > tunnel-url.txt
cloudflared tunnel --url http://localhost:8080 > tunnel-log.txt 2>&1
