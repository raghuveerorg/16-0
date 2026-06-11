// Tests for the backend's security-critical logic. Run: node web-next/lib/backend.test.js
const assert = require("assert");
const ENGINE = require("./engine.js");
const PLAYERS = require("./players.js").players;
const { validateSubmission, validateFreeplay } = require("./validate.js");
const { computeStreak } = require("./streak.js");

let pass = 0, fail = 0;
const t = (n, fn) => { try { fn(); console.log("  ✓ " + n); pass++; } catch (e) { console.log("  ✗ " + n + " — " + e.message); fail++; } };

// Build a legit submission for a given day: the day's deal, best card per slot, with no player
// repeated (even across seasons) — mirrors the game's one-human-per-XI rule.
function legit(day) {
  const years = ENGINE.assignedYearSequence(day, ENGINE.feasibleYears(PLAYERS));
  const usedNames = new Set(), xi = [];
  for (let i = 0; i < 11; i++) {
    const role = ENGINE.SLOTS[i];
    const pool = PLAYERS.filter((p) => p.role === role && p.year === years[i] && !usedNames.has(p.name))
      .sort((a, b) => (b.bat + b.bowl) - (a.bat + a.bowl));
    xi.push(pool[0].id); usedNames.add(pool[0].name);
  }
  return { day, xi, captainId: xi[5] };
}

console.log("Score validation");
t("accepts a legit submission and recomputes wins", () => {
  const sub = legit("2026-06-11");
  const r = validateSubmission(sub);
  assert.ok(r.ok, r.error);
  assert.ok(r.wins >= 0 && r.wins <= 16 && r.wins + r.losses === 16);
  // recomputed independently == engine on the same XI
  const picked = sub.xi.map((id) => PLAYERS.find((p) => p.id === id));
  assert.strictEqual(r.wins, ENGINE.simulateSeason(picked, sub.captainId).wins);
});
t("client-reported score is ignored (server recomputes)", () => {
  const sub = legit("2026-06-11"); sub.wins = 16; sub.losses = 0; // attacker claims a perfect score
  const r = validateSubmission(sub);
  assert.ok(r.ok);
  const real = ENGINE.simulateSeason(sub.xi.map((id) => PLAYERS.find((p) => p.id === id)), sub.captainId).wins;
  assert.strictEqual(r.wins, real, "server must use its own recompute, not the claimed 16");
});
t("rejects a card from the wrong season (off-deal)", () => {
  const sub = legit("2026-06-11");
  const slotRole = ENGINE.SLOTS[0];
  const wrong = PLAYERS.find((p) => p.role === slotRole && !sub.xi.includes(p.id) &&
    p.year !== PLAYERS.find((q) => q.id === sub.xi[0]).year);
  sub.xi[0] = wrong.id;
  assert.strictEqual(validateSubmission(sub).ok, false);
});
t("rejects a card in the wrong role slot", () => {
  const sub = legit("2026-06-11");
  const bowler = PLAYERS.find((p) => p.role === "PACE");
  sub.xi[0] = bowler.id; // opener slot gets a pacer
  assert.strictEqual(validateSubmission(sub).ok, false);
});
t("rejects duplicates, wrong length, unknown id, bad day", () => {
  const sub = legit("2026-06-11");
  assert.strictEqual(validateSubmission({ ...sub, xi: sub.xi.slice(0, 10) }).ok, false);
  assert.strictEqual(validateSubmission({ ...sub, xi: [...sub.xi.slice(0, 10), sub.xi[0]] }).ok, false);
  assert.strictEqual(validateSubmission({ ...sub, xi: [...sub.xi.slice(0, 10), 999999] }).ok, false);
  assert.strictEqual(validateSubmission({ ...sub, day: "not-a-date" }).ok, false);
});
t("rejects captain not in the XI", () => {
  const sub = legit("2026-06-11"); sub.captainId = -1;
  assert.strictEqual(validateSubmission(sub).ok, false);
});

// Build a legit free-play XI: correct role per slot, 11 distinct players, 11 distinct seasons, caps ok.
function legitFree(mode) {
  const usedNames = new Set(), usedYears = new Set(), xi = [], objs = [];
  for (let i = 0; i < 11; i++) {
    const role = ENGINE.SLOTS[i];
    const pool = PLAYERS.filter((p) => p.role === role && !usedNames.has(p.name) && !usedYears.has(p.year) && !ENGINE.blocked(objs, p))
      .sort((a, b) => (b.bat + b.bowl) - (a.bat + a.bowl));
    const p = pool[0];
    xi.push(p.id); objs.push(p); usedNames.add(p.name); usedYears.add(p.year);
  }
  return { mode, xi, captainId: xi[5] };
}

console.log("Free play");
t("accepts a legit free-play game and computes points = wins + strength/100", () => {
  const sub = legitFree("classic");
  const r = validateFreeplay(sub);
  assert.ok(r.ok, r.error);
  const picked = sub.xi.map((id) => PLAYERS.find((p) => p.id === id));
  const strength = picked.reduce((a, p) => a + p.bat + p.bowl, 0);
  assert.strictEqual(r.strength, strength);
  assert.strictEqual(r.points, Math.round((r.wins + strength / 100) * 100) / 100);
  assert.strictEqual(r.wins, ENGINE.simulateSeason(picked, sub.captainId).wins);
});
t("rejects an unknown mode, dup player, dup season, bad captain", () => {
  const base = legitFree("iq");
  assert.strictEqual(validateFreeplay({ ...base, mode: "daily" }).ok, false);
  assert.strictEqual(validateFreeplay({ ...base, captainId: -1 }).ok, false);
  // make two slots share a season → reject
  const picked = base.xi.map((id) => PLAYERS.find((p) => p.id === id));
  const clash = PLAYERS.find((p) => p.role === ENGINE.SLOTS[1] && p.year === picked[0].year && !base.xi.includes(p.id));
  if (clash) assert.strictEqual(validateFreeplay({ ...base, xi: base.xi.map((id, i) => (i === 1 ? clash.id : id)) }).ok, false);
});

console.log("Streak");
t("counts a consecutive run ending today", () => {
  const s = computeStreak(["2026-06-09", "2026-06-10", "2026-06-11"], "2026-06-11");
  assert.deepStrictEqual([s.current, s.longest], [3, 3]);
});
t("today not yet played keeps yesterday's streak alive", () => {
  const s = computeStreak(["2026-06-09", "2026-06-10"], "2026-06-11");
  assert.strictEqual(s.current, 2);
});
t("a gap breaks the current streak but longest is retained", () => {
  const s = computeStreak(["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-10", "2026-06-11"], "2026-06-11");
  assert.strictEqual(s.current, 2);
  assert.strictEqual(s.longest, 3);
});
t("empty history => 0/0", () => {
  const s = computeStreak([], "2026-06-11");
  assert.deepStrictEqual([s.current, s.longest], [0, 0]);
});

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
