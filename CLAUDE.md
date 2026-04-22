# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

AI Bootcamp (AI공장장 2기) learning repository. Projects are organized by week and follow two patterns:

1. **Single-file HTML apps** — no build step; open directly in a browser
2. **Node.js/Express servers** — `server.js` + `index.html` + optional `client.js`; run with npm

## Running Projects

### Single-file HTML apps (week-2, week-3 static)
Open `index.html` directly in a browser — no server needed. These use CDN-loaded React 18, Tailwind CSS, and Babel standalone for JSX transpilation.

### Node.js Express servers (week-3: hello-server, mental-chat, my-midjourney, AInickname, my-pokemon-docs)
```bash
cd week-3/<project-name>
npm install        # first time only
npm start          # starts server (default: http://localhost:3000 or 4000)
```

Servers that use the OpenAI API require a `.env` file in the project directory:
```
OPENAI_API_KEY=sk-...
```

## Architecture Patterns

### Single-file React apps (`index.html`)
- React 18 + Tailwind CSS + Babel loaded from CDN — no bundler
- JSX written inside `<script type="text/babel">` tags
- Component hierarchy: data-fetch functions → design-system components → page components → `<App>` root
- `ReactDOM.createRoot(document.getElementById('root')).render(<App />)` at the bottom

### Express server projects
Standard 3-file structure:
- `server.js` — Express app; serves static files from `__dirname`; mounts `/api/*` routes; exports `app` for serverless compatibility (`if (require.main === module) app.listen(...)`)
- `index.html` — frontend UI fetching from `/api/*`
- `.env` — API keys (not committed)

API response convention used across all servers:
```json
{ "success": true, "data": ... }
{ "success": false, "message": "..." }
```

### External API integrations
- **NASA APOD** (`week-3/NASApic`): public key hardcoded in HTML; `https://api.nasa.gov/planetary/apod`
- **OpenAI** (`week-3/mental-chat`, `week-3/AInickname`): key in `.env`, called server-side via `openai` npm package with `gpt-4o-mini`
- **Fal.ai image gen** (`week-3/my-midjourney`): key in `.env`, Korean prompts translated to English via MyMemory free API before sending
- **PokéAPI** (`week-3/pokemon`): free public API, called directly from browser

## Weekly Structure
- `week-1/` — markdown recipes and diary entries (no code)
- `week-2/` — standalone HTML mini-apps (age calculator, D-day counter, color palette, Dutch pay, tax calculator, meme generator, QR code generator, PDF generator)
- `week-3/` — API-integrated apps; some with Express backends
