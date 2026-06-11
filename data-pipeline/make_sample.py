#!/usr/bin/env python3
"""Generate synthetic Cricsheet-format Indian T20 match JSON to test build_players.py offline.
NOT real data — just exercises the parser/aggregation path.
Usage: python3 make_sample.py   ->  writes sample/*.json
"""
import json, os, random

random.seed(42)
OUT = os.path.join(os.path.dirname(__file__), "sample")
os.makedirs(OUT, exist_ok=True)

# (name, batting_skill 0-1, bowling_skill 0-1, is_keeper)
SQUAD_A = [("Alpha Opener", .9, .0, False), ("Beta Opener", .8, .0, False),
           ("Gamma Bat", .85, .0, False), ("Delta Keeper", .7, .0, True),
           ("Epsilon AR", .6, .7, False), ("Zeta Spin", .1, .9, False),
           ("Eta Pace", .1, .92, False), ("Theta Pace", .15, .85, False)]
SQUAD_B = [("Iota Opener", .82, .0, False), ("Kappa Bat", .8, .0, False),
           ("Lambda Bat", .75, .0, False), ("Mu Keeper", .68, .0, True),
           ("Nu AR", .55, .65, False), ("Xi Spin", .12, .88, False),
           ("Omicron Pace", .1, .9, False), ("Pi Pace", .12, .8, False)]

def bowlers(sq): return [p for p in sq if p[2 - 1] is not None and p[2] > 0.3]  # bowling_skill>0.3

def innings(batting, bowling, team):
    bowl_pool = [p for p in bowling if p[2] > 0.3]
    overs = []
    order = sorted(batting, key=lambda p: -p[1])  # best bats first-ish
    striker_i = 0
    for onum in range(20):
        bowler = random.choice(bowl_pool)
        deliveries = []
        for ball in range(6):
            bat = order[min(striker_i, len(order) - 1)]
            ns = order[min(striker_i + 1, len(order) - 1)]
            # outcome influenced by batting vs bowling skill
            r = random.random() + 0.25 * bat[1] - 0.2 * bowler[2]
            runs = 0
            if r > 1.15: runs = 6
            elif r > 0.95: runs = 4
            elif r > 0.55: runs = random.choice([1, 1, 2])
            elif r > 0.15: runs = random.choice([0, 1])
            d = {"batter": bat[0], "bowler": bowler[0], "non_striker": ns[0],
                 "runs": {"batter": runs, "extras": 0, "total": runs}}
            # occasional wicket, more likely at death and vs good bowlers
            if random.random() < 0.03 + 0.05 * bowler[2] + (0.02 if onum >= 15 else 0):
                kind = random.choice(["bowled", "caught", "lbw", "stumped", "caught"])
                w = {"player_out": bat[0], "kind": kind}
                if kind in ("caught", "stumped"):
                    keeper = next((x for x in bowling if x[3]), bowling[0])
                    w["fielders"] = [{"name": keeper[0]}]
                d["wickets"] = [w]
                striker_i += 1
            deliveries.append(d)
        overs.append({"over": onum, "deliveries": deliveries})
    return {"team": team, "overs": overs}

def make_match(year, idx):
    return {"meta": {"data_version": "1.1.0"},
            "info": {"season": str(year), "dates": [f"{year}-04-{(idx%28)+1:02d}"],
                     "teams": ["Team A", "Team B"], "match_type": "T20",
                     "players": {"Team A": [p[0] for p in SQUAD_A], "Team B": [p[0] for p in SQUAD_B]}},
            "innings": [innings(SQUAD_A, SQUAD_B, "Team A"), innings(SQUAD_B, SQUAD_A, "Team B")]}

n = 0
for year in (2010, 2015, 2020, 2024):       # one per era
    for idx in range(14):                    # ~a season each so players qualify
        with open(os.path.join(OUT, f"{year}_{idx}.json"), "w") as f:
            json.dump(make_match(year, idx), f)
        n += 1
print(f"wrote {n} synthetic matches to {OUT}")
