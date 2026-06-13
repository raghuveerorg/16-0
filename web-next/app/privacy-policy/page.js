import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — 16-0",
  description: "Privacy policy for 16-0.in — the T20 cricket draft game. How we collect, use, and protect your data.",
  alternates: { canonical: "/privacy-policy" },
};

const LAST_UPDATED = "June 2025";

export default function PrivacyPolicy() {
  const h2 = { fontSize: 17, fontWeight: 800, margin: "28px 0 8px", color: "var(--txt)" };
  const p = { color: "var(--mut)", fontSize: 14, lineHeight: 1.7, margin: "0 0 10px" };
  const ul = { color: "var(--mut)", fontSize: 14, lineHeight: 1.7, paddingLeft: 20, margin: "0 0 10px" };

  return (
    <main className="wrap" style={{ paddingTop: 8, maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: "var(--mut)", fontSize: 13, textDecoration: "none" }}>
          ← Play
        </Link>
      </div>

      <h1 style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 900, margin: "0 0 6px" }}>
        Privacy Policy
      </h1>
      <p style={{ color: "var(--mut)", fontSize: 13, margin: "0 0 32px" }}>
        Last updated: {LAST_UPDATED}
      </p>

      <p style={p}>
        16-0 (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website{" "}
        <strong style={{ color: "var(--txt)" }}>16-0.in</strong>. This policy explains what data we
        collect, how we use it, and your rights.
      </p>

      <h2 style={h2}>What data we collect</h2>
      <ul style={ul}>
        <li>
          <strong style={{ color: "var(--txt)" }}>Account data</strong> — if you sign in via Google
          OAuth or magic link email, we store your email address, a unique user ID, and your chosen
          display handle.
        </li>
        <li>
          <strong style={{ color: "var(--txt)" }}>Game data</strong> — your daily challenge results,
          win/loss record, drafted XI, captain choice, and game mode (Daily, Classic, Cricket IQ).
        </li>
        <li>
          <strong style={{ color: "var(--txt)" }}>Streak &amp; leaderboard data</strong> — your
          daily play streak and public leaderboard rank, linked to your display handle.
        </li>
        <li>
          <strong style={{ color: "var(--txt)" }}>Local storage</strong> — we use browser local
          storage to cache your daily result and theme preference. No cookies are set for tracking.
        </li>
      </ul>

      <h2 style={h2}>How we use your data</h2>
      <ul style={ul}>
        <li>To authenticate you and associate your results with your account.</li>
        <li>To display daily and all-time leaderboards using your public handle.</li>
        <li>To maintain your play streak across sessions.</li>
        <li>We do not sell your data. We do not use it for advertising.</li>
      </ul>

      <h2 style={h2}>Third-party services</h2>
      <p style={p}>
        We use <strong style={{ color: "var(--txt)" }}>Supabase</strong> for authentication and
        database storage. Data is stored on Supabase infrastructure subject to their{" "}
        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
          privacy policy
        </a>
        . Sign-in via Google is subject to{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google&apos;s privacy policy
        </a>
        .
      </p>

      <h2 style={h2}>Guest play</h2>
      <p style={p}>
        You can play Classic Free Play mode without signing in. In that case, no account data is
        collected. Game state is stored only in your browser&apos;s local storage.
      </p>

      <h2 style={h2}>Data retention &amp; deletion</h2>
      <p style={p}>
        You can request deletion of your account and associated data at any time by emailing us. We
        will process deletion requests within 30 days.
      </p>

      <h2 style={h2}>Children</h2>
      <p style={p}>
        16-0 is not directed at children under 13. We do not knowingly collect personal data from
        children under 13.
      </p>

      <h2 style={h2}>Changes to this policy</h2>
      <p style={p}>
        We may update this policy occasionally. Continued use of the site after changes constitutes
        acceptance of the updated policy.
      </p>

      <h2 style={h2}>Contact</h2>
      <p style={p}>
        Questions about this policy? Reach us via the feedback link in the game footer.
      </p>

      <div
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link href="/terms-of-use" style={{ color: "var(--acc2)", fontSize: 13 }}>
          Terms of Use
        </Link>
        <Link href="/" style={{ color: "var(--mut)", fontSize: 13 }}>
          ← Back to game
        </Link>
      </div>
    </main>
  );
}
