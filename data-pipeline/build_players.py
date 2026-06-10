#!/usr/bin/env python3
"""
16-0 data pipeline  —  Cricsheet IPL ball-by-ball  ->  web/players.js
ONE REPRESENTATIVE PER FRANCHISE, PER ROLE, PER SEASON.

For every (team, season) it classifies the squad into the 7 roles and keeps each team's BEST player
in each role that year. So each (role, year) ends up with ~one option per franchise (8–10 per season).
Roles are inferred from the data:
  - KEEPER     : credited with stumpings that season
  - ALLROUNDER : qualifies as both a batter and a bowler
  - OPENER/BAT/FINISHER : from average batting position
  - SPIN/PACE  : HEURISTIC from over-phase — bowlers who bowl mostly in the middle overs (7–15) are
                 treated as spin, powerplay/death bowlers as pace. (No bowling-style field exists in
                 ball-by-ball data, so this is best-effort; override names in bowler_types.csv if wanted.)
Nationality (overseas flag) isn't in the data either → merged from overseas.csv (unlisted = Indian).

Usage:
    python3 build_players.py --src ipl_json.zip --overseas overseas.csv --out ../web/players.js
Stdlib only. Stats are computed by us from open data; spot-check vs Statsguru before shipping.
"""
import argparse, csv, json, os, sys, zipfile, glob, datetime
from collections import defaultdict, Counter

def era_of(y):  # internal only — used to normalize ratings across seasons, never shown
    return 1 if y <= 2012 else 2 if y <= 2017 else 3 if y <= 2022 else 4
ERA_LABEL = {1: "2008-12", 2: "2013-17", 3: "2018-22", 4: "2023-26"}

TEAM_ABBR = {
    "Royal Challengers Bangalore": "RCB", "Royal Challengers Bengaluru": "RCB", "Chennai Super Kings": "CSK",
    "Mumbai Indians": "MI", "Kolkata Knight Riders": "KKR", "Sunrisers Hyderabad": "SRH", "Deccan Chargers": "DEC",
    "Delhi Daredevils": "DD", "Delhi Capitals": "DC", "Kings XI Punjab": "KXIP", "Punjab Kings": "PBKS",
    "Rajasthan Royals": "RR", "Gujarat Lions": "GL", "Gujarat Titans": "GT", "Rising Pune Supergiant": "RPS",
    "Rising Pune Supergiants": "RPS", "Pune Warriors": "PWI", "Pune Warriors India": "PWI",
    "Kochi Tuskers Kerala": "KTK", "Lucknow Super Giants": "LSG",
}
def abbr(name): return TEAM_ABBR.get(name, "".join(w[0] for w in name.split())[:3].upper())

WICKET_TO_BOWLER = {"bowled", "caught", "lbw", "stumped", "caught and bowled", "hit wicket"}
QUAL_BAT_BALLS = 120        # min balls faced to qualify a batting season / show a batting line
ALLROUND_BOWL = 60          # min balls bowled to count as an all-rounder's bowling
FRONTLINE_BOWL = 120        # min balls bowled to be a SPIN/PACE specialist rep

# Names in Cricsheet are abbreviated ("V Kohli", "MS Dhoni"). Match curated lists (overseas/keepers)
# by (surname, first-initial) so "David Warner" matches "DA Warner". Best-effort: a few middle-name
# cases won't match, but keepers are backstopped by stumpings and overseas misses just default Indian.
def keyname(name):
    parts = name.replace(".", " ").split()
    return (parts[-1].lower(), parts[0][0].lower()) if parts else ("", "")

def blank_bat():  return dict(runs=0, balls=0, outs=0, fours=0, sixes=0, pos_sum=0, pos_n=0)
def blank_bowl(): return dict(legal=0, conceded=0, wkts=0, mid_legal=0, death_legal=0, death_conceded=0)

def load_matches(src):
    if zipfile.is_zipfile(src):
        with zipfile.ZipFile(src) as z:
            for n in z.namelist():
                if n.endswith(".json") and "README" not in n:
                    try: yield json.loads(z.read(n))
                    except Exception as e: print(f"  ! skip {n}: {e}", file=sys.stderr)
    else:
        for f in glob.glob(os.path.join(src, "*.json")):
            try:
                with open(f) as fh: yield json.load(fh)
            except Exception as e: print(f"  ! skip {f}: {e}", file=sys.stderr)

def match_year(info): return int(info["dates"][0][:4])  # IPL is played within one calendar year; season labels can be cross-year

def process(src):
    bat = defaultdict(lambda: defaultdict(blank_bat))
    bowl = defaultdict(lambda: defaultdict(blank_bowl))
    team = defaultdict(lambda: defaultdict(Counter))
    stump = defaultdict(Counter)   # stump[name][year]
    n = 0
    for m in load_matches(src):
        info = m.get("info", {})
        if not info or "innings" not in m: continue
        y = match_year(info); n += 1
        for tname, roster in info.get("players", {}).items():
            for who in roster: team[who][y][abbr(tname)] += 1
        for inn in m["innings"]:
            for ov in inn.get("overs", []):
                o = ov.get("over", 0)
                mid, death = 6 <= o <= 14, o >= 15
                # batting order from appearance
                seen = []
                for d in ov.get("deliveries", []):
                    batter, bowler, runs = d["batter"], d["bowler"], d["runs"]
                    br = runs.get("batter", 0); ex = d.get("extras", {})
                    wide = "wides" in ex; nb = "noballs" in ex; legal = not (wide or nb)
                    b = bat[batter][y]; b["runs"] += br
                    if not wide: b["balls"] += 1
                    if br == 4: b["fours"] += 1
                    if br == 6: b["sixes"] += 1
                    bw = bowl[bowler][y]; conc = br + ex.get("wides", 0) + ex.get("noballs", 0)
                    bw["conceded"] += conc
                    if legal:
                        bw["legal"] += 1
                        if mid: bw["mid_legal"] += 1
                        if death: bw["death_legal"] += 1
                    if death: bw["death_conceded"] += conc
                    for w in d.get("wickets", []):
                        po, kind = w.get("player_out"), w.get("kind", "")
                        if po: bat[po][y]["outs"] += 1
                        if kind in WICKET_TO_BOWLER: bw["wkts"] += 1
                        if kind == "stumped":
                            for f in w.get("fielders", []):
                                if f.get("name"): stump[f["name"]][y] += 1
            # batting position (once per innings)
            order = []
            for ov in inn.get("overs", []):
                for d in ov.get("deliveries", []):
                    for who in (d["batter"], d.get("non_striker")):
                        if who and who not in order: order.append(who)
            for i, who in enumerate(order):
                bat[who][y]["pos_sum"] += i + 1; bat[who][y]["pos_n"] += 1
    return bat, bowl, team, stump, n

def season_metrics(b, w):
    bm = wm = None
    if b["balls"] >= QUAL_BAT_BALLS:
        bm = dict(runs=b["runs"], sr=100*b["runs"]/b["balls"], avg=b["runs"]/b["outs"] if b["outs"] else float(b["runs"]),
                  bdry=(b["fours"]+b["sixes"])/b["balls"], pos=b["pos_sum"]/b["pos_n"] if b["pos_n"] else 7)
    if w["legal"] >= ALLROUND_BOWL:
        overs = w["legal"]/6
        wm = dict(wkts=w["wkts"], econ=w["conceded"]/overs, bsr=w["legal"]/w["wkts"] if w["wkts"] else 999,
                  death_econ=(w["death_conceded"]/(w["death_legal"]/6)) if w["death_legal"] >= 24 else None,
                  mid_share=w["mid_legal"]/w["legal"], legal=w["legal"])
    return bm, wm

def mean(xs): xs = [x for x in xs if x is not None]; return sum(xs)/len(xs) if xs else 0.0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--overseas", default="overseas.csv")
    ap.add_argument("--keepers", default="keepers.csv", help="known wicket-keepers (backstop for stumping detection)")
    ap.add_argument("--types", default="bowler_types.csv", help="optional name,style(spin|pace) overrides")
    ap.add_argument("--out", default="../web/players.js")
    ap.add_argument("--report", default="players.report.txt")
    args = ap.parse_args()

    overseas = set()
    if os.path.exists(args.overseas):
        with open(args.overseas, newline="") as f:
            for row in csv.DictReader(f):
                if row.get("name"): overseas.add(keyname(row["name"].strip()))
    keepers = set()
    if os.path.exists(args.keepers):
        with open(args.keepers, newline="") as f:
            for row in csv.DictReader(f):
                if row.get("name"): keepers.add(keyname(row["name"].strip()))
    type_override = {}
    if os.path.exists(args.types):
        with open(args.types, newline="") as f:
            for row in csv.DictReader(f):
                type_override[keyname(row["name"].strip())] = row["style"].strip().upper()

    print(f"Reading {args.src} ...")
    bat, bowl, team, stump, nm = process(args.src)

    # collect qualifying player-seasons
    rows = []
    for name in set(list(bat) + list(bowl)):
        for y in set(list(bat.get(name, {})) + list(bowl.get(name, {}))):
            bm, wm = season_metrics(bat.get(name, {}).get(y, blank_bat()), bowl.get(name, {}).get(y, blank_bowl()))
            if bm or wm: rows.append([name, y, bm, wm])

    # era benchmarks (internal normalization)
    bench = {}
    for era in (1, 2, 3, 4):
        er = [r for r in rows if era_of(r[1]) == era]
        bench[era] = dict(
            sr=mean([r[2]["sr"] for r in er if r[2]]) or 120, runs=mean([r[2]["runs"] for r in er if r[2]]) or 250,
            bdry=mean([r[2]["bdry"] for r in er if r[2]]) or .18, avg=mean([r[2]["avg"] for r in er if r[2]]) or 25,
            econ=mean([r[3]["econ"] for r in er if r[3]]) or 8, wkts=mean([r[3]["wkts"] for r in er if r[3]]) or 12,
            bsr=mean([r[3]["bsr"] for r in er if r[3] and r[3]["bsr"] < 999]) or 20,
            death=mean([r[3]["death_econ"] for r in er if r[3] and r[3]["death_econ"]]) or 10)
    def bat_power(bm, era):
        if not bm: return 0
        k = bench[era]
        return max(0, min(100, round(50*(0.45*bm["sr"]/k["sr"] + 0.30*bm["runs"]/k["runs"] + 0.15*bm["bdry"]/k["bdry"] + 0.10*bm["avg"]/k["avg"]))))
    def bowl_power(wm, era):
        if not wm: return 0
        k = bench[era]; death = (k["death"]/wm["death_econ"]) if wm["death_econ"] else 1.0
        return max(0, min(100, round(50*(0.40*k["econ"]/wm["econ"] + 0.30*wm["wkts"]/k["wkts"] + 0.20*k["bsr"]/wm["bsr"] + 0.10*death))))

    # A player-season can be eligible for SEVERAL roles (overlap maximizes one-per-team coverage).
    def eligible_roles(name, y, bm, wm):
        roles, k = [], keyname(name)
        legal = wm["legal"] if wm else 0
        if bm:
            p = bm["pos"]
            if p <= 2.5: roles.append("OPENER")
            if 2.0 <= p <= 5.5: roles.append("BAT")
            if p >= 4.3: roles.append("FINISHER")
            if legal >= ALLROUND_BOWL: roles.append("ALLROUNDER")
            if stump[name].get(y, 0) >= 1 or k in keepers: roles.append("KEEPER")
        if legal >= FRONTLINE_BOWL:
            roles.append(type_override.get(k) or ("SPIN" if wm["mid_share"] >= 0.5 else "PACE"))  # over-phase heuristic
        return roles

    # best representative per (team, year, role)
    best = {}
    for name, y, bm, wm in rows:
        tm = team[name].get(y) and team[name][y].most_common(1)[0][0]
        if not tm: continue
        era = era_of(y); bp, wp = bat_power(bm, era), bowl_power(wm, era)
        stats = {}
        if bm: stats.update(runs=bm["runs"], avg=round(bm["avg"], 1), sr=round(bm["sr"]))
        if wm: stats.update(wkts=wm["wkts"], econ=round(wm["econ"], 1), bsr=round(wm["bsr"], 1))
        os_flag = keyname(name) in overseas
        for role in eligible_roles(name, y, bm, wm):
            rating = (bp + wp) if role == "ALLROUNDER" else wp if role in ("SPIN", "PACE") \
                else (stump[name].get(y, 0) * 1000 + bp) if role == "KEEPER" else bp
            key = (tm, y, role)
            if key not in best or rating > best[key]["rating"]:
                best[key] = dict(name=name, role=role, os=os_flag, year=y, team=tm, bat=bp, bowl=wp, stats=stats, rating=rating)

    out = [dict(id=i, name=e["name"], role=e["role"], os=e["os"], year=e["year"], team=e["team"], bat=e["bat"], bowl=e["bowl"], stats=e["stats"])
           for i, e in enumerate(sorted(best.values(), key=lambda e: (e["year"], e["role"], -e["rating"])))]
    years = sorted({e["year"] for e in out})
    payload = dict(meta=dict(source="Cricsheet ball-by-ball (computed)", generated=datetime.date.today().isoformat(),
                             model="player-seasons (one per franchise per role)", matches=nm, players=len(out), years=years), players=out)
    with open(args.out, "w") as f:
        f.write("/* GENERATED by data-pipeline/build_players.py from Cricsheet open data. Do not edit by hand. */\n"
                "(function (root) {\n  root.PLAYERS_DATA = " + json.dumps(payload, indent=1) +
                ";\n  if (typeof module === 'object' && module.exports) module.exports = root.PLAYERS_DATA;\n"
                "})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));\n")
    print(f"  parsed {nm} matches -> {len(out)} representatives across {len(years)} seasons ({years[0] if years else '-'}–{years[-1] if years else '-'})")
    print(f"  wrote {args.out}")

    # coverage report: options per (role, year)
    cov = defaultdict(lambda: defaultdict(int))
    for e in out: cov[e["role"]][e["year"]] += 1
    with open(args.report, "w") as f:
        f.write("OPTIONS PER (ROLE, YEAR) — target ~8 (one per franchise)\n")
        for role in ("OPENER", "BAT", "FINISHER", "KEEPER", "ALLROUNDER", "SPIN", "PACE"):
            f.write(f"  {role:11s}" + " ".join(f"{y}:{cov[role].get(y,0)}" for y in years) + "\n")
        thin = [(r, y, c) for r in cov for y, c in cov[r].items() if c < 6]
        f.write(f"\nThin cells (<6 options): {len(thin)}\n")
        for r, y, c in sorted(thin): f.write(f"  {r} {y}: {c}\n")
    print(f"  wrote coverage report -> {args.report}")

if __name__ == "__main__":
    main()
