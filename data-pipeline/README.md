# 16-0 data pipeline

Turns open Indian T20 ball-by-ball data into the game's player dataset: **one representative per franchise, per role, per season** (so each role+year offers ~8–10 team-diverse options).

## Files
- `build_players.py` — the ETL. Stdlib only. Cricsheet → `../web/players.js` + `players.report.txt`.
- `overseas.csv` — list of overseas players (nationality isn't in ball-by-ball data; unlisted = Indian).
- `bowler_types.csv` — *optional* `name,style` (spin|pace) overrides to correct the heuristic.
- `make_sample.py` — synthetic Cricsheet-format matches to test offline.

## Run
```bash
# place the open ball-by-ball data in this folder (network is open on your machine):
curl -L -o t20.zip https://cricsheet.org/downloads/ipl_json.zip
python3 build_players.py --src t20.zip --overseas overseas.csv --out ../web/players.js
```

## How roles are inferred (from the data)
- **KEEPER** — credited with stumpings that season.
- **ALLROUNDER** — qualifies as both batter (≥150 balls faced) and bowler (≥120 balls bowled).
- **OPENER / BAT / FINISHER** — from average batting position (≤2.5 open, ≥5.5 finish, else middle).
- **SPIN / PACE** — *heuristic*: bowlers who bowl mostly in the middle overs (7–15) are treated as spin, powerplay/death bowlers as pace. Ball-by-ball data has **no bowling-style field**, so this is best-effort and will misclassify some bowlers. Override any name in `bowler_types.csv`.

For each `(team, year, role)` the **best** qualifying player (by era-adjusted rating) becomes that franchise's representative — giving the game ~one option per team per role per season.

## Hidden ratings (never shown)
- **Batting** = era-adjusted blend of strike rate, run volume, boundary rate, average → 0–100.
- **Bowling** = era-adjusted blend of economy, wickets, strike rate, death economy → 0–100.
- Era buckets are internal-only (fair normalization across seasons); a player's peak season rates highest.

## Output
`players.report.txt` shows options per (role, year) and flags thin cells (<6). Aim for ~8 per cell; thin cells just mean fewer franchises fielded a clear player of that role that year. Spot-check a sample of stats against ESPNcricinfo Statsguru before shipping.

Run on BBL/PSL/Hundred data and it works the same — the pipeline is league-agnostic.
