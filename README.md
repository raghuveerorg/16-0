# 16-0 — Can your all-time Indian T20 XI go unbeaten?

Draft an all-time Indian T20 XI and see if it can run the table **16-0** (14 league games + Qualifier 1 + Final). A cricket take on the viral basketball game [82-0.com](https://www.82-0.com).

> **Unofficial fan project.** Not affiliated with, endorsed by, or sponsored by the BCCI, any T20 league, or any cricket franchise. League/team names and player names are the property of their respective owners and are used for identification and descriptive purposes only; statistics are derived from publicly available ball-by-ball data.

This repo is a **working product**, not a mockup: a static web app (no build step) plus a Python data pipeline that generates verified player ratings from open ball-by-ball data.

---

## Quick start (play it now)

The app is plain HTML/CSS/JS and ships with the **real dataset already built** — 1,094 player-seasons across all 19 seasons (2008–2026), computed from open Cricsheet ball-by-ball data. Runs with zero setup:

```bash
# Option A — just open it
open web/index.html            # macOS (or double-click the file)

# Option B — serve it (recommended; mirrors production)
cd web && python3 -m http.server 8000
# then visit http://localhost:8000
```

Pick **Free Play** or the **Daily Challenge**, draft 11 players, name a captain, and simulate.

---

## Project structure

```
16-0/
├── web/                     ← the app (deploy this folder as-is)
│   ├── index.html
│   ├── styles.css
│   ├── engine.js            ← player-season model, year slot machine, win simulation (shared, framework-free)
│   ├── app.js               ← UI / game flow (cards show stats by role; score hidden)
│   └── players.js           ← player-season dataset (generated from Cricsheet; 1,094 seasons)
├── data-pipeline/           ← turns open data into verified ratings
│   ├── build_players.py      ← Cricsheet ETL → web/players.js  (stdlib only)
│   ├── make_sample.py        ← synthetic Cricsheet data to test the pipeline offline
│   ├── metadata.csv          ← curated role + overseas per player (you maintain this)
│   └── README.md
├── tests/
│   └── engine.test.js        ← node tests for the engine (no deps)
├── 16-0-game-design.md       ← full game design
├── 16-0-build-plan.md        ← stack, data sourcing, roadmap
└── 16-0-prototype.html       ← original single-file proof of concept
```

---

## Generate verified player ratings (the real data)

The seed `web/players.js` uses **illustrative** ratings so the app runs out of the box. To replace it with real, computed numbers:

```bash
cd data-pipeline

# 1. Get open ball-by-ball Indian T20 data (network must be open on your machine)
curl -L -o t20.zip https://cricsheet.org/downloads/ipl_json.zip

# 2. Build the dataset (writes ../web/players.js + players.report.txt)
python3 build_players.py --src t20.zip --overseas overseas.csv --out ../web/players.js
```

What it does: parses every Indian T20 match across all seasons, infers each player's role from the data (keeper from stumpings, all-rounder from batting+bowling, batting order, spin/pace from over-phase), and emits **one representative per franchise, per role, per season** — so each role+year offers ~8–10 team-diverse options. Each card shows that season's real stat line; the 0–100 rating is hidden (peak years rate highest). Nationality (overseas) comes from `overseas.csv`; optional spin/pace corrections from `bowler_types.csv`. See `data-pipeline/README.md`.

`players.report.txt` lists players found in the data but missing from `metadata.csv` (with suggested roles) — add the ones you want, then re-run. **Spot-check a sample against ESPNcricinfo Statsguru before shipping.**

Test the pipeline without downloading anything:

```bash
python3 make_sample.py
python3 build_players.py --src sample --meta /tmp/none.csv --out /tmp/out.js   # exercises the full path
```

---

## Run the tests

```bash
node tests/engine.test.js
```

Covers constraint enforcement (max-4-overseas, roles, keeper, 20-over coverage), win-curve calibration (16-0 reachable only by near-optimal balanced era-spread XIs; one-sided and single-era teams punished), Daily-seed determinism, and pool sufficiency.

---

## Deploy (static, no build)

The whole game is the `web/` folder. Repo includes `netlify.toml` and `vercel.json` so hosts serve it automatically.

- **Fastest (no account linking):** go to **app.netlify.com/drop** and drag the `web/` folder in — live in ~10 seconds with a shareable URL. Ideal for beta testing.
- **Netlify (from repo):** New site → pick the repo → `netlify.toml` sets publish dir to `web`.
- **Vercel (from repo):** Import the repo → `vercel.json` sets the output dir to `web` (or set Root Directory = `web`).
- **GitHub Pages / Cloudflare Pages:** serve the `web/` directory.

No server is required for v1. Share cards render client-side to PNG; the Daily lock + rank are client-side. The real cross-player leaderboard is the planned backend (Supabase + two API calls — see `16-0-build-plan.md`).

---

## Notes

- Ratings are computed by you from open data, so the output is your own — not a redistributed third-party feed. Still, verify before launch.
- **16-0 is an independent, unofficial fan project — not affiliated with, endorsed by, or sponsored by the BCCI, any T20 league, or any cricket franchise.** League/team/player names are used for identification only and remain the property of their respective owners. The app uses **no official logos, crests, colour schemes, or photography** (keep it that way). Get IP legal review before any monetized/public launch, and keep the game free and prize-free to stay clear of India's real-money gaming regulations.
