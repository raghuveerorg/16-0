import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "alltime", label: "All-time" },
];

const ymd = (d) => d.toISOString().slice(0, 10);
const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

export default async function Leaderboard({ searchParams }) {
  const tab = TABS.some((t) => t.key === searchParams?.tab) ? searchParams.tab : "today";
  const sb = supabaseServer();

  const { data: { user } } = await sb.auth.getUser();
  let myHandle = null;
  if (user) {
    const { data: prof } = await sb.from("profiles").select("handle").eq("id", user.id).maybeSingle();
    myHandle = prof?.handle ?? null;
  }

  const today = ymd(new Date());
  const weekFrom = ymd(new Date(Date.now() - 6 * 86400000));

  let rows = [];
  if (tab === "today") {
    const { data } = await sb.rpc("daily_leaderboard", { p_day: today, p_limit: 100 });
    rows = data ?? [];
  } else {
    const args = tab === "week"
      ? { p_from: weekFrom, p_to: today, p_limit: 100 }
      : { p_from: null, p_to: null, p_limit: 100 };
    const { data } = await sb.rpc("agg_leaderboard", args);
    rows = data ?? [];
  }

  // styles
  const wrap = { maxWidth: 760, margin: "0 auto", padding: "24px 16px", color: "#eaf0ff", fontFamily: "system-ui, sans-serif" };
  const tabsBar = { display: "flex", gap: 8, margin: "14px 0 18px", flexWrap: "wrap" };
  const tabStyle = (active) => ({
    padding: "8px 16px", borderRadius: 999, fontWeight: 800, fontSize: 14, textDecoration: "none",
    color: active ? "#180a06" : "#eaf0ff",
    background: active ? "linear-gradient(90deg,#ff5a36,#ffb020)" : "transparent",
    border: active ? "0" : "1px solid #2c3563",
  });
  const th = { padding: "10px 8px", textAlign: "left", color: "#9aa6cf", fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em" };
  const td = { padding: "10px 8px" };
  const numTd = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const isDaily = tab === "today";
  const subtitle = isDaily ? `Daily Challenge · ${today} (UTC)` : tab === "week" ? `Last 7 days · ${weekFrom} → ${today}` : "Every Daily Challenge, all-time";

  return (
    <main style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ color: "#ffb020", textDecoration: "none", fontWeight: 700 }}>← Play</Link>
        <Link href="/profile" style={{ color: "#ffb020", textDecoration: "none", fontWeight: 700 }}>My streak & history</Link>
      </div>

      <h1 style={{ margin: "14px 0 2px", fontSize: 30 }}>Leaderboard</h1>
      <div style={{ color: "#9aa6cf", fontSize: 14 }}>{subtitle}</div>

      <div style={tabsBar}>
        {TABS.map((t) => (
          <Link key={t.key} href={`/leaderboard?tab=${t.key}`} style={tabStyle(t.key === tab)}>{t.label}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ color: "#9aa6cf", background: "#161c38", border: "1px solid #2c3563", borderRadius: 14, padding: 28, textAlign: "center" }}>
          {isDaily
            ? <>No scores yet today. <Link href="/" style={{ color: "#ffb020" }}>Be the first to play the Daily →</Link></>
            : <>Nothing here yet. <Link href="/" style={{ color: "#ffb020" }}>Play a Daily Challenge →</Link></>}
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 56 }}>Rank</th>
              <th style={th}>Player</th>
              {isDaily ? (
                <th style={{ ...th, textAlign: "right" }}>Record</th>
              ) : (
                <>
                  <th style={{ ...th, textAlign: "right" }}>16-0</th>
                  <th style={{ ...th, textAlign: "right" }}>Best</th>
                  <th style={{ ...th, textAlign: "right" }}>Avg</th>
                  <th style={{ ...th, textAlign: "right" }}>Plays</th>
                </>
              )}
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
                  {isDaily ? (
                    <td style={{ ...numTd, fontWeight: 800, color: r.wins === 16 ? "#ffcf45" : "#eaf0ff" }}>{r.wins}-{r.losses}</td>
                  ) : (
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
        Rankings come from the Daily Challenge — everyone gets the same draft each day. All-time and weekly boards rank by perfect 16-0 runs, then total wins.
      </p>
    </main>
  );
}
