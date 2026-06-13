/**
 * Lightweight in-memory token-bucket rate limiter for Next.js API routes.
 * Each IP gets its own bucket. Works in serverless environments where the
 * process stays alive long enough to be useful (Vercel keeps instances warm).
 *
 * Usage:
 *   const { ok, remaining } = rateLimit(req, { limit: 5, windowMs: 60_000 });
 *   if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

/** @type {Map<string, { count: number; resetAt: number }>} */
const store = new Map();

/**
 * @param {Request} req
 * @param {{ limit?: number; windowMs?: number }} opts
 * @returns {{ ok: boolean; remaining: number }}
 */
export function rateLimit(req, { limit = 10, windowMs = 60_000 } = {}) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  return { ok: entry.count <= limit, remaining };
}
