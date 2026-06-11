// Server-side score validation (anti-cheat). Reuses the SAME engine the client runs.
// The server recomputes the day's deal from the date seed, verifies the submitted XI is composed
// ONLY of the dealt (role, year) cells with 11 distinct cards, then recomputes the score itself —
// the client-reported score is never trusted.
const ENGINE = require("./engine.js");
const PLAYERS = require("./players.js").players;

function validateSubmission({ day, xi, captainId }, players = PLAYERS, engine = ENGINE) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: "bad day" };
  if (!Array.isArray(xi) || xi.length !== 11) return { ok: false, error: "xi must be 11 ids" };
  if (new Set(xi).size !== 11) return { ok: false, error: "duplicate card" };

  const byId = new Map(players.map((p) => [p.id, p]));
  const picked = xi.map((id) => byId.get(id));
  if (picked.some((p) => !p)) return { ok: false, error: "unknown player id" };
  // One human per XI — reject the same player twice even across different seasons.
  if (new Set(picked.map((p) => p.name)).size !== 11) return { ok: false, error: "same player twice" };

  // Re-derive the day's fixed deal (deterministic from the date seed) and check every slot.
  const years = engine.assignedYearSequence(day, engine.feasibleYears(players));
  for (let i = 0; i < 11; i++) {
    if (picked[i].role !== engine.SLOTS[i]) return { ok: false, error: `slot ${i}: wrong role` };
    if (picked[i].year !== years[i]) return { ok: false, error: `slot ${i}: wrong season` };
  }
  if (!picked.some((p) => p.id === captainId)) return { ok: false, error: "captain not in XI" };

  // Authoritative score — recomputed server-side, not taken from the client.
  const r = engine.simulateSeason(picked, captainId);
  return { ok: true, wins: r.wins, losses: r.losses };
}

// Free play (Classic / IQ): no shared seed to re-derive, so we enforce every structural rule a real
// deal must satisfy (11 distinct players, 11 distinct seasons, correct role per slot, caps, keeper,
// bowling cover, captain in XI) and recompute the score + team strength + points server-side.
function validateFreeplay({ mode, xi, captainId }, players = PLAYERS, engine = ENGINE) {
  if (mode !== "classic" && mode !== "iq") return { ok: false, error: "bad mode" };
  if (!Array.isArray(xi) || xi.length !== 11) return { ok: false, error: "xi must be 11 ids" };
  if (new Set(xi).size !== 11) return { ok: false, error: "duplicate card" };

  const byId = new Map(players.map((p) => [p.id, p]));
  const picked = xi.map((id) => byId.get(id));
  if (picked.some((p) => !p)) return { ok: false, error: "unknown player id" };
  if (new Set(picked.map((p) => p.name)).size !== 11) return { ok: false, error: "same player twice" };
  if (new Set(picked.map((p) => p.year)).size !== 11) return { ok: false, error: "seasons must be distinct" };

  for (let i = 0; i < 11; i++) {
    if (picked[i].role !== engine.SLOTS[i]) return { ok: false, error: `slot ${i}: wrong role` };
  }
  const v = engine.validateXI(picked);
  if (!v.ok) return { ok: false, error: v.errs[0] };
  if (!picked.some((p) => p.id === captainId)) return { ok: false, error: "captain not in XI" };

  const r = engine.simulateSeason(picked, captainId);
  const strength = picked.reduce((a, p) => a + p.bat + p.bowl, 0); // team-strength value
  const points = Math.round((r.wins + strength / 100) * 100) / 100;  // wins + strength bonus
  return { ok: true, wins: r.wins, losses: r.losses, strength, points };
}

module.exports = { validateSubmission, validateFreeplay };
