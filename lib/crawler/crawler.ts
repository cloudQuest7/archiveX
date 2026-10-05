import dns from "dns";
import { promisify } from "util";
import { URL } from "url";
import {
  normalizeUrl,
  getHostname,
  isHttpOrHttps,
  isSameHost,
} from "./url-normalizer";
import { extractLinks, ExtractedLink } from "./link-extractor";
import {
  parseSitemapRecursive,
  SitemapEntry,
} from "./sitemap-parser";
import { fetchRobotsSitemaps } from "./robots-parser";

const dnsLookup = promisify(dns.lookup);

export type DiscoveredUrl = {
  url: string;
  normalizedUrl: string;
  source:
    | "html"
    | "sitemap"
    | "sitemap_index"
    | "robots"
    | "canonical"
    | "pagination"
    | "feed";
  httpStatus: number | null;
  discoveredAt: Date;
};

export type CrawlerOptions = {
  targetUrl: string;
  maxUrls?: number;
  timeoutMs?: number;
  concurrency?: number;
  maxResponseSizeBytes?: number;
  maxRedirects?: number;
  onProgress?: (count: number, source: string) => void;
};

function isPrivateIp(ip: string): boolean {
  if (ip === "localhost") return true;
  if (ip.startsWith("127.") || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.")) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.includes(":")) {
    if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  }
  return false;
}

async function safeFetch(
  url: string,
  timeoutMs: number,
  maxSizeBytes: number,
  maxRedirects: number
): Promise<{ status: number; text: string | null; finalUrl: string }> {
  const u = new URL(url);
  const lookupRes = await dnsLookup(u.hostname).catch(() => null);
  if (lookupRes) {
    if (isPrivateIp(lookupRes.address)) {
      throw new Error("SSRF protection: private IP address rejected");
    }
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent":
        "ArchiveBot/1.0 (+https://example.local; polite crawler for archival demo)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.1",
    },
    redirect: "follow",
  });
  clearTimeout(t);
  let text: string | null = null;
  const ct = res.headers.get("content-type") || "";
  const isHtmlOrXml =
    ct.includes("text/html") ||
    ct.includes("application/xhtml") ||
    ct.includes("application/xml") ||
    ct.includes("text/xml") ||
    ct.includes("+xml");
  if (res.ok && isHtmlOrXml) {
    let received = 0;
    const chunks: Uint8Array[] = [];
    const reader = res.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          if (received > maxSizeBytes) {
            reader.cancel();
            break;
          }
          chunks.push(value);
        }
      }
      const total = new Uint8Array(received);
      let offset = 0;
      for (const c of chunks) {
        total.set(c, offset);
        offset += c.byteLength;
      }
      text = new TextDecoder("utf-8", { fatal: false }).decode(total);
    }
  }
  return { status: res.status, text, finalUrl: res.url };
}

export async function runCrawler(
  options: CrawlerOptions
): Promise<DiscoveredUrl[]> {
  const maxUrls = options.maxUrls ?? 500;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const concurrency = Math.max(1, Math.min(10, options.concurrency ?? 2));
  const maxSize = options.maxResponseSizeBytes ?? 2 * 1024 * 1024;
  const maxRedirects = options.maxRedirects ?? 5;

  const entryUrl = new URL(options.targetUrl);
  const targetHost = getHostname(options.targetUrl);
  const rootUrl = `${entryUrl.protocol}//${entryUrl.host}`;

  const results = new Map<string, DiscoveredUrl>();
  const seenFetches = new Set<string>();
  const fetchQueue: { url: string; fromSource: DiscoveredUrl["source"] }[] = [];

  const addResult = (
    d: Omit<DiscoveredUrl, "discoveredAt">,
    max: number
  ) => {
    if (results.size >= max) return false;
    if (results.has(d.normalizedUrl)) return false;
    results.set(d.normalizedUrl, {
      ...d,
      discoveredAt: new Date(),
    });
    options.onProgress?.(results.size, d.source);
    return true;
  };

  // 1. sitemap.xml
  try {
    const entries: SitemapEntry[] = await parseSitemapRecursive(
      new URL("/sitemap.xml", rootUrl).toString(),
      {
        timeoutMs,
        maxDepth: 3,
        maxUrls,
      }
    );
    for (const e of entries) {
      if (!isSameHost(e.url, targetHost)) continue;
      addResult(
        {
          url: e.url,
          normalizedUrl: e.normalizedUrl,
          source: "sitemap",
          httpStatus: null,
        },
        maxUrls
      );
    }
  } catch {
    /* ignore */
  }

  // 2. robots.txt sitemaps
  try {
    const robotsSitemaps = await fetchRobotsSitemaps(rootUrl, timeoutMs);
    for (const sm of robotsSitemaps) {
      try {
        const entries = await parseSitemapRecursive(sm, {
          timeoutMs,
          maxDepth: 3,
          maxUrls,
        });
        for (const e of entries) {
          if (!isSameHost(e.url, targetHost)) continue;
          addResult(
            {
              url: e.url,
              normalizedUrl: e.normalizedUrl,
              source: "robots",
              httpStatus: null,
            },
            maxUrls
          );
        }
      } catch {
        /* continue */
      }
    }
  } catch {
    /* ignore */
  }

  // 3. Start HTML BFS from root and discovered URLs
  fetchQueue.push({ url: options.targetUrl, fromSource: "html" });
  for (const d of Array.from(results.values())) {
    fetchQueue.push({ url: d.url, fromSource: d.source });
    if (fetchQueue.length > maxUrls * 2) break;
  }

  async function processOne(item: { url: string; fromSource: DiscoveredUrl["source"] }) {
    if (results.size >= maxUrls) return;
    let norm: string;
    try {
      norm = normalizeUrl(item.url);
    } catch {
      return;
    }
    if (seenFetches.has(norm)) return;
    if (!isHttpOrHttps(item.url)) return;
    if (!isSameHost(item.url, targetHost)) return;
    seenFetches.add(norm);
    let status: number | null = null;
    try {
      const { status: s, text, finalUrl } = await safeFetch(
        item.url,
        timeoutMs,
        maxSize,
        maxRedirects
      );
      status = s;
      if (isSameHost(finalUrl, targetHost)) {
        const fn = normalizeUrl(finalUrl);
        if (item.fromSource === "html" || item.fromSource === "sitemap") {
          addResult(
            {
              url: finalUrl,
              normalizedUrl: fn,
              source: item.fromSource,
              httpStatus: s,
            },
            maxUrls
          );
        } else {
          const existing = results.get(fn);
          if (existing) existing.httpStatus = s;
        }
      }
      if (text && s >= 200 && s < 400) {
        const links: ExtractedLink[] = extractLinks(
          text,
          finalUrl || item.url,
          targetHost
        );
        for (const l of links) {
          const added = addResult(
            {
              url: l.url,
              normalizedUrl: l.normalizedUrl,
              source: l.source,
              httpStatus: null,
            },
            maxUrls
          );
          if (added) {
            fetchQueue.push({ url: l.url, fromSource: l.source });
          }
        }
      }
    } catch {
      // ignore individual failures
    } finally {
      const existing = results.get(norm);
      if (existing && existing.httpStatus == null && status != null) {
        existing.httpStatus = status;
      }
    }
  }

  let cursor = 0;
  while (cursor < fetchQueue.length && results.size < maxUrls) {
    const slice = fetchQueue.slice(cursor, cursor + concurrency);
    cursor += slice.length;
    await Promise.all(slice.map(processOne));
  }

  return Array.from(results.values());
}
