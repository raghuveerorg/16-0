// Served at /sitemap.xml by the App Router metadata convention.
export default function sitemap() {
  const now = new Date();
  return [
    { url: "https://16-0.in/", lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: "https://16-0.in/leaderboard", lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];
}
