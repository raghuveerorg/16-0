import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MODES = [
  { key: "daily", label: "Daily" },
  { key: "classic", label: "Classic" },
  { key: "iq", label: "Cricket IQ" },
];
const WINDOWS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "alltime", label: "All-time" },
];

const ymd = (d) => d.toISOString().slice(0, 10);
const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

export default async function Leaderboard({ searchParams }) {
  const mode = MODES.some((m) => m.key === searchParams?.mode) ? searchParams.mode : "daily";
  const win = WINDOWS.some((w) => w.key === searchParams?.tab) ? searchParams.tab : "today";
  const sb = supabaseServer();

  const { data: { user } } = await sb.auth.getUser();
  let myHandle = null;
  if (user) {
    const { data: prof } = await sb.from("profiles").select("handle").eq("id", user.id).maybeSingle();
    myHandle = prof?.handle ?? null;
  }

  const today = ymd(new Date());
  const from = win === "today" ? today : win === "week" ? ymd(new Date(Date.now() - 6 * 86400000)) : null;
  const to = win === "alltime" ? null : today;

  // kind drives which columns render
  let rows = [], kind;
  if (mode === "daily") {
    if (win === "today") {
      const { data } = await sb.rpc("daily_leaderboard", { p_day: today, p_limit: 100 });
      rows = data ?? []; kind = "daily-today";
    } else {
      const { data } = await sb.rpc("agg_leaderboard", { p_from: from, p_to: to, p_limit: 100 });
      rows = data ?? []; kind = "agg";
    }
  } else {
    const { data } = await sb.rpc("freeplay_leaderboard", { p_mode: mode, p_from: from, p_to: to, p_limit: 100 });
    rows = data ?? []; kind = "points";
  }

  // styles
  const wrap = { maxWidth: 760, margin: "0 auto", padding: "24px 16px", color: "#eaf0ff", fontFamily: "system-ui, sans-serif" };
  const row = { display: "flex", gap: 8, flexWrap: "wrap" };
  const pill = (active, big) => ({
    padding: big ? "9px 18px" : "6px 13px", borderRadius: 999, fontWeight: 800, fontSize: big ? 14 : 13, textDecoration: "none",
    color: active ? "#180a06" : "#eaf0ff",
    background: active ? "linear-gradient(90deg,#ff5a36,#ffb020)" : "transparent",
    border: active ? "0" : "1px solid #2c3563",
  });
  const th = { padding: "10px 8px", textAlign: "left", color: "#9aa6cf", fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em" };
  const thR = { ...th, textAlign: "right" };
  const td = { padding: "10px 8px" };
  const numTd = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  const modeLabel = MODES.find((m) => m.key === mode).label;
  const winLabel = WINDOWS.find((w) => w.key === win).label;
  const subtitle = mode === "daily"
    ? (win === "today" ? `Daily Challenge · ${today} (UTC)` : `Daily Challenge · ${winLabel.toLowerCase()}`)
    : `${modeLabel} · ${winLabel.toLowerCase()} · ranked by points (wins + team strength)`;

  return (
    <main style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ color: "#ffb020", textDecoration: "none", fontWeight: 700 }}>← Play</Link>
        <Link href="/profile" style={{ color: "#ffb020", textDecoration: "none", fontWeight: 700 }}>My streak & history</Link>
      </div>

      <h1 style={{ margin: "14px 0 2px", fontSize: 30 }}>Leaderboard</h1>
      <div style={{ color: "#9aa6cf", fontSize: 14 }}>{subtitle}</div>

      <div style={{ ...row, margin: "16px 0 8px" }}>
        {MODES.map((m) => (
          <Link key={m.key} href={`/leaderboard?mode=${m.key}&tab=${win}`} style={pill(m.key === mode, true)}>{m.label}</Link>
        ))}
      </div>
      <div style={{ ...row, marginBottom: 18 }}>
        {WINDOWS.map((w) => (
          <Link key={w.key} href={`/leaderboard?mode=${mode}&tab=${w.key}`} style={pill(w.key === win, false)}>{w.label}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ color: "#9aa6cf", background: "#161c38", border: "1px solid #2c3563", borderRadius: 14, padding: 28, textAlign: "center" }}>
          Nothing here yet. <Link href="/" style={{ color: "#ffb020" }}>Play {mode === "daily" ? "the Daily" : modeLabel} →</Link>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 56 }}>Rank</th>
              <th style={th}>Player</th>
              {kind === "daily-today" && <th style={thR}>Record</th>}
              {kind === "points" && <><th style={thR}>Points</th><th style={thR}>16-0</th><th style={thR}>Best</th><th style={thR}>Plays</th></>}
              {kind === "agg" && <><th style={thR}>16-0</th><th style={thR}>Best</th><th style={thR}>Avg</th><th style={thR}>Plays</th></>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const mine = myHandle && r.handle === myHandle;
              return (
                <tr key={r.handle + i} style={{ borderTop: "1px solid #2c3563", background: mine ? "rgba(255,176,32,.10)" : "transparent" }}>
                  <td style={{ ...td, fontWeight: 800 }}>{medal(i)}</td>
                  <td style={{ ...td, fontWeight: mine ? 800 : 600 }}>
                    {r.handle}{mine ? <span style={{ color: "#ffb020", fontSize: 12, marginLeft: 6 }}>you</span> : null}
                  </td>
                  {kind === "daily-today" && (
                    <td style={{ ...numTd, fontWeight: 800, color: r.wins === 16 ? "#ffcf45" : "#eaf0ff" }}>{r.wins}-{r.losses}</td>
                  )}
                  {kind === "points" && (
                    <>
                      <td style={{ ...numTd, fontWeight: 800, color: "#ffb020" }}>{Number(r.total_points).toFixed(1)}</td>
                      <td style={{ ...numTd, color: r.perfects > 0 ? "#ffcf45" : "#7c88b0" }}>{r.perfects}</td>
                      <td style={numTd}>{r.best}-{16 - r.best}</td>
                      <td style={{ ...numTd, color: "#9aa6cf" }}>{r.plays}</td>
                    </>
                  )}
                  {kind === "agg" && (
                    <>
                      <td style={{ ...numTd, fontWeight: 800, color: r.perfects > 0 ? "#ffcf45" : "#7c88b0" }}>{r.perfects}</td>
                      <td style={numTd}>{r.best}-{16 - r.best}</td>
                      <td style={numTd}>{Number(r.avg_wins).toFixed(1)}</td>
                      <td style={{ ...numTd, color: "#9aa6cf" }}>{r.plays}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p style={{ color: "#67719c", fontSize: 12, marginTop: 18 }}>
        {mode === "daily"
          ? "Daily ranks everyone on the same shared draft each day."
          : "Classic & IQ are unlimited free play — each game adds points (match wins + your team's combined strength), so stronger teams and more plays both climb."}
      </p>
    </main>
  );
}
