import "./game.css";
import AuthBar from "@/components/AuthBar";

export const metadata = {
  title: "16-0 — Can your all-time Club T20 XI go unbeaten?",
  description: "Draft an all-time Club T20 XI and chase a perfect 16-0.",
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
