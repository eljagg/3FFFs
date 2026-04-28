# 3fffs — Fight Fraud Framework Training

Interactive training platform for financial institutions, built on the [MITRE Fight Fraud Framework™ (F3)](https://ctid.mitre.org/fraud#/) released April 9, 2026.

## What it does

Four training modes, role-adaptive for tellers, analysts, SOC teams, and executives:

1. **Scenario simulations** — stage-by-stage walkthroughs of real fraud cases (BEC, synthetic identity bust-out, SIM swap ATO)
2. **F3 encyclopedia** — searchable reference for all 7 tactics and 22 techniques
3. **Knowledge quizzes** — short adaptive questions calibrated to your role
4. **AI tutor** — Claude-powered chat grounded in the live F3 knowledge graph

Progress is tracked per user (completed scenarios, quiz accuracy) and stored in Neo4j.

## Stack

- **Frontend:** React + Vite + React Router, PWA-enabled
- **Backend:** Node.js + Express
- **Database:** Neo4j Aura (graph database)
- **AI:** Anthropic Claude (optional — tutor degrades gracefully without a key)

## Architecture

```
3fffs/
├── package.json           Root — runs both services with `npm run dev`
├── client/                React + Vite frontend
│   └── src/
│       ├── main.jsx
│       ├── App.jsx        Router
│       ├── components/
│       ├── pages/
│       └── lib/
│           ├── api.js     API client
│           └── user.jsx   User/role context
└── server/                Express API
    └── src/
        ├── index.js       Entry
        ├── lib/neo4j.js   Driver
        ├── seed/          Framework + scenario data
        │   ├── framework.js
        │   ├── scenarios.js
        │   ├── quizzes.js
        │   └── run.js     `npm run seed`
        └── routes/
            ├── framework.js
            ├── scenarios.js
            ├── quiz.js
            ├── progress.js
            └── tutor.js
```

## Quick start

### 1. Prerequisites
- Node.js 20+
- A Neo4j Aura instance ([aura.neo4j.io](https://console.neo4j.io))
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com)) — optional, only for the AI tutor

### 2. Install

```bash
git clone https://github.com/eljagg/3fffs.git
cd 3fffs
npm run install:all
```

### 3. Configure

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
ANTHROPIC_API_KEY=sk-ant-...
NEO4J_URI=neo4j+s://YOUR_INSTANCE_ID.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_aura_password
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:3001
```

### 4. Seed the graph (one time)

```bash
npm run seed
```

This loads 7 F3 tactics, 22 techniques, 3 scenarios, and 8 quiz questions into your Neo4j Aura instance.

### 5. Start both servers

```bash
npm run dev
```

Opens:
- API at http://localhost:3001
- Web at http://localhost:5173

## Neo4j graph model

```
(:Tactic)        -[:PART_OF]←        (:Technique)
(:Scenario)      -[:HAS_STAGE]→      (:Stage)
(:Stage)         -[:USES_TECHNIQUE]→ (:Technique)
(:Quiz)          -[:TESTS]→          (:Tactic)
(:User)          -[:COMPLETED]→      (:Scenario)
(:User)          -[:ANSWERED]→       (:Quiz)
```

This makes queries like "show me every scenario that covers the Monetization tactic" or "which tactics is this user weakest on" natural single-query operations.

## Deploying to Railway

### Backend service
1. Railway → New Service → GitHub Repo → 3fffs
2. **Root directory**: `server`
3. Environment variables:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your key (or omit to disable tutor) |
| `NEO4J_URI` | `neo4j+s://YOUR_ID.databases.neo4j.io` |
| `NEO4J_USER` | `neo4j` |
| `NEO4J_PASSWORD` | Your Aura password |
| `PORT` | Railway sets this automatically |

4. **Build command**: `npm install`
5. **Start command**: `npm run start`
6. Run the seed once via Railway shell: `npm run seed`

### Frontend service
1. New Service → same repo
2. **Root directory**: `client`
3. Environment: `VITE_API_URL=https://YOUR-BACKEND.up.railway.app`
4. **Build**: `npm install && npm run build`
5. **Start**: `npx serve dist -l $PORT`

## License

MIT
