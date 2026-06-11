# 16-0 — Tech & MVP Build Plan

Companion to `16-0-game-design.md`. This covers the stack, data sourcing, architecture, and a phased roadmap to a real, season-over-season product.

---

## 1. Guiding principles

- **Ship the loop first.** The whole game is *draft → simulate → share*. Get that delightful before adding modes.
- **Static-first, cheap to run.** It's a client-heavy game with a small data layer. You don't need a big backend on day one.
- **Data is the moat.** Anyone can clone the UI; a clean, era-adjusted, verified Indian T20 stats database is the hard part. Invest there.
- **Mobile-first, WhatsApp-native.** Most plays and shares will happen on a phone.

---

## 2. Recommended stack

| Layer | Recommendation | Why |
|---|---|---|
| Framework | **Next.js (React)** | 82-0 is built on it (v0.app); great for fast static pages + a few API routes; superb share-card support. |
| Styling | **Tailwind CSS** | Speed; consistent mobile-first design. |
| Hosting | **Vercel** | Zero-config Next.js, global CDN, generous free tier. |
| Data store (MVP) | **Static JSON** bundled with the app | Player dataset is small (~150 players); no DB needed to start. |
| Data store (scale) | **Postgres** (Supabase/Neon) | When you add leaderboards, accounts, daily-seed records. |
| Share cards | **Vercel OG / Satori** (`@vercel/og`) | Generates the 1200×630 share image on the fly per result. |
| Leaderboards / daily | **Supabase** (Postgres + auth + edge) | Fast to stand up; handles daily-seed scores and streaks. |
| Analytics | **PostHog** or Plemetheus-lite | Track activation, share rate, K-factor. |

You could prototype the whole thing as a **single static HTML file** (as in `16-0-prototype.html`) and only graduate to Next.js when you add server features (OG images, leaderboards).

---

## 3. Data sourcing — the most important section

You need **per-player, per-season Indian T20 stats** (batting + bowling) plus metadata (role, overseas flag, franchise, seasons active).

### Options, best to worst for an indie build

1. **Cricsheet** (`cricsheet.org`) — *recommended foundation.* Free, open, **ball-by-ball** data for all Indian T20 matches as YAML/JSON/CSV. You compute your own aggregates (runs, SR, wickets, economy, death-over economy, boundary %, era benchmarks). Because they're *your* computed facts from open data, this sidesteps feed-licensing concerns. **This is the right base.**
2. **ESPNcricinfo Statsguru** — gold standard for verification/spot-checks. Terms restrict scraping/redistribution, so use it to **validate** your Cricsheet-derived numbers, not as a live feed.
3. **Official Indian T20 / third-party stats APIs** — accurate but licensed and often costly; carries redistribution terms. Consider only at scale, with legal review.

### Recommended data pipeline

```
Cricsheet ball-by-ball (all Indian T20 seasons)
        │  (offline ETL — Python/pandas)
        ▼
Per player × per season aggregates
        │  compute: runs, SR, avg, boundary%, wickets, econ, bowl SR, death econ
        ▼
Era benchmarks (avg per stat, per era bucket)
        │  normalize each stat against its era
        ▼
BattingPower / BowlingPower (0–100), role tags, overseas flag
        ▼
players.json  (bundled with the app; ~150 curated players for MVP)
```

Run this ETL once, version the output, re-run after each new Indian T20 season. **Spot-check a sample against Statsguru** before shipping (a verification step — see roadmap Phase 1).

### Player metadata you must hand-curate or derive

- Role (opener / top-order / finisher / keeper / spin / pace / all-rounder)
- Overseas vs Indian
- Primary franchise(s)
- Which era bucket(s) their peak season falls in

---

## 4. Architecture

### MVP (Phases 1–2): essentially client-side

```
Browser (Next.js static)
 ├─ players.json (bundled)
 ├─ draft + slot-machine logic (client)
 ├─ simulation engine (client, pure function)
 └─ /api/og  → generates share-card image
```

No login, no DB. State lives in the URL + `localStorage` for streaks. Daily seed = hash of the date.

### Scaled (Phase 3+): add a thin backend

```
Browser ──► Next.js API routes / Supabase Edge
                 ├─ daily seed + leaderboard (Postgres)
                 ├─ optional accounts (Supabase Auth)
                 └─ result storage for streaks
CDN serves static game + cached OG images.
```

Keep the **simulation deterministic and client-side** so it's instant; the server only stores results and serves leaderboards. (Anti-cheat: re-validate submitted scores server-side from the seed + XI.)

---

## 5. Roadmap

### Phase 0 — Prototype (done: `16-0-prototype.html`)
Single-file proof of the core loop with representative data. Validates that the draft + constraints + simulation *feel* right.

### Phase 1 — Real data + MVP web app (2–4 weeks)
- Build the Cricsheet ETL; produce verified `players.json` (~150 players).
- **Verification:** spot-check 20–30 players' aggregates against Statsguru.
- Port the prototype loop into Next.js + Tailwind.
- Tune the win curve so 16-0 is rare but achievable.
- Classic mode + share card (`@vercel/og`).
- Ship to Vercel on the real domain. Disclaimer + privacy page.

### Phase 2 — Retention & virality (2–3 weeks)
- **Daily Challenge** with shared seed.
- Leaderboards (Supabase) + streaks.
- **Galli IQ** (memory) mode.
- "Challenge a friend" deep links.
- Analytics: activation, share rate, K-factor.

### Phase 3 — Depth & growth (ongoing)
- Franchise Mode, Blitz mode.
- Expand pool to full Indian T20 history.
- Accounts, profiles, all-time leaderboard.
- Seasonal/sponsored events during live Indian T20.
- Localization (Hindi + regional languages).

### Per-season maintenance
- Re-run ETL after each Indian T20 season; recompute era benchmarks (new era bucket as needed).
- Re-tune win curve if the meta shifts.
- Add new players; refresh "current season" data.

---

## 6. Effort & cost snapshot

- **Solo dev, Phases 0–2:** realistically ~6–9 weeks of focused work; the ETL/verification is the long pole, not the UI.
- **Running cost at launch:** ~$0–20/mo (Vercel + Supabase free tiers) until traffic is significant.
- **Biggest risks:** data accuracy (mitigated by verification), win-curve tuning (mitigated by playtesting), and legal clearance on naming/branding (get a review before spending on marketing).

---

## 7. Reusability note

The Cricsheet ETL + era-adjusted power-rating engine is reusable infrastructure. If this works for Indian T20, the *same* pipeline powers BBL, PSL, The Hundred, or an all-time international T20 version with only new data and benchmarks. Worth structuring the ETL to be league-agnostic from day one. (This is also a strong candidate for a reusable internal **Skill** if you build more cricket-data tools later.)
