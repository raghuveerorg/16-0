import "./game.css";
import AuthBar from "@/components/AuthBar";

const TITLE = "16-0 — Can your all-time T20 Cricket XI go unbeaten?";
const DESC = "Pick an all-time T20 cricket XI from real player stats, name a captain, and simulate a 16-game season. Can you go unbeaten? Free daily challenge + Cricket IQ mode.";

export const metadata = {
  metadataBase: new URL("https://16-0.in"),
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "/",
    siteName: "16-0",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export const viewport = {
  themeColor: "#0c1020",
};

const JSON_LD_APP = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "16-0",
  url: "https://16-0.in",
  description: DESC,
  applicationCategory: "GameApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
};

const JSON_LD_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is 16-0?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "16-0 is a free online T20 cricket draft game where you pick an all-time XI from real player stats, choose a captain, and simulate a 16-game season. The goal is to go unbeaten — 16-0.",
      },
    },
    {
      "@type": "Question",
      name: "How do you play 16-0?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Across 11 rounds, each slot locks a role (e.g. Opener, Keeper, Pacer) and a specific T20 season. You pick the best player for that role in that season. You can pick max 4 overseas players. Once you've chosen all 11 and named a captain, the engine simulates 16 matches using real season stats.",
      },
    },
    {
      "@type": "Question",
      name: "What is Cricket IQ mode?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cricket IQ mode hides all player stats — you see only names and teams. It tests your pure cricket knowledge, challenging you to pick the best T20 XI without any statistical help.",
      },
    },
    {
      "@type": "Question",
      name: "What is the Daily Challenge?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Daily Challenge gives every player the same draft slots each day — one attempt per day. Sign in to save your streak, see your rank on the leaderboard, and compare your XI against everyone else who played.",
      },
    },
    {
      "@type": "Question",
      name: "Is 16-0 free to play?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, 16-0 is completely free. The Daily Challenge and Classic Free Play modes require no sign-in. You can optionally create a free account to save your daily streak and appear on the leaderboard.",
      },
    },
  ],
};

// Runs before first paint — reads saved theme from localStorage and sets data-theme on <html>
// so there's no dark→light flash on load. Must be a plain string (no JSX), executed inline.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('16-0-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){}})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_APP) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_FAQ) }} />
        <AuthBar />
        {children}
      </body>
    </html>
  );
}
