/* 16-0 — UI / game flow (player-season model). Depends on engine.js (ENGINE) and players.js (PLAYERS_DATA). */
(function () {
  "use strict";
  const E = window.ENGINE, DATA = window.PLAYERS_DATA;
  const P = DATA.players;
  const FEASIBLE = E.feasibleYears(P);
  // Trademark-proof labels: home city / state instead of the franchise brand.
  // (Internal team codes are untouched, so the max-2-per-franchise rule still works.)
  const TEAM_LABEL = {
    MI: "Mumbai", KKR: "Kolkata", RCB: "Bengaluru", CSK: "Chennai",
    RR: "Rajasthan", SRH: "Hyderabad", DEC: "Hyderabad", KXIP: "Punjab", PBKS: "Punjab",
    DD: "Delhi", DC: "Delhi", LSG: "Lucknow", GT: "Gujarat", GL: "Gujarat",
    PWI: "Pune", RPS: "Pune", KTK: "Kerala",
  };
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
  // Replay today's Daily from the server record (so it shows even on a new device / cleared storage).
  function replayServer(srv) {
    S.mode = "daily"; S.hideStats = false; S.seed = E.dailyKey();
    S.xi = srv.xi.map((id) => P.find((p) => p.id === id)); S.captainId = srv.captainId;
    S.result = E.simulateSeason(S.xi, S.captainId);
    $("modePill").textContent = "Daily · " + S.seed + " · ✓ played";
    renderResult(S.result, true);
    $("rankPanel").classList.remove("hidden");
    applyServerRank(srv);
  }

  function start(mode) {
    if (mode === "daily") {
      // Server is authoritative for "already played today" (set by the Next wrapper). Falls back to
      // local storage for the static build / signed-out players.
      const srv = window.__dailyStatus__;
      if (srv && srv.played && srv.xi && srv.xi.every((id) => P.some((p) => p.id === id))) return replayServer(srv);
      const done = loadDaily(); if (done) return replayDaily(done);
    }
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
    S.relaxCaps = false; S.allowDup = false;
    if (!E.hasPickable(P, S.round, S.years[S.round], S.xi, S.used)) {
      if (S.mode === "daily") {
        // No within-cap, distinct option for this fixed slot. First relax only the CAPS (keeping the
        // XI free of duplicate players); allow an actual duplicate only if even that pool is empty (≈never).
        const distinct = E.candidates(P, S.round, S.years[S.round], S.xi, S.used, false);
        if (distinct.length) S.relaxCaps = true; else S.allowDup = true;
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

    const relaxed = S.relaxCaps || S.allowDup;
    const cands = E.candidates(P, S.round, year, S.xi, S.used, S.allowDup).sort((a, b) => (b.bat + b.bowl) - (a.bat + a.bowl));
    $("pool").innerHTML = cands.map((p) => {
      const isBlocked = relaxed ? false : E.blocked(S.xi, p);
      const reason = !isBlocked ? "" : (p.os && osCount() >= 4 && E.franchiseCount(S.xi, E.franchiseOf(p)) >= E.MAX_PER_FRANCHISE)
        ? "overseas + team full" : (p.os && osCount() >= 4) ? "overseas full" : "2 from this team";
      const stats = S.hideStats ? "" : E.statLine(p).map((l) => `<div class="statline">${l}</div>`).join("");
      return `<button type="button" class="pcard ${isBlocked ? "disabled" : ""}" ${isBlocked ? "disabled" : `data-id="${p.id}"`} aria-label="Pick ${p.name}${isBlocked ? " (unavailable: " + reason + ")" : ""}">
        <div class="nm">${p.name}</div>
        <div class="meta">
          <span class="${p.os ? "os" : "ind"}">${p.os ? "OVERSEAS" : "DOMESTIC"}</span>
          <span class="teamtag">${team(p.team)}</span>
          ${isBlocked ? `<span style="color:var(--bad)">${reason}</span>` : ""}
        </div>
        ${stats}
      </button>`;
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
      const r = chk.reason;
      // Daily's fixed deal must always complete: relax caps in a corner, and (last resort only) a dup.
      const capOK = (r === "max 4 overseas" || r === "max 2 from a franchise") && (S.relaxCaps || S.allowDup);
      const dupOK = (r === "already picked (another season)") && S.allowDup;
      if (!capOK && !dupOK) return toast(r === "max 4 overseas" ? "Max 4 overseas players" : r);
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
      `<button type="button" class="rchip click ${S.captainId === p.id ? "cap" : ""}" data-id="${p.id}" aria-label="Make ${p.name} captain" aria-pressed="${S.captainId === p.id}">
        <span class="r">${S.captainId === p.id ? "CAPTAIN" : E.ROLE_LABEL[p.role]}</span>${p.name} · ${team(p.team)} ${p.year}</button>`).join("");
    $("capRoster").querySelectorAll(".rchip[data-id]").forEach((el) =>
      el.addEventListener("click", () => { S.captainId = +el.dataset.id; renderCap(); $("simBtn").disabled = false; }));
  }

  // Percentile "rank" against the field of all valid line-ups for THIS deal (today's assigned seasons).
  // Pure client-side estimate; a real cross-player leaderboard (backend) can replace this later.
  function computeRank(userWins) {
    const pools = E.SLOTS.map((role, i) => P.filter((p) => p.role === role && p.year === S.years[i]));
    const N = 1500; let total = 0, worse = 0, equal = 0;
    for (let s = 0; s < N; s++) {
      const xi = [], usedNames = new Set(); let ok = true;
      for (let i = 0; i < 11; i++) {
        const opts = pools[i].filter((p) => !usedNames.has(p.name) && !E.blocked(xi, p));
        if (!opts.length) { ok = false; break; }
        const p = opts[(Math.random() * opts.length) | 0]; xi[i] = p; usedNames.add(p.name);
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
    if (S.mode === "daily") {
      S.result.rank = computeRank(S.result.wins); saveDaily();
      // Backend hook (set by the Next.js wrapper). Returns the live cross-player rank + streak, which
      // upgrades the panel a moment after the instant client estimate. No-op in the static build.
      if (window.__onDailyResult__) {
        Promise.resolve()
          .then(() => window.__onDailyResult__({ day: S.seed, xi: S.xi.map((p) => p.id), captainId: S.captainId }))
          .then((srv) => { if (srv) applyServerRank(srv); })
          .catch(() => {});
      }
    } else if (window.__onGameResult__) {
      // Classic / IQ → record to the free-play leaderboard (wins + team-strength points).
      Promise.resolve()
        .then(() => window.__onGameResult__({ mode: S.mode, xi: S.xi.map((p) => p.id), captainId: S.captainId }))
        .then((res) => {
          if (res && res.needsAuth) toast("Sign in to climb the leaderboard");
          else if (res && res.saved) toast("Added to the " + (S.mode === "iq" ? "Cricket IQ" : "Classic") + " leaderboard");
        })
        .catch(() => {});
    }
    renderResult(S.result);
  }

  function renderResult(r, replay) {
    show("result");
    const sl = $("shareLinks"); if (sl) { sl.classList.add("hidden"); sl.innerHTML = ""; }
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
        `<div class="rank-note">Estimated vs all valid XIs for today's deal</div>`;
      rp.classList.remove("hidden");
    } else rp.classList.add("hidden");
    renderNextDaily();
    const set = (bar, pct, val) => { $(bar).style.width = Math.round(val * 100) + "%"; $(pct).textContent = Math.round(val * 100); };
    set("batBar", "batPct", r.bn); set("bowlBar", "bowlPct", r.bw);
    set("balBar", "balPct", r.balance); set("strBar", "strPct", r.strength);
    drawCard(r, v);
    S.shareText = `My all-time Club T20 XI went ${r.wins}-${r.losses} on 16-0 🏏\n${v.title}\nCaptain: ${r.captain.name} (${r.captain.year})` +
      (S.mode === "daily" ? `\nDaily ${S.seed}` + (r.rank ? ` · Top ${r.rank.pct < 1 ? "<1" : Math.round(r.rank.pct)}%` : "") : "") +
      (S.hideStats ? `\n🧠 Cricket IQ mode (no stats!)` : "") + `\n\nCan your XI go 16-0?`;
  }

  // Wordle-style retention hook: live countdown to the next Daily (midnight IST — see E.dailyKey)
  // plus a streak tease. Shown on every result screen so Free Play also funnels into the Daily.
  function renderNextDaily() {
    const el = $("nextDaily"); if (!el) return;
    clearInterval(el._t);
    const IST = 330 * 60000, DAY = 86400000;
    const playedToday = S.mode === "daily" || !!loadDaily() || !!(window.__dailyStatus__ && window.__dailyStatus__.played);
    const tick = () => {
      const left = DAY - ((Date.now() + IST) % DAY);
      const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
      const t = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
      el.innerHTML = playedToday
        ? `⏳ Next Daily in <b>${t}</b> — come back and keep your streak alive 🔥`
        : `⏳ Today's Daily ends in <b>${t}</b> — <a href="#" onclick="APP.start('daily');return false">play it now</a> to start a streak 🔥`;
    };
    tick(); el._t = setInterval(tick, 1000);
    el.classList.remove("hidden");
  }

  // Upgrade the rank panel with the live backend response (real cross-player rank + streak).
  function applyServerRank(srv) {
    const rp = $("rankPanel");
    if (!rp || rp.classList.contains("hidden")) return;
    if (srv.needsAuth) {
      const note = rp.querySelector(".rank-note");
      if (note) note.textContent = "Sign in (top-right) to save your rank & streak";
      return;
    }
    const rk = srv.rank, st = srv.streak;
    let html = "";
    if (rk && rk.total) html += `<div class="rank-big">Daily rank · #${rk.rank.toLocaleString()} <span style="color:var(--mut)">of ${rk.total.toLocaleString()}</span></div>`;
    if (st) html += `<div class="rank-sub">🔥 ${st.current_streak}-day streak${st.longest_streak > st.current_streak ? ` · best ${st.longest_streak}` : ""}</div>`;
    html += `<div class="rank-note">Live rank among everyone who played today</div>`;
    if (rk && rk.total) rp.innerHTML = html;
  }

  function drawCard(r, v) {
    const c = $("shareCanvas"), x = c.getContext("2d"), W = 800, H = 800;
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#1a2142"); g.addColorStop(1, "#0c1020");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // pitch stripes — subtle vertical mow bands like a floodlit outfield
    for (let i = 0; i < 8; i++) { if (i % 2) { x.fillStyle = "rgba(255,255,255,.018)"; x.fillRect(i * 100, 0, 100, H); } }
    // top accent strip (team-colour energy)
    const strip = x.createLinearGradient(0, 0, W, 0); strip.addColorStop(0, "#ff5a36"); strip.addColorStop(1, "#ffb020");
    x.fillStyle = strip; x.fillRect(0, 0, W, 8);
    // header
    x.textAlign = "center";
    x.fillStyle = "#ffb020"; x.font = "900 60px -apple-system,Segoe UI,Roboto,sans-serif"; x.fillText("16-0", W / 2, 88);
    x.fillStyle = "#9aa6cf"; x.font = "700 16px sans-serif"; x.fillText("ALL-TIME CLUB T20 · UNBEATEN CHALLENGE", W / 2, 116);
    const recColor = r.wins === 16 ? "#ffcf45" : r.wins >= 14 ? "#3ddc84" : r.wins <= 6 ? "#ff5a5a" : "#eaf0ff";
    x.save();
    x.shadowColor = recColor; x.shadowBlur = r.wins >= 14 ? 42 : 18;
    x.fillStyle = recColor; x.font = "900 132px sans-serif"; x.fillText(`${r.wins}-${r.losses}`, W / 2, 258);
    x.restore();
    const badge = r.wins === 16 ? "🏆 " : r.wins >= 14 ? "🔥 " : "";
    x.fillStyle = "#eaf0ff"; x.font = "800 30px sans-serif"; x.fillText(badge + v.title, W / 2, 304);
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
    rule(742);
    x.textAlign = "center"; x.fillStyle = "#9aa6cf"; x.font = "600 16px sans-serif";
    x.fillText(`Captain: ${r.captain.name}   ·   ${r.seasons} seasons   ·   ${osCount()} overseas`, W / 2, 764);
    x.fillStyle = "#ffb020"; x.font = "800 13px sans-serif";
    x.fillText("Can your XI go 16-0?  ·  16-0.in", W / 2, 781);
    x.fillStyle = "#67719c"; x.font = "500 10px sans-serif";
    x.fillText("Unofficial fan project · not affiliated with any league or franchise · names used for identification only", W / 2, 794);
  }

  function siteUrl() {
    try { if (location && /^https?:/.test(location.origin)) return location.origin; } catch (e) {}
    return "https://16-0.in";
  }
  // Native share sheet on mobile (can attach the result-card image); social links elsewhere.
  async function share() {
    const url = siteUrl(), text = S.shareText || "Can your all-time XI go 16-0?";
    if (navigator.share) {
      try {
        const canvas = $("shareCanvas");
        const blob = canvas && await new Promise((r) => canvas.toBlob(r, "image/png"));
        const file = blob && new File([blob], `16-0_${S.result.wins}-${S.result.losses}.png`, { type: "image/png" });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: text + "\n" + url, title: "16-0" });
        } else {
          await navigator.share({ title: "16-0", text, url });
        }
        return;
      } catch (e) { if (e && e.name === "AbortError") return; } // cancelled → done; else fall through
    }
    showShareLinks(text, url);
  }
  function showShareLinks(text, url) {
    const t = encodeURIComponent(text), u = encodeURIComponent(url), tu = encodeURIComponent(text + " " + url);
    const links = [
      ["𝕏", `https://twitter.com/intent/tweet?text=${t}&url=${u}`],
      ["WhatsApp", `https://wa.me/?text=${tu}`],
      ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`],
      ["Telegram", `https://t.me/share/url?url=${u}&text=${t}`],
    ];
    const el = $("shareLinks");
    el.innerHTML = links.map(([n, h]) => `<a class="btn sm ghost" href="${h}" target="_blank" rel="noopener noreferrer">${n}</a>`).join("");
    el.classList.remove("hidden");
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
  function again() { const el = $("nextDaily"); if (el) clearInterval(el._t); show("start"); }

  window.APP = { start, skip, simulate, share, downloadCard, copyText, again };

  // Reflect daily state on the start screen
  (function () {
    const d = loadDaily();
    if (d) { $("dailyBadge").textContent = "✓ PLAYED " + d.wins + "-" + d.losses; $("dailyDesc").innerHTML = "You've played today — tap to see your result &amp; rank. New draft tomorrow."; }
    else $("dailyBadge").textContent = "DAILY · " + E.dailyKey().slice(5);
  })();
})();
