import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { istDay } from "@/lib/day";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard — 16-0",
  description: "Daily, Classic and Cricket IQ leaderboards. See who went 16-0 today.",
  alternates: { canonical: "/leaderboard" },
};

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

const ymd = (d) => istDay(d); // Daily days are IST-keyed
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

  const today = istDay();
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

  const modeLabel = MODES.find((m) => m.key === mode).label;
  const winLabel = WINDOWS.find((w) => w.key === win).label;
  const subtitle = mode === "daily"
    ? (win === "today" ? `${today} · IST` : winLabel)
    : `${modeLabel} · ${winLabel} · points = wins + strength`;

  // ── shared style tokens ──
  const chip = (active) => ({
    padding: "5px 14px", borderRadius: 6, fontWeight: 700, fontSize: 13,
    textDecoration: "none", whiteSpace: "nowrap",
    color: active ? "var(--bg)" : "var(--mut)",
    background: active ? "var(--acc)" : "transparent",
    border: `1px solid ${active ? "var(--acc)" : "var(--line)"}`,
  });
  const num = { fontVariantNumeric: "tabular-nums", fontWeight: 700 };
  const muted = { color: "var(--mut)", fontSize: 12 };

  const rankEl = (i) => {
    if (i === 0) return <span style={{ fontSize: 18 }}>🥇</span>;
    if (i === 1) return <span style={{ fontSize: 18 }}>🥈</span>;
    if (i === 2) return <span style={{ fontSize: 18 }}>🥉</span>;
    return <span style={{ ...muted, fontWeight: 700 }}>#{i + 1}</span>;
  };

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px", color: "var(--txt)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Leaderboard</h1>
        <span style={muted}>{subtitle}</span>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "16px 0 8px" }}>
        {MODES.map((m) => (
          <Link key={m.key} href={`/leaderboard?mode=${m.key}&tab=${win}`} style={chip(m.key === mode)}>{m.label}</Link>
        ))}
      </div>

      {/* Window tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {WINDOWS.map((w) => (
          <Link key={w.key} href={`/leaderboard?mode=${mode}&tab=${w.key}`} style={chip(w.key === win)}>{w.label}</Link>
        ))}
      </div>

      {/* Column header */}
      {rows.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", padding: "0 0 8px", borderBottom: "1px solid var(--line)" }}>
          <span style={{ width: 44, ...muted }}>Rank</span>
          <span style={{ flex: 1, ...muted }}>Player</span>
          {kind === "daily-today" && <span style={{ ...muted, minWidth: 64, textAlign: "right" }}>Record</span>}
          {kind === "points" && <>
            <span style={{ ...muted, minWidth: 60, textAlign: "right" }}>Pts</span>
            <span style={{ ...muted, minWidth: 46, textAlign: "right" }}>16-0</span>
            <span style={{ ...muted, minWidth: 52, textAlign: "right" }}>Best</span>
            <span style={{ ...muted, minWidth: 46, textAlign: "right" }}>Plays</span>
          </>}
          {kind === "agg" && <>
            <span style={{ ...muted, minWidth: 46, textAlign: "right" }}>16-0</span>
            <span style={{ ...muted, minWidth: 52, textAlign: "right" }}>Best</span>
            <span style={{ ...muted, minWidth: 46, textAlign: "right" }}>Avg</span>
            <span style={{ ...muted, minWidth: 46, textAlign: "right" }}>Plays</span>
          </>}
        </div>
      )}

      {/* Rows */}
      {rows.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--mut)" }}>
          Nothing here yet.{" "}
          <Link href="/" style={{ color: "var(--acc)", textDecoration: "none", fontWeight: 700 }}>
            Play {mode === "daily" ? "the Daily" : modeLabel} →
          </Link>
        </div>
      ) : rows.map((r, i) => {
        const mine = myHandle && r.handle === myHandle;
        return (
          <div key={r.handle + i} style={{
            display: "flex", alignItems: "center",
            padding: "11px 0",
            borderBottom: "1px solid var(--line)",
            background: mine ? "rgba(var(--acc-rgb, 255,135,20), 0.07)" : "transparent",
            borderLeft: mine ? "3px solid var(--acc)" : "3px solid transparent",
            paddingLeft: mine ? 8 : 0,
            marginLeft: mine ? -11 : 0,
          }}>
            <span style={{ width: 44, display: "flex", alignItems: "center" }}>{rankEl(i)}</span>
            <span style={{ flex: 1, fontWeight: mine ? 800 : 500, fontSize: 15 }}>
              {r.handle}
              {mine && <span style={{ ...muted, marginLeft: 6, color: "var(--acc)" }}>you</span>}
            </span>

            {kind === "daily-today" && (
              <span style={{ ...num, minWidth: 64, textAlign: "right", color: r.wins === 16 ? "var(--acc)" : "var(--txt)", fontSize: 15 }}>
                {r.wins}–{r.losses}
              </span>
            )}
            {kind === "points" && <>
              <span style={{ ...num, minWidth: 60, textAlign: "right", color: "var(--acc)" }}>{Number(r.total_points).toFixed(1)}</span>
              <span style={{ ...num, minWidth: 46, textAlign: "right", color: r.perfects > 0 ? "var(--acc)" : "var(--mut)" }}>{r.perfects}</span>
              <span style={{ ...num, minWidth: 52, textAlign: "right" }}>{r.best}–{16 - r.best}</span>
              <span style={{ ...num, minWidth: 46, textAlign: "right", color: "var(--mut)" }}>{r.plays}</span>
            </>}
            {kind === "agg" && <>
              <span style={{ ...num, minWidth: 46, textAlign: "right", color: r.perfects > 0 ? "var(--acc)" : "var(--mut)" }}>{r.perfects}</span>
              <span style={{ ...num, minWidth: 52, textAlign: "right" }}>{r.best}–{16 - r.best}</span>
              <span style={{ ...num, minWidth: 46, textAlign: "right" }}>{Number(r.avg_wins).toFixed(1)}</span>
              <span style={{ ...num, minWidth: 46, textAlign: "right", color: "var(--mut)" }}>{r.plays}</span>
            </>}
          </div>
        );
      })}

      {rows.length > 0 && (
        <p style={{ ...muted, marginTop: 16 }}>
          {mode === "daily"
            ? "Everyone plays the same draft each day."
            : "Points = match wins × team strength. More plays and stronger picks both climb."}
        </p>
      )}
    </main>
  );
}
