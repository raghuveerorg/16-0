import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { validateFreeplay } from "@/lib/validate";
import { istDay } from "@/lib/day";

// Records a completed Classic/IQ game for the leaderboards. Server re-validates the XI and recomputes
// wins + team strength + points — the client-reported score is never trusted.
export async function POST(req) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad body" }, { status: 400 }); }

  const v = validateFreeplay({ mode: body.mode, xi: body.xi, captainId: body.captainId });
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const day = istDay();
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } }
  );

  const { error } = await admin.from("freeplay_results").insert({
    user_id: user.id, mode: body.mode, day,
    wins: v.wins, losses: v.losses, strength: v.strength, points: v.points,
    xi: body.xi, captain_id: body.captainId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ saved: true, mode: body.mode, wins: v.wins, points: v.points });
}
