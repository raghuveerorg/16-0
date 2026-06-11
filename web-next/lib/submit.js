import { supabaseBrowser } from "@/lib/supabase/client";

// Anonymous play is expected — don't POST (and collect an expected 401 in the console/network tab)
// unless the user is actually signed in. getSession() reads local state; no network round-trip.
async function signedIn() {
  try {
    const { data: { session } } = await supabaseBrowser().auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

// Client helper: POST a completed Daily result to the backend for validation + recording.
export async function submitDaily({ day, xi, captainId }) {
  if (!(await signedIn())) return { needsAuth: true }; // signed out → prompt to sign in, no 401
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ day, xi, captainId }),
  });
  if (res.status === 401) return { needsAuth: true }; // session expired server-side
  if (!res.ok) return null;
  return res.json(); // { wins, losses, rank:{rank,total}, streak:{current_streak,longest_streak} }
}

// Record a completed Classic/IQ game for the free-play leaderboards.
export async function submitFreeplay({ mode, xi, captainId }) {
  try {
    if (!(await signedIn())) return { needsAuth: true }; // anonymous free play → skip quietly
    const res = await fetch("/api/submit-freeplay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, xi, captainId }),
    });
    if (res.status === 401) return { needsAuth: true };
    if (!res.ok) return null;
    return res.json(); // { saved, mode, wins, points }
  } catch {
    return null;
  }
}

// Has the signed-in user already played today? Returns
// { authed, played, wins, losses, xi, captainId, rank, streak } (or null on error).
export async function fetchDailyStatus() {
  try {
    const res = await fetch("/api/daily-status", { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
