/* 16-0 — shared game engine (browser + Node)
 * Player-SEASON model: each card is a player in a specific YEAR, for the TEAM they played that year,
 * with that season's real stats shown and a HIDDEN rating (bat/bowl) driving the simulation.
 * Slot machine assigns a role + a YEAR per round. Duplicate players (different seasons) are allowed.
 * Ratings/stats come from players.js (PLAYERS_DATA) — produced by data-pipeline/build_players.py.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ENGINE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ROLE_LABEL = {
    OPENER: "Opener", BAT: "Middle order", FINISHER: "Finisher", KEEPER: "Wicket-keeper",
    ALLROUNDER: "All-rounder", SPIN: "Spinner", PACE: "Fast bowler",
  };
  const BATTING_ROLES = new Set(["OPENER", "BAT", "FINISHER", "KEEPER"]);
  const BOWLING_ROLES = new Set(["SPIN", "PACE"]);
  // Fixed XI shape. Indices 6..10 are the five designated bowlers => 20 overs covered.
  const SLOTS = ["OPENER", "OPENER", "BAT", "BAT", "FINISHER", "KEEPER", "ALLROUNDER", "ALLROUNDER", "SPIN", "PACE", "PACE"];
  const BOWLER_SLOTS = [6, 7, 8, 9, 10];
  const MAX_OVERSEAS = 4;
  const MAX_PER_FRANCHISE = 2;
  // Franchise lineage — renamed/relocated teams count as one franchise; separate-ownership teams stay distinct.
  const FRANCHISE = { DD: "DELHI", DC: "DELHI", KXIP: "PUNJAB", PBKS: "PUNJAB", RCB: "RCB", CSK: "CSK",
    MI: "MI", KKR: "KKR", SRH: "SRH", RR: "RR", DEC: "DECCAN", GL: "GL", GT: "GT", RPS: "RPS", PWI: "PWI", KTK: "KTK", LSG: "LSG" };
  const franchiseOf = (p) => FRANCHISE[p.team] || p.team;
  const franchiseCount = (xi, fr) => xi.filter((p) => p && franchiseOf(p) === fr).length;

  // Win-curve calibration tuned to the real era-adjusted rating distribution (best-play strength tops
  // out ~0.78). 16-0 sits at the very top of best play — rare but reachable; median good play ~14;
  // one-sided sides are crushed by the geometric mean.
  const TUNE = { k: 22, threshold: 0.625, capMax: 1.03 };

  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Deterministic PRNG so a Daily seed gives everyone the same draft.
  function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rng(seed) { return mulberry32(typeof seed === "number" ? seed : hashStr(String(seed))); }
  // The Daily flips at midnight IST (UTC+5:30) — the audience's midnight, not 5:30am IST.
  // Server day calcs (web-next/lib/day.js) use the same offset; keep them in lockstep.
  function dailyKey(d) { d = d || new Date(); return new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10); }

  // Which years have at least one player for each role (so the year slot never dead-ends).
  function feasibleYears(players) {
    const m = {}; SLOTS.forEach((r) => (m[r] = new Set()));
    players.forEach((p) => { if (m[p.role]) m[p.role].add(p.year); });
    const out = {}; Object.keys(m).forEach((r) => (out[r] = [...m[r]].sort((a, b) => a - b)));
    return out;
  }

  // Per-round assigned years — EVERY position gets a DISTINCT year (greedy, role-aware so it never
  // dead-ends given full role coverage). Deterministic when a seed is supplied (Daily), random otherwise.
  function assignedYearSequence(seed, feasible) {
    const r = seed != null ? rng("16-0|year|" + seed) : null;
    const rand = () => (r ? r() : Math.random());
    const used = new Set();
    return SLOTS.map((role) => {
      const opts = feasible[role].filter((y) => !used.has(y));
      const y = opts[Math.floor(rand() * opts.length)];
      used.add(y);
      return y;
    });
  }

  function overseasCount(xi) { return xi.filter((p) => p && p.os).length; }
  function yearsUsed(xi) { return new Set(xi.filter(Boolean).map((p) => p.year)); }

  // Can this player-season be added to slot `idx` for the round's assigned year?
  function canPick(xi, idx, player, assignedYear, usedIds) {
    if (player.role !== SLOTS[idx]) return { ok: false, reason: "wrong role" };
    if (assignedYear != null && player.year !== assignedYear) return { ok: false, reason: "wrong year" };
    if (usedIds && usedIds.has(player.id)) return { ok: false, reason: "already in your XI" };
    // One human per XI — the same player can't appear twice, even from a different season.
    if (xi.some((q) => q && q.name === player.name)) return { ok: false, reason: "already picked (another season)" };
    if (player.os && overseasCount(xi) >= MAX_OVERSEAS) return { ok: false, reason: "max 4 overseas" };
    if (franchiseCount(xi, franchiseOf(player)) >= MAX_PER_FRANCHISE) return { ok: false, reason: "max 2 from a franchise" };
    return { ok: true };
  }

  function blocked(xi, player) {
    return (player.os && overseasCount(xi) >= MAX_OVERSEAS) || franchiseCount(xi, franchiseOf(player)) >= MAX_PER_FRANCHISE;
  }
  // Candidates for a round (role + assigned year), respecting used cards AND already-picked players
  // (a player drafted in an earlier season is hidden everywhere). allowDup relaxes the name filter
  // only for the rare Daily corner where a slot would otherwise have no legal option.
  function candidates(players, idx, assignedYear, xi, usedIds, allowDup) {
    const role = SLOTS[idx];
    const usedNames = allowDup ? null : new Set((xi || []).filter(Boolean).map((q) => q.name));
    return players.filter((p) => p.role === role && p.year === assignedYear
      && !(usedIds && usedIds.has(p.id))
      && !(usedNames && usedNames.has(p.name)));
  }
  // Is there any pickable (non-blocked) candidate? Used by the app's auto-reroll safeguard.
  function hasPickable(players, idx, assignedYear, xi, usedIds) {
    return candidates(players, idx, assignedYear, xi, usedIds).some((p) => !blocked(xi, p));
  }

  function validateXI(xi) {
    const errs = [];
    if (xi.filter(Boolean).length !== 11) errs.push("XI not complete");
    if (overseasCount(xi) > MAX_OVERSEAS) errs.push("too many overseas");
    if (xi[5] && xi[5].role !== "KEEPER") errs.push("no keeper");
    if (BOWLER_SLOTS.some((i) => !xi[i])) errs.push("bowling not covered");
    const present = xi.filter(Boolean);
    if (new Set(present.map((p) => p.name)).size !== present.length) errs.push("same player picked twice");
    const fc = {}; xi.forEach((p) => { if (p) { const f = franchiseOf(p); fc[f] = (fc[f] || 0) + 1; } });
    if (Object.values(fc).some((c) => c > MAX_PER_FRANCHISE)) errs.push("too many from one franchise");
    return { ok: errs.length === 0, errs };
  }

  // The simulation. Uses HIDDEN bat/bowl ratings only.
  function simulateSeason(xi, captainId) {
    const bats = xi.map((p) => p.bat).sort((a, b) => b - a).slice(0, 7);
    const bn = bats.reduce((a, b) => a + b, 0) / 7 / 100;
    const bowlers = BOWLER_SLOTS.map((i) => xi[i]);
    const bw = bowlers.reduce((a, p) => a + p.bowl, 0) / BOWLER_SLOTS.length / 100;

    const raw = Math.sqrt(bn * bw);                 // geometric mean punishes one-sided sides
    const balance = 1 - Math.abs(bn - bw);
    const cap = xi.find((p) => p.id === captainId) || xi[0];
    const capF = Math.min(TUNE.capMax, 1 + ((cap.bat + cap.bowl) / 100) * 0.03);

    const strength = raw * (0.6 + 0.4 * balance) * capF;
    const wins = clamp(Math.round(16 * sigmoid(TUNE.k * (strength - TUNE.threshold))), 0, 16);
    return { wins, losses: 16 - wins, bn, bw, balance, strength: Math.min(1, strength), seasons: yearsUsed(xi).size, captain: cap };
  }

  function verdict(wins) {
    if (wins === 16) return { title: "PERFECT. 16-0. 🏆", tone: "perfect" };
    if (wins >= 14) return { title: "Champions! 🏆", tone: "great" };
    if (wins >= 12) return { title: "Finalists", tone: "good" };
    if (wins >= 10) return { title: "Playoffs", tone: "ok" };
    if (wins >= 7) return { title: "Mid-table", tone: "mid" };
    return { title: "Wooden spoon", tone: "bad" };
  }

  // Stat line for a card, auto by role (batters: bat line; bowlers: bowl line; all-rounders: both).
  function statLine(p) {
    const s = p.stats || {};
    const bat = (s.runs != null) ? `${s.runs} runs · ${s.avg} avg · ${s.sr} SR` : null;
    const bowl = (s.wkts != null) ? `${s.wkts} wkts · ${s.econ} econ · ${s.bsr} SR` : null;
    if (p.role === "ALLROUNDER") return [bat, bowl].filter(Boolean);
    if (BOWLING_ROLES.has(p.role)) return [bowl].filter(Boolean);
    return [bat].filter(Boolean);
  }

  return {
    ROLE_LABEL, SLOTS, BOWLER_SLOTS, MAX_OVERSEAS, MAX_PER_FRANCHISE, FRANCHISE, TUNE, BATTING_ROLES, BOWLING_ROLES,
    rng, hashStr, dailyKey, feasibleYears, assignedYearSequence, franchiseOf, franchiseCount, blocked,
    overseasCount, yearsUsed, canPick, candidates, hasPickable, validateXI, simulateSeason, verdict, statLine,
  };
});
