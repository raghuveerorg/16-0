import { ImageResponse } from "next/og";

// Social share card for link previews (WhatsApp / X / iMessage). Served at /opengraph-image and
// referenced automatically from the page metadata.
export const runtime = "edge";
export const alt = "16-0 — draft an all-time Club T20 XI and chase a perfect 16-0";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a2142 0%, #0c1020 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 14, background: "linear-gradient(90deg, #ff5a36, #ffb020)", display: "flex" }} />
        <div style={{ fontSize: 200, fontWeight: 900, color: "#ffb020", letterSpacing: -6, lineHeight: 1, display: "flex" }}>
          16-0
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, color: "#eaf0ff", marginTop: 24, display: "flex" }}>
          Can your all-time Club T20 XI go unbeaten?
        </div>
        <div style={{ fontSize: 24, fontWeight: 600, color: "#9aa6cf", marginTop: 16, display: "flex" }}>
          Draft 11 legends 🏏 Name a captain · Win all 16 games
        </div>
        <div style={{ position: "absolute", bottom: 28, fontSize: 20, fontWeight: 700, color: "#ff5a36", display: "flex" }}>
          16-0.in · new draft every day
        </div>
      </div>
    ),
    size
  );
}
