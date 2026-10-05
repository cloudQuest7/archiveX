import { URL } from "url";

export type NormalizationOptions = {
  removeTrailingSlash?: boolean;
  removeFragment?: boolean;
  sortQueryParams?: boolean;
  lowercaseHostname?: boolean;
  removeDefaultPort?: boolean;
};

const DEFAULT_OPTIONS: Required<NormalizationOptions> = {
  removeTrailingSlash: true,
  removeFragment: true,
  sortQueryParams: true,
  lowercaseHostname: true,
  removeDefaultPort: true,
};

export function normalizeUrl(
  input: string | URL,
  options: NormalizationOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const url = typeof input === "string" ? new URL(input) : input;

  if (opts.lowercaseHostname) {
    url.hostname = url.hostname.toLowerCase();
  }

  if (opts.removeDefaultPort) {
    if (
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    ) {
      url.port = "";
    }
  }

  if (opts.removeFragment) {
    url.hash = "";
  }

  if (opts.sortQueryParams) {
    const keys = [...url.searchParams.keys()].sort();
    const sorted = new URLSearchParams();
    for (const k of keys) {
      const values = url.searchParams.getAll(k);
      values.sort();
      for (const v of values) sorted.append(k, v);
    }
    url.search = sorted.toString();
  }

  let out = url.toString();

  if (opts.removeTrailingSlash) {
    const pathOnly = out.includes("?")
      ? out.slice(0, out.indexOf("?"))
      : out.includes("#")
      ? out.slice(0, out.indexOf("#"))
      : out;
    const rest = out.slice(pathOnly.length);
    if (pathOnly.endsWith("/") && pathOnly.length > url.protocol.length + 2) {
      out = pathOnly.replace(/\/+$/, "") || pathOnly;
      if (!out.endsWith("/") && new URL(out).pathname === "/") {
        out = out + "/";
      }
      out += rest;
    }
  }

  return out;
}

export function getHostname(input: string): string {
  const u = new URL(input);
  return u.hostname.toLowerCase();
}

export function isSameHost(input: string, targetHost: string): boolean {
  try {
    return getHostname(input) === targetHost.toLowerCase();
  } catch {
    return false;
  }
}

export function isHttpOrHttps(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
