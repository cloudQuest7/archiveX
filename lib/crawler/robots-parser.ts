import { isHttpOrHttps } from "./url-normalizer";

export async function fetchRobotsSitemaps(
  baseUrl: string,
  timeoutMs: number
): Promise<string[]> {
  const sitemaps: string[] = [];
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ArchiveBot/1.0 (+https://example.local)" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return sitemaps;
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      const m = /^Sitemap:\s*(.+)$/i.exec(line);
      if (m) {
        const url = m[1].trim();
        if (isHttpOrHttps(url)) sitemaps.push(url);
      }
    }
  } catch {
    /* ignore */
  }
  return sitemaps;
}
