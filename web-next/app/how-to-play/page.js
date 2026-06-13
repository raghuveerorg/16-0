import Link from "next/link";

export const metadata = {
  title: "How to Play 16-0 — T20 Cricket Draft Game Guide",
  description:
    "Learn how to play 16-0: pick an all-time T20 cricket XI using real season stats, choose a captain, and simulate a 16-game unbeaten season. Full rules, tips, and FAQ.",
  alternates: { canonical: "/how-to-play" },
  openGraph: {
    title: "How to Play 16-0 — T20 Cricket Draft Game Guide",
    description:
      "Full rules and tips for 16-0 — the T20 cricket draft game where you build an all-time XI and chase a perfect 16-0 season.",
    url: "/how-to-play",
  },
};

const JSON_LD_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How many players do I draft?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You draft exactly 11 players across 11 rounds. Each round locks a specific role and season — every position must come from a different year.",
      },
    },
    {
      "@type": "Question",
      name: "How many overseas players can I pick?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can pick a maximum of 4 overseas players in your XI. The game enforces this limit automatically during drafting.",
      },
    },
    {
      "@type": "Question",
      name: "Can the same player appear twice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — the same player can appear in different seasons. For example, you could pick a batsman's 2016 season and the same player's 2019 season if different slots allow it.",
      },
    },
    {
      "@type": "Question",
      name: "What does the engine use to simulate results?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The simulation engine uses each player's real ball-by-ball stats for that specific season. Batting power, bowling power, and overall balance all affect your win probability. Both batting and bowling need to fire together for a 16-0 run.",
      },
    },
    {
      "@type": "Question",
      name: "What is the re-roll / skip for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Each game gives you 2 re-rolls. Use them to re-draw the season for the current slot if the assigned year doesn't suit your strategy. Use them wisely — they don't refresh between rounds.",
      },
    },
  ],
};

const STEPS = [
  {
    num: "01",
    title: "A slot opens with a role + season",
    body: "Each of the 11 rounds reveals a position (e.g. Opener, Keeper, Spinner, Pacer) and a specific T20 season year. Every slot in your XI must come from a different season — no two players share a year.",
  },
  {
    num: "02",
    title: "Choose your player for that slot",
    body: "In Classic and Daily modes, you see real player cards with their batting and bowling stats for that exact season. In Cricket IQ mode, stats are hidden — names and teams only. Pick wisely.",
  },
  {
    num: "03",
    title: "Manage your overseas quota",
    body: "Hard rule: maximum 4 overseas players in your XI. The overseas counter is always visible in the HUD. Blowing it on big names early can leave you short later — balance is key.",
  },
  {
    num: "04",
    title: "Use re-rolls strategically",
    body: "You get 2 re-rolls per game. Each one re-draws the season for the current slot. Save them for high-value positions like all-rounders and captains where the year matters most.",
  },
  {
    num: "05",
    title: "Name your captain",
    body: "After all 11 slots are filled, you pick a captain from your XI. A great leader adds a clutch multiplier — it can be the difference between 15-1 and 16-0.",
  },
  {
    num: "06",
    title: "Simulate the season",
    body: "The engine plays 16 matches using your players' real season stats. Batting power, bowling power, and balance all factor in. A lopsided XI caps your ceiling — you need both ends of the team to fire.",
  },
];

const MODES = [
  {
    label: "Daily Challenge",
    badge: "DAILY",
    desc: "Everyone gets the same draft draw each day. One attempt per day. Sign in to track your streak and rank on the leaderboard against every other player worldwide.",
  },
  {
    label: "Classic Free Play",
    badge: "CLASSIC",
    desc: "Fresh random draft every game. Full player stats visible. No limit on plays — perfect for experimenting with different eras and strategies until you crack the 16-0.",
  },
  {
    label: "Cricket IQ Mode",
    badge: "IQ MODE",
    desc: "No stats. Just names and teams. This is the connoisseur's mode — pure cricket knowledge, no crutch. If you can go 16-0 here, you genuinely know your T20 cricket.",
  },
];

const TIPS = [
  "All-rounders are the most valuable picks — a player who contributes both bat and ball lifts both your power bars simultaneously.",
  "Balance overseas slots across batting and bowling. Blowing all 4 on batsmen leaves your bowling thin.",
  "Your captain multiplier is meaningful. Pick a player with strong all-round stats, not just the flashiest name.",
  "In IQ mode, prioritize players who had consistently strong T20 seasons across multiple years — you're likely to see them in multiple slots.",
  "In Classic mode, pay attention to the balance bar, not just raw batting or bowling power. A lopsided XI rarely goes 16-0.",
];

export default function HowToPlay() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_FAQ) }}
      />
      <main className="wrap" style={{ paddingTop: 8 }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/" style={{ color: "var(--mut)", fontSize: 13, textDecoration: "none" }}>
            ← Play
          </Link>
        </div>

        {/* Hero */}
        <header style={{ textAlign: "center", paddingBottom: 32 }}>
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(28px, 6vw, 42px)",
              fontWeight: 900,
              background: "linear-gradient(90deg, var(--acc), var(--acc2))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1.1,
            }}
          >
            How to Play 16-0
          </h1>
          <p style={{ color: "var(--mut)", fontSize: 16, margin: "0 auto", maxWidth: 520 }}>
            The T20 cricket draft game — build an all-time XI from real season stats and chase a
            perfect 16-game unbeaten season.
          </p>
        </header>

        {/* Step-by-step */}
        <section aria-labelledby="steps-heading">
          <h2
            id="steps-heading"
            style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "var(--txt)" }}
          >
            Step-by-step
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS.map((s) => (
              <div
                key={s.num}
                style={{
                  background: "linear-gradient(135deg, var(--card2), var(--card))",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "var(--acc2)",
                    lineHeight: 1,
                    flexShrink: 0,
                    minWidth: 28,
                  }}
                >
                  {s.num}
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: "var(--mut)", fontSize: 13.5, lineHeight: 1.55 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Game modes */}
        <section aria-labelledby="modes-heading" style={{ marginTop: 40 }}>
          <h2
            id="modes-heading"
            style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "var(--txt)" }}
          >
            Game modes
          </h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {MODES.map((m) => (
              <div
                key={m.label}
                style={{
                  flex: "1 1 220px",
                  background: "linear-gradient(135deg, var(--card2), var(--card))",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--acc2)",
                    border: "1px dashed var(--acc2)",
                    borderRadius: 999,
                    padding: "2px 9px",
                    marginBottom: 8,
                  }}
                >
                  {m.badge}
                </span>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>{m.label}</h3>
                <p style={{ margin: 0, color: "var(--mut)", fontSize: 13.5, lineHeight: 1.55 }}>
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section aria-labelledby="tips-heading" style={{ marginTop: 40 }}>
          <h2
            id="tips-heading"
            style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "var(--txt)" }}
          >
            Tips for going 16-0
          </h2>
          <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {TIPS.map((tip, i) => (
              <li
                key={i}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  color: "var(--mut)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ color: "var(--acc)", fontWeight: 900, flexShrink: 0 }}>🏏</span>
                {tip}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" style={{ marginTop: 40 }}>
          <h2
            id="faq-heading"
            style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "var(--txt)" }}
          >
            Frequently asked questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {JSON_LD_FAQ.mainEntity.map((q) => (
              <details
                key={q.name}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <summary
                  style={{
                    fontWeight: 700,
                    fontSize: 14.5,
                    cursor: "pointer",
                    color: "var(--txt)",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {q.name}
                  <span style={{ color: "var(--acc2)", fontSize: 18, flexShrink: 0 }}>+</span>
                </summary>
                <p
                  style={{
                    margin: "10px 0 0",
                    color: "var(--mut)",
                    fontSize: 13.5,
                    lineHeight: 1.6,
                  }}
                >
                  {q.acceptedAnswer.text}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: 48, paddingBottom: 16 }}>
          <Link href="/" className="btn big">
            🏏 Start playing — it&apos;s free
          </Link>
        </div>
      </main>
    </>
  );
}
