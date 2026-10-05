import * as cheerio from "cheerio";
import { normalizeUrl, isHttpOrHttps } from "./url-normalizer";

export type SitemapEntry = {
  url: string;
  normalizedUrl: string;
  lastmod?: string;
};

export async function fetchAndParseSitemap(
  sitemapUrl: string,
  opts: { timeoutMs: number; maxDepth?: number; depth?: number }
): Promise<{ urls: SitemapEntry[]; sitemapUrls: string[] }> {
  const maxDepth = opts.maxDepth ?? 3;
  const depth = opts.depth ?? 0;
  const urls: SitemapEntry[] = [];
  const sitemapUrls: string[] = [];

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs);
    const res = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ArchiveBot/1.0 (+https://example.local)" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return { urls, sitemapUrls };

    const buf = await res.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buf);

    if (!text.trim().startsWith("<") && sitemapUrl.endsWith(".xml")) {
      return { urls, sitemapUrls };
    }

    const $ = cheerio.load(text, { xmlMode: true });

    $("urlset > url > loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (!loc || !isHttpOrHttps(loc)) return;
      try {
        const normalized = normalizeUrl(loc);
        urls.push({ url: loc, normalizedUrl: normalized });
      } catch {
        /* ignore */
      }
    });

    if (depth < maxDepth) {
      $("sitemapindex > sitemap > loc").each((_, el) => {
        const loc = $(el).text().trim();
        if (loc) sitemapUrls.push(loc);
      });
    }
  } catch {
    // ignore
  }

  return { urls, sitemapUrls };
}

export async function parseSitemapRecursive(
  initialUrl: string,
  opts: { timeoutMs: number; maxDepth?: number; maxUrls?: number }
): Promise<SitemapEntry[]> {
  const all = new Map<string, SitemapEntry>();
  const seenSitemaps = new Set<string>();
  const queue: { url: string; depth: number }[] = [
    { url: initialUrl, depth: 0 },
  ];

  while (queue.length) {
    const next = queue.shift()!;
    if (seenSitemaps.has(next.url)) continue;
    seenSitemaps.add(next.url);
    try {
      const { urls, sitemapUrls } = await fetchAndParseSitemap(next.url, {
        timeoutMs: opts.timeoutMs,
        maxDepth: opts.maxDepth ?? 3,
        depth: next.depth,
      });
      for (const u of urls) {
        if (opts.maxUrls && all.size >= opts.maxUrls) break;
        all.set(u.normalizedUrl, u);
      }
      for (const sm of sitemapUrls) {
        if (seenSitemaps.has(sm)) continue;
        queue.push({ url: sm, depth: next.depth + 1 });
      }
      if (opts.maxUrls && all.size >= opts.maxUrls) break;
    } catch {
      /* continue */
    }
  }

  return Array.from(all.values());
}
