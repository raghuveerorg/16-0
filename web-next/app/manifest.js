// Served at /manifest.webmanifest by the App Router metadata convention — makes the daily game
// installable to the home screen.
export default function manifest() {
  return {
    name: "16-0 — All-time Club T20 Unbeaten Challenge",
    short_name: "16-0",
    description: "Draft an all-time Club T20 XI and chase a perfect 16-0. New draft every day.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c1020",
    theme_color: "#0c1020",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
