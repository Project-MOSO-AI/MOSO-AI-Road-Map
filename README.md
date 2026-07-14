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

## Host Online (Tailscale Funnel)

Your laptop becomes the server. When it's on and online, the site is live. When it's off, the site goes down. Same URL every time.

**Live URL:** https://oxk.tail8d4074.ts.net

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [Tailscale](https://tailscale.com/download/windows) installed and signed in
- Funnel enabled on your Tailscale account (one-time: visit the link shown in `tailscale funnel` output)

### Manual Start

Double-click `start-moso.bat`. It builds the site, starts a local server, and enables the Tailscale Funnel.

### Auto-Start on Boot

A Windows Scheduled Task (`MOSO Tunnel`) is already configured to run `start-moso.bat` at login. The site auto-starts when you log into Windows.

To re-register the task (run once in PowerShell as Administrator):

```powershell
$scheduledTask = "MOSO Tunnel"
Unregister-ScheduledTask -TaskName $scheduledTask -Confirm:$false -ErrorAction SilentlyContinue
$action = New-ScheduledTaskAction -Execute "C:\Users\hshar\Documents\MOSO AI Roadmap\start-moso.bat"
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $scheduledTask -Action $action -Trigger $trigger -Settings $settings -Description "Start MOSO AI Roadmap tunnel on login"
```

### How It Works

1. `start-moso.bat` runs `npm install`, `vite build`, starts the preview server on port 3000
2. `tailscale funnel --bg --yes 3000` exposes port 3000 to the internet via Tailscale
3. The Scheduled Task runs the script automatically at login
4. When your laptop goes offline, the site goes down. When it's back online, the same URL works again.

## Tech Stack

- React 18 + TypeScript
- Vite
- Zustand (state)
- Recharts (charts)
- Lucide (icons)
