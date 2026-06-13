// Served at /sitemap.xml by the App Router metadata convention.
export default function sitemap() {
  const now = new Date();
  return [
    { url: "https://16-0.in/", lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: "https://16-0.in/leaderboard", lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: "https://16-0.in/how-to-play", lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://16-0.in/privacy-policy", lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://16-0.in/terms-of-use", lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
