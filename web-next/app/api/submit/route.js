import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateSubmission } from "@/lib/validate";
import { istDay } from "@/lib/day";
import { rateLimit } from "@/lib/rateLimit";

// The ONLY write path for daily_results. Verifies the signed-in user, re-derives the day's deal,
// re-validates the submitted XI, recomputes the score server-side, then inserts with the service role.
export async function POST(req) {
  // 5 requests per minute per IP — daily submit should fire at most once per day
  const { ok: rl } = rateLimit(req, { limit: 5, windowMs: 60_000 });
  if (!rl) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad body" }, { status: 400 }); }

  const day = istDay(); // server's IST day — ignore any client-supplied day
  const v = validateSubmission({ day, xi: body.xi, captainId: body.captainId });
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const admin = supabaseAdmin();

  const { error } = await admin.from("daily_results").insert({
    user_id: user.id, day, wins: v.wins, losses: v.losses, xi: body.xi, captain_id: body.captainId,
  });
  // unique(user_id, day) → second attempt the same day is a no-op (one play per day, enforced by the DB)
  const dup = error && String(error.message).toLowerCase().includes("duplicate");
  if (error && !dup) return NextResponse.json({ error: error.message }, { status: 400 });

  // On a duplicate, the FIRST play stands — report its stored score, not this new attempt.
  let wins = v.wins, losses = v.losses;
  if (dup) {
    const { data: existing } = await admin.from("daily_results")
      .select("wins,losses").eq("user_id", user.id).eq("day", day).maybeSingle();
    if (existing) { wins = existing.wins; losses = existing.losses; }
  }

  const { data: rank } = await admin.rpc("day_rank", { p_user: user.id, p_day: day });
  const { data: streak } = await admin.rpc("user_streak", { p_user: user.id });
  return NextResponse.json({ wins, losses, rank: rank?.[0] ?? null, streak: streak?.[0] ?? null });
}
