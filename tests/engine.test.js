/* Node tests for the 16-0 engine. Data-agnostic — pass on the seed OR the real Cricsheet dataset.
 * Run: node tests/engine.test.js */
const assert = require("assert");
const E = require("../web/engine.js");
const DATA = require("../web/players.js");
const P = DATA.players;
const byRole = {}; E.SLOTS.forEach((r) => (byRole[r] = P.filter((p) => p.role === r)));
const rate = (p, role) => role === "ALLROUNDER" ? p.bat + p.bowl : (role === "SPIN" || role === "PACE") ? p.bowl : p.bat;
const feasible = E.feasibleYears(P);

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); console.log("  ✓ " + name); pass++; } catch (e) { console.log("  ✗ " + name + "  — " + e.message); fail++; } }

// build an XI by a per-slot scoring function, distinct players, ignoring year/franchise (sim doesn't validate those)
function buildXI(score) {
  const used = new Set();
  return E.SLOTS.map((role, i) => {
    const p = byRole[role].filter((x) => !used.has(x.id)).sort((a, b) => score(b, role, i) - score(a, role, i))[0];
    used.add(p.id); return p;
  });
}
const capOf = (xi) => xi.slice().sort((a, b) => (b.bat + b.bowl) - (a.bat + a.bowl))[0].id;

console.log("Schema");
t("every player has year, team, role and hidden bat/bowl", () => {
  P.forEach((p) => {
    assert.ok(Number.isInteger(p.year) && p.team && E.SLOTS.includes(p.role), "bad " + JSON.stringify(p));
    assert.ok(typeof p.bat === "number" && typeof p.bowl === "number");
  });
});
t("statLine shows stats, never the hidden rating", () => {
  const withStats = P.find((p) => p.stats && (p.stats.runs != null || p.stats.wkts != null));
  const line = E.statLine(withStats).join(" ");
  assert.ok(/runs|wkts/.test(line), "expected a stat line");
  assert.ok(!new RegExp("\\b" + withStats.bat + "\\b").test(line) || withStats.bat === withStats.stats.runs, "rating leaked");
});
t("a player appears in multiple seasons with varying ratings (peak concept)", () => {
  const byName = {}; P.forEach((p) => ((byName[p.name] = byName[p.name] || new Set()).add(p.year)));
  const multi = Object.entries(byName).filter(([, ys]) => ys.size >= 2);
  assert.ok(multi.length > 0, "no multi-season players");
});

console.log("Year slot machine — 11 distinct seasons");
t("every role has >= 11 feasible seasons", () => {
  Object.entries(feasible).forEach(([r, ys]) => assert.ok(ys.length >= 11, `${r} only has ${ys.length}`));
});
t("slot machine deals 11 DISTINCT seasons, one per position, all feasible", () => {
  for (const seed of [null, "2026-06-10", "2026-06-11", "x", "y"]) {
    const seq = E.assignedYearSequence(seed, feasible);
    assert.strictEqual(seq.length, 11);
    assert.strictEqual(new Set(seq).size, 11, "years not distinct: " + seq);
    seq.forEach((y, i) => assert.ok(feasible[E.SLOTS[i]].includes(y), `slot ${i} infeasible year ${y}`));
  }
});
t("deterministic for a seed", () => {
  assert.deepStrictEqual(E.assignedYearSequence("2026-06-10", feasible), E.assignedYearSequence("2026-06-10", feasible));
});
t("20 random drafts complete with no dead-end and all rules satisfied", () => {
  for (let g = 0; g < 20; g++) {
    const years = E.assignedYearSequence("deal" + g, feasible), xi = [], used = new Set();
    for (let i = 0; i < 11; i++) {
      let c = E.candidates(P, i, years[i], xi, used).filter((p) => !E.blocked(xi, p));
      if (!c.length) { // mirror the app's auto-reroll guard: swap to an unused feasible season that works
        const taken = new Set(years.filter((y, j) => j !== i));
        for (const y of feasible[E.SLOTS[i]]) {
          if (taken.has(y)) continue;
          const cc = E.candidates(P, i, y, xi, used).filter((p) => !E.blocked(xi, p));
          if (cc.length) { years[i] = y; c = cc; break; }
        }
      }
      assert.ok(c.length, `dead-end g${g} slot ${i}`);
      c.sort((a, b) => rate(b, E.SLOTS[i]) - rate(a, E.SLOTS[i]));
      xi[i] = c[0]; used.add(c[0].id);
    }
    const v = E.validateXI(xi);
    assert.ok(v.ok, "invalid XI: " + v.errs.join(","));
    assert.strictEqual(new Set(years).size, 11);
    assert.ok(E.overseasCount(xi) <= 4);
  }
});

console.log("Constraints");
t("wrong year rejected, right year accepted", () => {
  const op = byRole.OPENER[0];
  const other = (feasible.OPENER.find((y) => y !== op.year));
  assert.strictEqual(E.canPick([], 0, op, other, new Set()).ok, false);
  assert.strictEqual(E.canPick([], 0, op, op.year, new Set()).ok, true);
});
t("duplicate same card blocked; different season of same player allowed", () => {
  // find a name with >=2 seasons in the same role
  const groups = {};
  P.forEach((p) => ((groups[p.name + "|" + p.role] = groups[p.name + "|" + p.role] || []).push(p)));
  const pair = Object.values(groups).find((a) => a.length >= 2);
  assert.ok(pair, "need a player with 2 seasons in one role");
  const idx = E.SLOTS.indexOf(pair[0].role), used = new Set([pair[0].id]);
  assert.strictEqual(E.canPick([], idx, pair[0], pair[0].year, used).ok, false);
  assert.strictEqual(E.canPick([], idx, pair[1], pair[1].year, used).ok, true);
});
t("max 4 overseas blocks a 5th", () => {
  const os = P.filter((p) => p.os).slice(0, 4);
  const fifth = P.find((p) => p.os && !os.includes(p));
  assert.strictEqual(E.canPick(os, E.SLOTS.indexOf(fifth.role), fifth, fifth.year, new Set()).ok, false);
});

console.log("Franchise cap (max 2 per franchise)");
t("franchiseOf groups renames, keeps distinct clubs apart", () => {
  assert.strictEqual(E.franchiseOf({ team: "DD" }), E.franchiseOf({ team: "DC" }));
  assert.strictEqual(E.franchiseOf({ team: "KXIP" }), E.franchiseOf({ team: "PBKS" }));
  assert.notStrictEqual(E.franchiseOf({ team: "DEC" }), E.franchiseOf({ team: "SRH" }));
});
t("blocks a 3rd from the same franchise; validateXI flags it", () => {
  const fr = E.franchiseOf(P[0]);
  const same = P.filter((p) => E.franchiseOf(p) === fr).slice(0, 3);
  assert.ok(same.length === 3);
  assert.strictEqual(E.canPick([same[0], same[1]], E.SLOTS.indexOf(same[2].role), same[2], same[2].year, new Set()).ok, false);
  const others = P.filter((p) => E.franchiseOf(p) !== fr);
  const xi = [same[0], same[1], same[2]]; for (let i = 0; xi.length < 11; i++) xi.push(others[i]);
  assert.ok(E.validateXI(xi).errs.includes("too many from one franchise"));
});

console.log("Simulation calibration");
t("a strong, balanced XI can reach 16-0", () => {
  const r = E.simulateSeason(buildXI(rate), null);
  assert.ok(r.wins >= 15, "expected near-perfect, got " + r.wins + " (str " + r.strength.toFixed(3) + ")");
});
t("batting-stacked, weak bowling is crushed (geometric mean)", () => {
  const xi = buildXI((p, role, i) => i >= 6 ? -p.bowl : p.bat); // bowler slots pick WORST bowlers
  const r = E.simulateSeason(xi, capOf(xi));
  assert.ok(r.bn > r.bw, "should be batting-skewed");
  assert.ok(r.wins <= 6, "one-sided side should be crushed, got " + r.wins);
});
t("a best-play legal draft lands in a sane band (8–16)", () => {
  const years = E.assignedYearSequence("calib", feasible), xi = [], used = new Set();
  for (let i = 0; i < 11; i++) {
    const c = E.candidates(P, i, years[i], xi, used).filter((p) => !E.blocked(xi, p)).sort((a, b) => rate(b, E.SLOTS[i]) - rate(a, E.SLOTS[i]));
    xi[i] = c[0]; used.add(c[0].id);
  }
  const r = E.simulateSeason(xi, capOf(xi));
  assert.ok(r.wins >= 8 && r.wins <= 16, "got " + r.wins);
});

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
