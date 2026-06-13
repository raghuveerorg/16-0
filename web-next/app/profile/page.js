import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import HandleEditor from "@/components/HandleEditor";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your record — 16-0" };

export default async function Profile() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  const wrap = { maxWidth: 720, margin: "0 auto", padding: "24px 16px", color: "var(--txt)" };
  if (!user) {
    return <main style={wrap}><p><Link href="/" style={{ color: "var(--acc2)" }}>← Sign in on the game page</Link> to see your history.</p></main>;
  }

  const { data: history } = await sb.rpc("rank_history", { p_user: user.id, p_limit: 60 });
  const { data: s } = await sb.rpc("user_streak", { p_user: user.id });
  const { data: prof } = await sb.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  const streak = s?.[0] ?? { current_streak: 0, longest_streak: 0 };
  const rows = history ?? [];

  return (
    <main style={wrap}>
      <Link href="/" style={{ color: "var(--acc2)", textDecoration: "none" }}>← Back to game</Link>
      <h1 style={{ marginBottom: 4 }}>Your record</h1>
      <HandleEditor userId={user.id} handle={prof?.handle ?? null} />
      <p style={{ fontSize: 18 }}>🔥 Current streak: <b>{streak.current_streak}</b> &nbsp;·&nbsp; Longest: <b>{streak.longest_streak}</b> &nbsp;·&nbsp; {rows.length} dailies played</p>

      <h2 style={{ marginTop: 24 }}>Daily rank history</h2>
      {rows.length === 0 ? (
        <p style={{ color: "var(--mut)" }}>No dailies yet — play today's challenge!</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--mut)", fontSize: 13 }}>
              <th style={{ padding: "8px 6px" }}>Date</th>
              <th style={{ padding: "8px 6px" }}>Record</th>
              <th style={{ padding: "8px 6px" }}>Rank</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "8px 6px" }}>{r.day}</td>
                <td style={{ padding: "8px 6px", fontWeight: 700 }}>{r.wins}-{r.losses}</td>
                <td style={{ padding: "8px 6px" }}>#{r.rank} <span style={{ color: "var(--mut)" }}>of {r.total}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
