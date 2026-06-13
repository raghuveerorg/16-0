import Link from "next/link";

export const metadata = {
  title: "Terms of Use — 16-0",
  description: "Terms of use for 16-0.in — the T20 cricket draft game. Rules for using the site and service.",
  alternates: { canonical: "/terms-of-use" },
};

const LAST_UPDATED = "June 2025";

export default function TermsOfUse() {
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
        Terms of Use
      </h1>
      <p style={{ color: "var(--mut)", fontSize: 13, margin: "0 0 32px" }}>
        Last updated: {LAST_UPDATED}
      </p>

      <p style={p}>
        By using <strong style={{ color: "var(--txt)" }}>16-0.in</strong>, you agree to these terms.
        If you do not agree, please do not use the site.
      </p>

      <h2 style={h2}>What 16-0 is</h2>
      <p style={p}>
        16-0 is an independent, unofficial fan project. It is a free online T20 cricket simulation
        game using publicly available ball-by-ball player data. It is{" "}
        <strong style={{ color: "var(--txt)" }}>
          not affiliated with, endorsed by, or sponsored by the BCCI, any T20 league, or any cricket
          franchise.
        </strong>{" "}
        All league and team names are the property of their respective owners.
      </p>

      <h2 style={h2}>Use of the service</h2>
      <ul style={ul}>
        <li>16-0 is free to use for personal, non-commercial enjoyment.</li>
        <li>You must not attempt to reverse-engineer, scrape, or automate gameplay.</li>
        <li>You must not attempt to manipulate leaderboards or game outcomes.</li>
        <li>
          You must not use the site in any way that could harm or interfere with other players&apos;
          experience.
        </li>
      </ul>

      <h2 style={h2}>Accounts and handles</h2>
      <p style={p}>
        When you create an account you choose a public display handle. Your handle appears on
        leaderboards. You are responsible for your handle — offensive, impersonating, or
        inappropriate handles may be removed without notice.
      </p>

      <h2 style={h2}>Player data</h2>
      <p style={p}>
        Player names and statistics are derived from publicly available ball-by-ball data and are
        used for identification and descriptive purposes only. No commercial use is claimed. If you
        are a rights holder with a concern, please contact us.
      </p>

      <h2 style={h2}>Intellectual property</h2>
      <p style={p}>
        The 16-0 game design, code, visual assets, and branding are the property of the 16-0
        project. You may share screenshots and results for personal, non-commercial purposes with
        attribution.
      </p>

      <h2 style={h2}>Disclaimers</h2>
      <p style={p}>
        The game is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
        uptime or availability. Simulation results are entertainment only and do not reflect
        real-world sporting outcomes.
      </p>

      <h2 style={h2}>Changes</h2>
      <p style={p}>
        We may update these terms at any time. Continued use of the site constitutes acceptance of
        updated terms.
      </p>

      <h2 style={h2}>Contact</h2>
      <p style={p}>
        For questions or rights-holder concerns, use the feedback link in the game footer.
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
        <Link href="/privacy-policy" style={{ color: "var(--acc2)", fontSize: 13 }}>
          Privacy Policy
        </Link>
        <Link href="/" style={{ color: "var(--mut)", fontSize: 13 }}>
          ← Back to game
        </Link>
      </div>
    </main>
  );
}
