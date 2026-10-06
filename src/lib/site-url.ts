export function siteUrl(configuredUrl = process.env.NEXT_PUBLIC_SITE_URL, production = process.env.NODE_ENV === "production") {
  const fallback = new URL("https://www.bravometro.com");
  if (!configuredUrl) return fallback;
  try {
    const url = new URL(configuredUrl);
    const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "0.0.0.0";
    if (!["http:", "https:"].includes(url.protocol) || (production && local)) return fallback;
    return new URL(url.origin);
  } catch {
    return fallback;
  }
}
