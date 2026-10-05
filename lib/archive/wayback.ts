import { ArchiveProvider, ArchiveSubmitResult } from "./provider";

export class WaybackMachineProvider implements ArchiveProvider {
  name = "Internet Archive (Wayback Machine)";
  serviceKey = "wayback" as const;

  async submit(url: string): Promise<ArchiveSubmitResult> {
    try {
      const endpoint = `https://web.archive.org/save/${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 45_000);

      const res = await fetch(
        "https://web.archive.org/save/" + encodeURIComponent(url),
        {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent":
              "ArchiveBot/1.0 (Demo local archival tool; contact: local@example)",
            Accept: "text/html",
          },
        }
      );
      clearTimeout(t);

      if (res.status === 429) {
        return {
          success: false,
          error: "Wayback rate limited (HTTP 429). Retry later.",
        };
      }
      if (res.status === 403) {
        return {
          success: false,
          error: "Wayback forbidden (HTTP 403).",
        };
      }
      if (!res.ok && res.status >= 400) {
        return {
          success: false,
          error: `Wayback returned HTTP ${res.status}`,
        };
      }

      const finalLocation = res.url || endpoint;
      // Extract job ID / timestamp if present. Otherwise build lookup URL.
      const matches = finalLocation.match(/\/web\/(\d+|[a-z0-9]+)\//i);
      const identifier = matches ? matches[1] : undefined;
      const archiveUrl = identifier
        ? `https://web.archive.org/web/${identifier}/${url}`
        : `https://web.archive.org/web/*/${url}`;

      return {
        success: true,
        archiveUrl,
        archiveIdentifier: identifier,
      };
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return { success: false, error: "Wayback submission timed out." };
      }
      return {
        success: false,
        error:
          err?.message?.toString()?.slice(0, 200) ||
          "Unknown Wayback submission error",
      };
    }
  }
}
