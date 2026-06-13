"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log to console in dev; swap for Sentry/LogRocket in production
    console.error("[16-0 error boundary]", error);
  }, [error]);

  return (
    <main
      style={{
        maxWidth: 520,
        margin: "80px auto",
        padding: "0 24px",
        textAlign: "center",
        color: "var(--txt)",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>😬</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>
        Something went wrong
      </h2>
      <p style={{ color: "var(--mut)", fontSize: 15, margin: "0 0 28px" }}>
        An unexpected error occurred. You can try again or head back to the game.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={reset}
          style={{
            background: "var(--acc)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "var(--card2)",
            color: "var(--txt)",
            textDecoration: "none",
            borderRadius: 10,
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Back to game
        </Link>
      </div>
    </main>
  );
}
