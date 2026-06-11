// The Daily Challenge day flips at midnight IST (UTC+5:30) — matches ENGINE.dailyKey() in the game.
export const IST_OFFSET_MS = 330 * 60000;

// Today's (or the given instant's) Daily key, e.g. "2026-06-12".
export const istDay = (d = new Date()) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
