<p align="center">
  <img src="https://avatars.githubusercontent.com/u/304306045?s=400&v=4" alt="MOSO AI" width="120" style="border-radius: 24px;" />
</p>

<h1 align="center">MOSO AI Roadmap</h1>

<p align="center">
  Visual project control center for tracking the MOSO AI technology roadmap.<br/>
  <a href="https://moso-ai-road-map.vercel.app"><strong>View Live →</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zustand-State-black" alt="Zustand" />
  <img src="https://img.shields.io/badge/Supabase-Auth-3FCF8E?logo=supabase" alt="Supabase" />
</p>

---

## Features

- Interactive technology tree with expandable nodes
- GitHub OAuth login with owner/viewer roles
- Real-time state sync via Supabase
- Timer tracking for work sessions
- Task completion workflow
- Role-based access control

## Quick Start

```bash
git clone https://github.com/Project-MOSO-AI/MOSO-AI-Road-Map.git
cd MOSO-AI-Road-Map
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

Create a `.env` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Tech Stack

- **React 18** + **TypeScript** — UI
- **Vite** — build tool
- **Zustand** — state management
- **Supabase** — auth & realtime sync
- **Vercel** — hosting

## Deployment

Auto-deploys from `master` on push. Connected via Vercel.

## License

MIT
