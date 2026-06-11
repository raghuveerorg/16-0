import "./game.css";
import AuthBar from "@/components/AuthBar";

const TITLE = "16-0 — Can your all-time Club T20 XI go unbeaten?";
const DESC = "Draft an all-time Club T20 XI, name a captain and chase a perfect 16-0. Daily challenge, free play and Cricket IQ mode.";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthBar />
        {children}
      </body>
    </html>
  );
}
