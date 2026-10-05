import * as cheerio from "cheerio";
import { URL } from "url";
import { isSameHost, normalizeUrl, isHttpOrHttps } from "./url-normalizer";

export type ExtractedLink = {
  url: string;
  normalizedUrl: string;
  source:
    | "html"
    | "canonical"
    | "pagination"
    | "feed";
};

export function extractLinks(
  html: string,
  baseUrl: string,
  targetHost: string
): ExtractedLink[] {
  const $ = cheerio.load(html);
  const results: Map<string, ExtractedLink> = new Map();

  const add = (href: string | undefined, source: ExtractedLink["source"]) => {
    if (!href) return;
    try {
      const absolute = new URL(href, baseUrl).toString();
      if (!isHttpOrHttps(absolute)) return;
      if (!isSameHost(absolute, targetHost)) return;
      const normalized = normalizeUrl(absolute);
      if (!results.has(normalized)) {
        results.set(normalized, {
          url: absolute,
          normalizedUrl: normalized,
          source,
        });
      }
    } catch {
      // ignore invalid URLs
    }
  };

  $("a[href]").each((_, el) => {
    add($(el).attr("href"), "html");
  });

  $('link[rel="canonical"]').each((_, el) => {
    add($(el).attr("href"), "canonical");
  });

  $('link[rel="next"], link[rel="prev"]').each((_, el) => {
    add($(el).attr("href"), "pagination");
  });

  $('a[rel="next"], a[rel="prev"]').each((_, el) => {
    add($(el).attr("href"), "pagination");
  });

  $('link[type="application/rss+xml"]').each((_, el) => {
    add($(el).attr("href"), "feed");
  });
  $('link[type="application/atom+xml"]').each((_, el) => {
    add($(el).attr("href"), "feed");
  });
  $('a[type="application/rss+xml"], a[type="application/atom+xml"]').each(
    (_, el) => {
      add($(el).attr("href"), "feed");
    }
  );
  $("a[href$='/rss'], a[href$='/feed'], a[href$='/atom.xml']").each(
    (_, el) => {
      add($(el).attr("href"), "feed");
    }
  );

  return Array.from(results.values());
}
