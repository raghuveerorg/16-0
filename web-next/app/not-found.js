import Link from "next/link";

export const metadata = { title: "Page not found — 16-0" };

export default function NotFound() {
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
      <div style={{ fontSize: 72, marginBottom: 16 }}>🏏</div>
      <h1 style={{ fontSize: 40, fontWeight: 900, margin: "0 0 8px", color: "var(--acc2)" }}>
        404
      </h1>
      <p style={{ color: "var(--mut)", fontSize: 16, margin: "0 0 32px" }}>
        This page doesn&apos;t exist — maybe you went for a yorker and missed.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          background: "var(--acc)",
          color: "#fff",
          textDecoration: "none",
          borderRadius: 10,
          padding: "12px 28px",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        Back to the game
      </Link>
    </main>
  );
}
