import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateFreeplay } from "@/lib/validate";
import { istDay } from "@/lib/day";
import { rateLimit } from "@/lib/rateLimit";

// Records a completed Classic/IQ game for the leaderboards. Server re-validates the XI and recomputes
// wins + team strength + points — the client-reported score is never trusted.
export async function POST(req) {
  // 20 requests per minute per IP — free play can be rapid but caps abuse
  const { ok: rl } = rateLimit(req, { limit: 20, windowMs: 60_000 });
  if (!rl) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad body" }, { status: 400 }); }

  const v = validateFreeplay({ mode: body.mode, xi: body.xi, captainId: body.captainId });
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const day = istDay();
  const admin = supabaseAdmin();

  const { error } = await admin.from("freeplay_results").insert({
    user_id: user.id, mode: body.mode, day,
    wins: v.wins, losses: v.losses, strength: v.strength, points: v.points,
    xi: body.xi, captain_id: body.captainId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ saved: true, mode: body.mode, wins: v.wins, points: v.points });
}
