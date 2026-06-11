// Client helper: POST a completed Daily result to the backend for validation + recording.
export async function submitDaily({ day, xi, captainId }) {
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ day, xi, captainId }),
  });
  if (res.status === 401) return { needsAuth: true }; // signed out → prompt to sign in
  if (!res.ok) return null;
  return res.json(); // { wins, losses, rank:{rank,total}, streak:{current_streak,longest_streak} }
}

// Record a completed Classic/IQ game for the free-play leaderboards.
export async function submitFreeplay({ mode, xi, captainId }) {
  try {
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
