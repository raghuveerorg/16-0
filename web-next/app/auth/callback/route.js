import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// OAuth / magic-link redirect target: exchanges the code for a session cookie, then returns home.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    try { await supabaseServer().auth.exchangeCodeForSession(code); } catch {}
  }
  return NextResponse.redirect(origin);
}
