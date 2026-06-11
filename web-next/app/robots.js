// Served at /robots.txt by the App Router metadata convention.
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/profile"] }],
    sitemap: "https://16-0.in/sitemap.xml",
  };
}
