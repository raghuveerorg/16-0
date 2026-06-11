// Streak from a set of played day-strings ("YYYY-MM-DD"). Pure + timezone-agnostic (caller passes
// "today" as a day-string in whatever zone it considers the day boundary). Mirrors the SQL user_streak.
function addDays(d, n) { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
function diffDays(a, b) { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000); }

function computeStreak(dates, today) {
  const set = new Set(dates);
  const sorted = [...set].sort();
  if (!sorted.length) return { current: 0, longest: 0, last: null };

  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = diffDays(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Current streak counts back from today; if today isn't played yet, count back from yesterday
  // (so a streak isn't shown broken just because the user hasn't played today's daily yet).
  let anchor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  if (set.has(anchor)) { current = 1; for (let d = addDays(anchor, -1); set.has(d); d = addDays(d, -1)) current++; }

  return { current, longest, last: sorted[sorted.length - 1] };
}

module.exports = { computeStreak, addDays, diffDays };
