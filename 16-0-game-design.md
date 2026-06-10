# 16-0 — Game Design Doc

*Can your all-time IPL XI go through a whole tournament unbeaten?*

> A cricket adaptation of the viral basketball game [82-0.com](https://www.82-0.com). This document defines the game's rules, scoring, simulation, modes, and growth loop. A companion **build plan** covers stack, data, and roadmap.

---

## 1. The hook

**16-0 is the perfect IPL run.** A team that wins all 14 league games, then Qualifier 1, then the Final, finishes 16-0. It is statistically almost impossible — which is exactly why it makes a great target. The player's job: draft an all-time IPL XI good enough, and *balanced* enough, to run the table.

The one-line pitch: **"Draft an all-time IPL XI and see if it can go 16-0. Build your team, beat the engine, share your record."**

Why it can go viral with Indian cricket fans:

- **Knowledge flex.** Fans love proving they know the deep cuts, not just the superstars.
- **Tribalism.** CSK vs MI vs RCB loyalty is built-in fuel for leaderboards and share wars.
- **Near-impossible goal.** "Almost nobody goes 16-0" is the same engine that made Wordle and 82-0 spread — a hard, shared, daily challenge.
- **WhatsApp-native sharing.** The output is a single image card people forward to group chats.

---

## 2. How 82-0 works (the model we're adapting)

For reference, the original loop:

1. A **slot machine** assigns a team + decade each round.
2. You pick the **best player** from that team/era.
3. You draft **5 legends, one per decade** (1960s–2020s).
4. Five stat categories (PTS, REB, AST, STL, BLK) aggregate into a **Strength Rating**.
5. A **non-linear win curve** simulates an 82-game season — each extra win gets harder.
6. You try to go **82-0** and **share** the result.
7. Two modes: **Classic** (stats shown) and **HoopIQ** (stats hidden — draft from memory).

The genius is in three places: the *constraint* (one per decade forces breadth), the *non-linearity* (a perfect season needs strength across **all** categories, not one monster stat), and the *share card*.

---

## 3. What's different about cricket — and why it's better

| Dimension | 82-0 (basketball) | 16-0 (cricket) |
|---|---|---|
| Time span | 7 decades | ~18 seasons (2008–now) — no "decades" |
| Squad size | 5 players | **11 players** |
| Roles | Interchangeable | Openers, anchor, finisher, keeper, spin, pace, all-rounders |
| Stat sides | One (offense) | **Two** — batting *and* bowling must both work |
| Hard rules | None | **Max 4 overseas**, must field a keeper, must cover 20 overs |
| Distribution | X / Twitter | **WhatsApp** + franchise tribalism |

Cricket gives us **richer, more authentic constraints** than basketball. The max-4-overseas rule and the need to bowl 20 overs are things fans already argue about — so the puzzle feels real, not arbitrary.

---

## 4. The constraint system (the heart of the puzzle)

The unit of the game is the **player-season**, not the player. Every card is a specific player **in a specific year, for the franchise they played that year** — *Virat Kohli, RCB, 2016* is a different card from *Virat Kohli, RCB, 2024* — showing that season's real stats and carrying a hidden rating. A player's **peak season rates higher** than his off years, so the skill is knowing each player's best year.

The pool spans **all 18+ IPL seasons (2008 onward), every franchise** including defunct ones (Deccan, Kochi, Pune Warriors, Gujarat Lions, Rising Pune). For each role in each year there is **one representative per franchise** — so a slot offers ~8–10 team-diverse options.

### 4a. Realistic XI rules (hard constraints — must be satisfied to simulate)

- **11 players.**
- **Max 4 overseas players** in the XI (real IPL rule).
- **Max 2 players from any one franchise** (renames count as one club: Delhi DD=DC, Punjab KXIP=PBKS, Bangalore RCB). No all-CSK XIs.
- **Exactly 1 wicketkeeper.**
- **At least 5 bowling options** covering **20 overs** (the XI shape guarantees this: 2 all-rounders + 1 spinner + 2 pacers).
- **A captain** is nominated (small leadership/clutch bonus — see scoring).
- **Duplicate players allowed** across different seasons — both 2016 and 2024 Kohli is fine (just not the exact same card twice).

### 4b. The year slot machine (our "decades" replacement)

There are no era buckets. Each of the 11 rounds the machine locks a **(role + season year)**, e.g. *"Fast bowler — 2020,"* and **every position is dealt a different year** (11 distinct seasons). You pick from that role's ~8–10 franchise representatives for that year. Because the assigned year is rarely a given player's peak, you can't simply draft everyone's best season — that's what stops a single "solved" XI from being copied forever, and it leans hard into the franchise angle.

- A context-aware safeguard never assigns a slot that can't be filled within the overseas + franchise budget.
- **Skips:** 2 season re-rolls per game in Free Play. The Daily Challenge is fixed for everyone.

> Roles, franchise, and stats are computed from open ball-by-ball data (see the data pipeline). Bowling **style (spin vs pace) is inferred heuristically** from which overs a bowler operates in, since the data has no style field — so expect occasional misclassifications, correctable via a name list.

---

## 5. The stat model

Each card carries that **single season's** real numbers. The card **shows the stats** (auto by role — batters show a batting line, bowlers a bowling line, all-rounders both); the derived **rating/score is always hidden**. Two profiles:

**Batting profile**
- Runs (volume)
- Strike Rate (tempo)
- Average / not-out reliability (anchoring)
- Boundary % (explosiveness)

**Bowling profile**
- Wickets (volume)
- Economy (containment)
- Bowling Strike Rate (penetration)
- Death-overs economy (clutch — for finishers/death bowlers)

**Fielding/keeping** (smaller weight)
- Catches / stumpings / run-outs

Each card gets a hidden **Batting Power (0–100)** and **Bowling Power (0–100)**. Pure batters have ~0 bowling power; pure bowlers ~0 batting; all-rounders contribute to both. These numbers are never shown — the player infers quality from the visible stats.

---

## 6. Era adjustment (why a 2013 great still matters)

A strike rate of 135 in 2013 was strong; in 2024 it's ordinary. When computing the **hidden** rating, every stat is normalized **against its own era's benchmark**:

```
adjusted_value = raw_value / era_benchmark_for_that_stat
```

Era buckets exist **only** for this fair normalization behind the scenes — players never see them. A season that was 1.4× its era's average strike rate scores the same "explosiveness" whether it was 2013 or 2024. This is what makes a 2013 peak draftable against a 2024 one, and rewards real cricket knowledge over recency bias.

---

## 7. The simulation — going for 16-0

The team's two aggregate powers feed a **non-linear win projection** over 16 games.

### 7a. Team strength

```
TeamBatting  = era-adjusted sum of top-7 batting contributions
TeamBowling  = era-adjusted sum of bowling contributions across 20 overs
Balance      = 1 - |normalized(TeamBatting) - normalized(TeamBowling)|   // 0..1
CaptainBonus = small multiplier if captain had elite leadership/clutch
```

### 7b. The win curve (non-linear, balance-gated)

```
RawStrength = (TeamBatting * TeamBowling)^0.5        // geometric mean punishes one-sided XIs
Strength    = RawStrength * (0.6 + 0.4 * Balance) * CaptainBonus
Wins        = 16 * sigmoid( k * (Strength - threshold) )
```

Key properties (same spirit as 82-0):

- **Geometric mean** means a batting monster with no bowling can't win — you must cover both sides. This is cricket's version of "a deficiency in one category prevents a perfect season."
- **Balance gate** further penalizes lopsided teams.
- **Diminishing returns:** the sigmoid makes the last few wins exponentially harder. Getting from 13-3 to 16-0 should feel brutal.
- **16-0 is rare by design** — `k` and `threshold` are tuned so only a strong, well-balanced XI (the right peak seasons in both departments) crosses the line. Most good teams land 11-5 to 14-2.

### 7c. Output

A simulated record (e.g. **"14-2 — Knocked out in the Final"**), a short auto-generated "season story" (biggest win, the loss that ended the run), and a shareable card.

---

## 8. Game modes

- **Classic / Free Play** — each card's season stats are visible; make informed picks from the numbers. (The derived score is always hidden.)
- **Cricket IQ** (memory mode) — even the stats are hidden, leaving only name + nationality + team; draft purely from cricket knowledge. (Our HoopIQ.) The connoisseur's flex mode. *(Implemented.)*
- **Daily Challenge** — everyone gets the **same** year-slot sequence for the day, **one play per day** (locked locally). On finishing you see your **rank** for the day. *(Implemented: one-play lock + a client-side percentile rank vs all valid line-ups for the deal. A real cross-player leaderboard — score+rank — is the planned backend upgrade.)* This is the Wordle-style retention engine.
- **Franchise Mode** (later) — restrict the pool to one franchise's all-time players; "best-ever CSK XI" drives tribal sharing.
- **Blitz** (later) — 5-pick quickfire version for first-time users / low commitment.

---

## 9. The viral loop

1. **Play** (2–4 min) → get a record.
2. **Share card** auto-generated: your XI, your record, a one-line verdict ("So close — 15-1, lost the Final"). Optimized as a 1200×630 image for WhatsApp/Instagram/X.
3. **Challenge link** — "Beat my 14-2" deep-links a friend into the *same* daily seed.
4. **Leaderboard** — daily + all-time, filterable by favorite franchise.
5. **Streaks** — play the daily N days in a row.

Distribution priorities for India: **WhatsApp share first**, then Instagram Stories, then X. Franchise hashtags during IPL season.

---

## 10. Monetization (real-product path)

- **Sponsorship / brand integration** — the cleanest. 82-0 runs a sponsor banner; a cricket equivalent can partner with sports brands, fan platforms, or OTT.
- **Cosmetic premium** — custom share-card themes, franchise skins, "captain badges."
- **Affiliate** — links to merchandise or streaming, contextual to teams/players.
- **Seasonal events** — sponsored daily challenges during live IPL.

**Avoid:** anything resembling real-money fantasy or betting. India's real-money gaming space is heavily regulated and contested (see Section 11). 16-0 should stay firmly in **"bragging rights"** territory — no entry fees, no cash prizes, no wagering.

---

## 11. Legal & data notes (important)

- **Trademarks.** "IPL," team names, and logos are protected. Like 82-0's "not affiliated with the NBA" disclaimer, 16-0 must run a clear **"not affiliated with or endorsed by the BCCI/IPL"** notice, and should avoid official logos. Use original branding and either generic team references or licensed/again-disclaimed name use. Get legal review before launch.
- **Player name/likeness.** Using names and historical stats for commentary/games is generally lower-risk than using photos. Avoid official photography; consider illustrated/abstract avatars.
- **Real-money gaming.** Keep the game free and prize-free to stay clear of state-level online-gaming and gambling regulations. Do not add anything that could be construed as betting.
- **Data rights.** Match statistics are facts (not copyrightable as such), but *databases* and *official feeds* can carry licensing terms. Prefer open ball-by-ball data (Cricsheet) and compute your own aggregates — details in the build plan.

---

## 12. Success metrics

- **Activation:** % of visitors who complete a draft + simulation.
- **Share rate:** shares per completed game (the viral coefficient driver).
- **D1/D7 retention** on the Daily Challenge.
- **K-factor:** invites/challenges sent × conversion.
- Target north star: **daily active players during IPL season**.

---

## 13. Open questions to resolve before build

1. Player pool size for v1 — how many of the ~600 IPL players to include? (Recommend a curated **~150 most-relevant** for MVP, expand later.)
2. Exact era-benchmark values — derive from real data (build plan).
3. Tuning the win curve `k`/`threshold` so 16-0 is rare but believable.
4. Branding/name: "16-0" is strong; confirm domain + trademark clearance.
5. How "daily seed" is generated so it's fair and unguessable.

---

*Companion docs: `16-0-build-plan.md` (stack, data, roadmap) and `16-0-prototype.html` (playable proof of concept).*
