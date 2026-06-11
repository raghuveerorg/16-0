import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Authoritative "have I already played today?" check. The client uses this to block a second daily
// play for a signed-in user even on a fresh browser / cleared local storage.
export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ authed: false, played: false });

  const day = new Date().toISOString().slice(0, 10); // server UTC day, same as submit
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } }
  );

  const { data: row } = await admin
    .from("daily_results")
    .select("wins,losses,xi,captain_id")
    .eq("user_id", user.id)
    .eq("day", day)
    .maybeSingle();

  if (!row) return NextResponse.json({ authed: true, played: false });

  const { data: rank } = await admin.rpc("day_rank", { p_user: user.id, p_day: day });
  const { data: streak } = await admin.rpc("user_streak", { p_user: user.id });
  return NextResponse.json({
    authed: true, played: true,
    wins: row.wins, losses: row.losses, xi: row.xi, captainId: row.captain_id,
    rank: rank?.[0] ?? null, streak: streak?.[0] ?? null,
  });
}
