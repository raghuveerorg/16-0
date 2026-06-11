# 16-0 — Backend setup (Supabase + Next.js)

This is the **backend-enabled** version of 16-0 (the static app lives in `../web`). It adds:
sign-in (Google / Apple / phone-OTP / email magic link), **server-validated** Daily scores, **daily-rank
history**, and **streaks** — on a scalable Postgres backend.

```
web-next/
├── app/
│   ├── page.js              ← mounts the game; wires Daily result → /api/submit
│   ├── profile/page.js      ← streak + daily-rank history (server-rendered)
│   ├── api/submit/route.js   ← validates + records a score (service role)
│   └── auth/callback/route.js← OAuth / magic-link redirect
├── components/AuthBar.js     ← Google/Apple/phone/email login UI
├── lib/
│   ├── engine.js, players.js ← shared game logic + data (copies of ../web)
│   ├── validate.js           ← re-derives the deal & recomputes the score (anti-cheat)
│   ├── streak.js             ← streak from played days
│   └── supabase/             ← browser + server clients
├── public/game/              ← engine.js, players.js, app.js, styles.css (served to the browser)
└── supabase/migrations/0001_init.sql
```

Why this scales: scores/ranks/streaks are relational, time-series queries — **Postgres** does them natively
(window functions for rank, gaps-and-islands for streaks), indexed on `(day, wins)` and `(user_id, day)`.
Supabase gives Postgres + Auth + Row-Level Security; add **connection pooling (Supavisor)** + read replicas as you grow.

---

## 1. Create the Supabase project
1. supabase.com → **New project** (pick a region near your users, e.g. Mumbai/Singapore).
2. **SQL Editor → New query** → paste all of `supabase/migrations/0001_init.sql` → **Run**.
3. **Settings → API** → copy the **Project URL**, the **anon public** key, and the **service_role** key.

## 2. Environment variables
Create `web-next/.env.local` (from `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server-only — never commit, never expose to the browser
```

## 3. Auth redirect URLs (Supabase → Authentication → URL Configuration)
- **Site URL:** `http://localhost:3000` for dev (swap to your prod domain later).
- **Redirect URLs (allow-list):** add `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback`.

## 4. Enable the login methods (Authentication → Providers)
- **Email** — on by default (magic link). For production email deliverability, set **Project → Auth → SMTP** to your own provider (SendGrid/Resend/Postmark); the built-in sender is dev-only/rate-limited.
- **Phone (OTP)** — toggle **Phone** on, then connect an SMS provider (**Twilio**, MessageBird, Vonage, or Textlocal/MSG91 for India) with their API credentials. SMS costs money per message — set a rate limit.
- **Google** — in Google Cloud Console: create an **OAuth 2.0 Client (Web)**, add authorized redirect URI `https://YOUR-PROJECT.supabase.co/auth/v1/callback`, then paste the **Client ID/Secret** into Supabase's Google provider.
- **Apple** — in the Apple Developer portal: create a **Services ID** + **Sign in with Apple key**; add the same Supabase callback URL; paste the Service ID, Team ID, Key ID, and key into Supabase's Apple provider. (Only needed if you want Apple login on web; required if you later ship an iOS app.)

You can launch with just **Google + Email** and add Phone/Apple when ready — the UI already shows all four.

## 5. Run locally
```bash
cd web-next
npm install
npm run dev          # http://localhost:3000
npm test             # backend logic tests (validation + streak)
```
Play the **Daily Challenge** signed-in → it records to `daily_results`; open **My streak & history**.

## 6. Deploy (Vercel)
1. Import the repo; set **Root Directory = `web-next`**.
2. Add the three env vars from step 2 (mark `SUPABASE_SERVICE_ROLE_KEY` as **not** exposed to the browser — it's a server var, which it is since it has no `NEXT_PUBLIC_` prefix).
3. Deploy → note the domain, then add `https://YOUR-DOMAIN/auth/callback` to Supabase Redirect URLs and set the Site URL.

## 7. Keeping the data in sync
The shared game files live in `../web` and are mirrored into this app (server `lib/` + browser
`public/game/`). After editing the static game or re-running the pipeline
(`../data-pipeline/build_players.py`), run:
```bash
npm run sync
```
This copies `players.js` / `engine.js` / `app.js` / `styles.css` into both places and regenerates
`lib/gameHtml.js`. Commit the result so deploys are self-contained.

## Security notes
- **Scores can't be forged.** `/api/submit` ignores any client-claimed score: it re-derives the day's deal from the date, checks every pick belongs to the dealt (role, year) slot, and recomputes wins with the engine. Clients can't INSERT to `daily_results` directly (RLS blocks it) — only the service role, via this route, can write.
- **One play per day** is enforced by the DB (`unique(user_id, day)`), not just localStorage.
- Keep the service-role key server-only. Never put it in `NEXT_PUBLIC_*`.
