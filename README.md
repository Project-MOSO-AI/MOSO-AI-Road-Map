# MOSO AI Roadmap

A visual project control center for tracking the MOSO AI technology roadmap, built with React, Vite, and TypeScript.

## Quick Start (Local)

```bash
git clone https://github.com/Project-MOSO-AI/MOSO-AI-Road-Map.git
cd MOSO-AI-Road-Map
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build for Production

```bash
npm run build
npm run preview    # serves the built output on localhost:4173
```

## Host Online (Cloudflare Tunnel)

Your laptop becomes the server. When it's on and online, the site is live. When it's off, the site goes down.

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed

### Manual Start

Double-click `start-moso.bat`. It builds the site, starts a local server, and opens a Cloudflare tunnel. Your public URL will appear in the console window (e.g. `https://xxxxx.trycloudflare.com`).

### Auto-Start on Boot

Run this once in PowerShell (as Administrator):

```powershell
$action = New-ScheduledTaskAction -Execute "C:\Users\hshar\Documents\MOSO AI Roadmap\start-moso.bat"
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "MOSO Tunnel" -Action $action -Trigger $trigger -Settings $settings -Description "Start MOSO AI Roadmap tunnel on login"
```

After reboot, the tunnel starts automatically. The URL appears in the console window.

### How It Works

1. `start-moso.bat` runs `npm run build`, serves the `dist/` folder, and launches `cloudflared`
2. `cloudflared` creates a free tunnel to `*.trycloudflare.com`
3. The Scheduled Task runs the script at login
4. When your laptop goes offline, the tunnel dies. When it reconnects, reboot or re-run the script.

> **Note:** Free tunnels give a new URL on each restart. For a fixed URL, buy a domain (~$10/yr) and set up a named Cloudflare tunnel.

## Tech Stack

- React 18 + TypeScript
- Vite
- Zustand (state)
- Recharts (charts)
- Lucide (icons)
