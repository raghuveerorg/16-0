/* 16-0 — UI / game flow (player-season model). Depends on engine.js (ENGINE) and players.js (PLAYERS_DATA). */
(function () {
  "use strict";
  const E = window.ENGINE, DATA = window.PLAYERS_DATA;
  const P = DATA.players;
  const FEASIBLE = E.feasibleYears(P);
  const TEAM_LABEL = { KXIP: "PBKS", }; // historical alias display (optional)
  const $ = (id) => document.getElementById(id);

  const S = { mode: "classic", hideStats: false, seed: null, years: [], round: 0, xi: [], used: new Set(), skips: 2, captainId: null, result: null };

  function show(id) { ["start", "draft", "captain", "result"].forEach((s) => $(s).classList.toggle("hidden", s !== id)); }
  function toast(t) { const e = $("toast"); e.textContent = t; e.classList.add("show"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("show"), 1500); }
  const osCount = () => E.overseasCount(S.xi);

  // ---- Daily Challenge: one play per calendar day (persisted locally) ----
  const LS = "16-0-daily-v1";
  function loadDaily() { try { const d = JSON.parse(localStorage.getItem(LS)); return d && d.date === E.dailyKey() ? d : null; } catch (e) { return null; } }
  function saveDaily() { try { localStorage.setItem(LS, JSON.stringify({ date: S.seed, wins: S.result.wins, losses: S.result.losses, rank: S.result.rank, xi: S.xi.map((p) => p.id), captainId: S.captainId })); } catch (e) {} }
  function replayDaily(d) {
    S.mode = "daily"; S.hideStats = false; S.seed = d.date;
    S.xi = d.xi.map((id) => P.find((p) => p.id === id)); S.captainId = d.captainId;
    S.result = E.simulateSeason(S.xi, S.captainId); S.result.rank = d.rank;
    $("modePill").textContent = "Daily · " + S.seed + " · ✓ played";
    renderResult(S.result, true);
  }

  function start(mode) {
    if (mode === "daily") { const done = loadDaily(); if (done) return replayDaily(done); }
    S.mode = mode;
    S.hideStats = mode === "iq";
    S.seed = mode === "daily" ? E.dailyKey() : null;
    S.years = E.assignedYearSequence(S.seed, FEASIBLE);
    S.round = 0; S.xi = []; S.used = new Set(); S.skips = mode === "daily" ? 0 : 2; S.captainId = null; S.result = null;
    $("modePill").textContent = mode === "daily" ? "Daily · " + S.seed : mode === "iq" ? "🧠 Cricket IQ" : "Classic";
    $("skipBtn").classList.toggle("hidden", mode === "daily");
    show("draft"); renderRound();
  }

  function renderRound() {
    if (S.round >= 11) return toCaptain();
    // Daily is a FIXED shared deal — never change its years. In the rare corner where a player's own
    // picks leave a slot with no legal option, relax the caps for that slot (so the deal still completes)
    // rather than re-rolling the season. Free Play / IQ instead re-roll to another unused season.
    S.relax = false;
    if (!E.hasPickable(P, S.round, S.years[S.round], S.xi, S.used)) {
      if (S.mode === "daily") {
        S.relax = true;
      } else {
        let guard = 0;
        while (!E.hasPickable(P, S.round, S.years[S.round], S.xi, S.used) && guard++ < 16) {
          const taken = new Set(S.years.filter((y, i) => i !== S.round));
          const opts = FEASIBLE[E.SLOTS[S.round]].filter((y) => !taken.has(y));
          if (!opts.length) break;
          S.years[S.round] = opts[Math.floor(Math.random() * opts.length)];
        }
      }
    }
    const role = E.SLOTS[S.round], year = S.years[S.round];
    $("rnum").textContent = S.round + 1;
    $("osCount").textContent = osCount();
    $("seasonCount").textContent = E.yearsUsed(S.xi).size;
    $("skips").textContent = S.skips; $("skipN").textContent = S.skips;
    $("skipBtn").disabled = S.skips <= 0;
    $("osPill").classList.toggle("warn", osCount() >= 4);
    $("slotRole").textContent = E.ROLE_LABEL[role];
    $("slotYear").textContent = "Season: " + year;

    const cands = E.candidates(P, S.round, year, S.xi, S.used).sort((a, b) => (b.bat + b.bowl) - (a.bat + a.bowl));
    $("pool").innerHTML = cands.map((p) => {
      const isBlocked = S.relax ? false : E.blocked(S.xi, p);
      const reason = !isBlocked ? "" : (p.os && osCount() >= 4 && E.franchiseCount(S.xi, E.franchiseOf(p)) >= E.MAX_PER_FRANCHISE)
        ? "overseas + team full" : (p.os && osCount() >= 4) ? "overseas full" : "2 from this team";
      const stats = S.hideStats ? "" : E.statLine(p).map((l) => `<div class="statline">${l}</div>`).join("");
      return `<div class="pcard ${isBlocked ? "disabled" : ""}" ${isBlocked ? "" : `data-id="${p.id}"`}>
        <div class="nm">${p.name}</div>
        <div class="meta">
          <span class="${p.os ? "os" : "ind"}">${p.os ? "OVERSEAS" : "INDIAN"}</span>
          <span class="teamtag">${team(p.team)}</span>
          ${isBlocked ? `<span style="color:var(--bad)">${reason}</span>` : ""}
        </div>
        ${stats}
      </div>`;
    }).join("");
    $("pool").querySelectorAll(".pcard[data-id]").forEach((el) => el.addEventListener("click", () => pick(+el.dataset.id)));
    renderRoster();
  }
  function team(t) { return TEAM_LABEL[t] || t; }

  function renderRoster() {
    let html = "";
    for (let i = 0; i < 11; i++) {
      const p = S.xi[i];
      if (p) html += `<div class="rchip"><span class="r">${E.ROLE_LABEL[E.SLOTS[i]]}</span>${p.name} · ${team(p.team)} ${p.year}</div>`;
      else html += `<div class="rchip empty"><span class="r">${E.ROLE_LABEL[E.SLOTS[i]]}</span>—</div>`;
    }
    $("roster").innerHTML = html;
  }

  function pick(id) {
    const p = P.find((x) => x.id === id);
    const chk = E.canPick(S.xi, S.round, p, S.years[S.round], S.used);
    if (!chk.ok) {
      const hard = chk.reason === "wrong role" || chk.reason === "wrong year" || chk.reason === "already in your XI";
      // In a relaxed daily corner, allow an over-cap pick so the fixed deal never dead-ends.
      if (hard || !(S.relax && S.mode === "daily")) return toast(chk.reason === "max 4 overseas" ? "Max 4 overseas players" : chk.reason);
    }
    S.xi[S.round] = p; S.used.add(id); S.round++; renderRound();
  }

  function skip() {
    if (S.skips <= 0 || S.mode === "daily") return;
    // Re-roll to a different, still-distinct season for this position.
    const taken = new Set(S.years.filter((y, i) => i !== S.round));
    const opts = FEASIBLE[E.SLOTS[S.round]].filter((y) => !taken.has(y) && y !== S.years[S.round]);
    if (!opts.length) return toast("No other free season for this slot");
    S.skips--;
    S.years[S.round] = opts[Math.floor(Math.random() * opts.length)];
    renderRound();
  }

  function toCaptain() { show("captain"); renderCap(); }
  function renderCap() {
    $("capRoster").innerHTML = S.xi.map((p) =>
      `<div class="rchip click ${S.captainId === p.id ? "cap" : ""}" data-id="${p.id}">
        <span class="r">${S.captainId === p.id ? "CAPTAIN" : E.ROLE_LABEL[p.role]}</span>${p.name} · ${team(p.team)} ${p.year}</div>`).join("");
    $("capRoster").querySelectorAll(".rchip[data-id]").forEach((el) =>
      el.addEventListener("click", () => { S.captainId = +el.dataset.id; renderCap(); $("simBtn").disabled = false; }));
  }

  // Percentile "rank" against the field of all valid line-ups for THIS deal (today's assigned seasons).
  // Pure client-side estimate; a real cross-player leaderboard (backend) can replace this later.
  function computeRank(userWins) {
    const pools = E.SLOTS.map((role, i) => P.filter((p) => p.role === role && p.year === S.years[i]));
    const N = 1500; let total = 0, worse = 0, equal = 0;
    for (let s = 0; s < N; s++) {
      const xi = [], used = new Set(); let ok = true;
      for (let i = 0; i < 11; i++) {
        const opts = pools[i].filter((p) => !used.has(p.id) && !E.blocked(xi, p));
        if (!opts.length) { ok = false; break; }
        const p = opts[(Math.random() * opts.length) | 0]; xi[i] = p; used.add(p.id);
      }
      if (!ok) continue;
      const w = E.simulateSeason(xi, xi[(Math.random() * 11) | 0].id).wins;
      total++; if (w < userWins) worse++; else if (w === userWins) equal++;
    }
    const beat = worse + equal * 0.5;
    return { pct: Math.max(0.1, (1 - beat / total) * 100), beat: worse, total };
  }

  function simulate() {
    const v = E.validateXI(S.xi);
    // Daily uses a fixed shared deal; a rare relaxed corner may exceed a cap — allow it through so the
    // shared puzzle always completes. (Free Play / IQ stay strictly validated.)
    if (!v.ok && S.mode !== "daily") return toast(v.errs[0]);
    S.result = E.simulateSeason(S.xi, S.captainId);
    if (S.mode === "daily") { S.result.rank = computeRank(S.result.wins); saveDaily(); }
    renderResult(S.result);
  }

  function renderResult(r, replay) {
    show("result");
    $("record").textContent = `${r.wins}-${r.losses}`;
    $("record").style.color = r.wins === 16 ? "var(--gold)" : r.wins >= 14 ? "var(--good)" : r.wins <= 6 ? "var(--bad)" : "var(--txt)";
    const v = E.verdict(r.wins);
    const topBat = S.xi.slice().sort((a, b) => b.bat - a.bat)[0];
    const topBowl = S.xi.slice().sort((a, b) => b.bowl - a.bowl)[0];
    const stories = {
      perfect: `Unbeaten champions. ${topBat.name} (${topBat.year}) terrorised attacks, ${topBowl.name} (${topBowl.year}) closed every door.`,
      great: `Lifted the trophy — but one slip kept you off the perfect run.`,
      good: `Fell at the very last hurdle. So close.`,
      ok: `Made the playoffs, ran out of steam in the knockouts.`,
      mid: `A few good nights, not enough of them.`,
      bad: `The selectors got it wrong. Rebuild and go again.`,
    };
    $("verdict").textContent = v.title;
    $("story").textContent = stories[v.tone] + (S.mode === "daily" ? "  ·  Today's Daily — come back tomorrow." : "");
    const rp = $("rankPanel");
    if (S.mode === "daily" && r.rank) {
      const p = r.rank.pct;
      rp.innerHTML = `<div class="rank-big">Daily rank · Top ${p < 1 ? "<1" : Math.round(p)}%</div>` +
        `<div class="rank-sub">You beat ${r.rank.beat.toLocaleString()} of ${r.rank.total.toLocaleString()} possible line-ups for today's deal</div>` +
        `<div class="rank-note">Estimated vs all valid XIs — live human leaderboard coming soon</div>`;
      rp.classList.remove("hidden");
    } else rp.classList.add("hidden");
    const set = (bar, pct, val) => { $(bar).style.width = Math.round(val * 100) + "%"; $(pct).textContent = Math.round(val * 100); };
    set("batBar", "batPct", r.bn); set("bowlBar", "bowlPct", r.bw);
    set("balBar", "balPct", r.balance); set("strBar", "strPct", r.strength);
    drawCard(r, v);
    S.shareText = `My all-time IPL XI went ${r.wins}-${r.losses} on 16-0 🏏\n${v.title}\nCaptain: ${r.captain.name} (${r.captain.year})` +
      (S.mode === "daily" ? `\nDaily ${S.seed}` + (r.rank ? ` · Top ${r.rank.pct < 1 ? "<1" : Math.round(r.rank.pct)}%` : "") : "") +
      (S.hideStats ? `\n🧠 Cricket IQ mode (no stats!)` : "") + `\n\nCan your XI go 16-0?`;
  }

  function drawCard(r, v) {
    const c = $("shareCanvas"), x = c.getContext("2d"), W = 800, H = 800;
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#1a2142"); g.addColorStop(1, "#0c1020");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // header
    x.textAlign = "center";
    x.fillStyle = "#ffb020"; x.font = "900 60px -apple-system,Segoe UI,Roboto,sans-serif"; x.fillText("16-0", W / 2, 84);
    x.fillStyle = "#9aa6cf"; x.font = "700 16px sans-serif"; x.fillText("ALL-TIME IPL · UNBEATEN CHALLENGE", W / 2, 112);
    x.fillStyle = r.wins === 16 ? "#ffcf45" : r.wins >= 14 ? "#3ddc84" : r.wins <= 6 ? "#ff5a5a" : "#eaf0ff";
    x.font = "900 132px sans-serif"; x.fillText(`${r.wins}-${r.losses}`, W / 2, 258);
    x.fillStyle = "#eaf0ff"; x.font = "800 30px sans-serif"; x.fillText(v.title, W / 2, 304);
    // divider
    const rule = (y) => { x.strokeStyle = "rgba(255,255,255,.10)"; x.lineWidth = 1; x.beginPath(); x.moveTo(56, y); x.lineTo(W - 56, y); x.stroke(); };
    rule(338);
    // eleven players — two columns, generous vertical rhythm
    const colX = [64, 424], baseY = 392, step = 62;
    x.textAlign = "left";
    S.xi.forEach((p, i) => {
      const cx = colX[i < 6 ? 0 : 1], y = (i % 6) * step + baseY, isCap = p.id === S.captainId;
      x.fillStyle = "#8b97c2"; x.font = "700 12px sans-serif";
      x.fillText(E.ROLE_LABEL[E.SLOTS[i]].toUpperCase() + (isCap ? "  ·  CAPTAIN" : ""), cx, y - 20);
      x.fillStyle = isCap ? "#ffcf45" : "#eaf0ff"; x.font = "700 22px sans-serif";
      x.fillText(p.name, cx, y);
      x.fillStyle = "#7c88b0"; x.font = "600 14px sans-serif";
      x.fillText(`${team(p.team)} · ${p.year}`, cx, y + 20);
    });
    // footer
    rule(748);
    x.textAlign = "center"; x.fillStyle = "#9aa6cf"; x.font = "600 16px sans-serif";
    x.fillText(`Captain: ${r.captain.name}   ·   ${r.seasons} seasons   ·   ${osCount()} overseas`, W / 2, 778);
  }

  function downloadCard() {
    const a = document.createElement("a");
    a.download = `16-0_${S.result.wins}-${S.result.losses}.png`;
    a.href = $("shareCanvas").toDataURL("image/png"); a.click(); toast("Card saved");
  }
  function copyText() {
    const t = S.shareText || "", done = () => toast("Copied! Paste into WhatsApp");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done).catch(() => fb(t, done));
    else fb(t, done);
  }
  function fb(t, done) {
    const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed"); }
    document.body.removeChild(ta);
  }
  function again() { show("start"); }

  window.APP = { start, skip, simulate, downloadCard, copyText, again };

  // Reflect daily state on the start screen
  (function () {
    const d = loadDaily();
    if (d) { $("dailyBadge").textContent = "✓ PLAYED " + d.wins + "-" + d.losses; $("dailyDesc").innerHTML = "You've played today — tap to see your result &amp; rank. New draft tomorrow."; }
    else $("dailyBadge").textContent = "DAILY · " + E.dailyKey().slice(5);
  })();
})();
