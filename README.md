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

## Host with Docker

Build the image:

```bash
docker build -t moso-roadmap .
```

Run it:

```bash
docker run -d -p 8080:80 moso-roadmap
```

Open http://localhost:8080.

## Host on Your Laptop (Network)

To let others on your network access it:

```bash
npm run dev -- --host 0.0.0.0
```

Or with Docker:

```bash
docker run -d -p 8080:80 --network host moso-roadmap
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Zustand (state)
- Recharts (charts)
- Lucide (icons)
