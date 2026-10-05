import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sidebarLinks = [
  { id: "domain-discovery", label: "Domain Discovery" },
  { id: "url-normalization", label: "URL Normalization" },
  { id: "incremental-scanning", label: "Incremental Scanning" },
  { id: "submission-queue", label: "Submission Queue" },
  { id: "archive-providers", label: "Archive Providers" },
  { id: "repository", label: "Repository" },
  { id: "failure-recovery", label: "Failure Recovery" },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            How ARCHIVE discovers URLs, submits them to archives, and maintains a permanent repository.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <nav className="space-y-1">
              {sidebarLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-8">
            <Card id="domain-discovery">
              <CardHeader>
                <CardTitle>Domain Discovery</CardTitle>
                <CardDescription>
                  Seven complementary methods surface every public URL on a domain.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The crawler does not rely on a single source. It combines the start
                  page HTML, robots.txt directives, sitemap indexes and sub-sitemaps,
                  canonical link tags, pagination patterns found in link rels, and RSS
                  or Atom feeds. Each URL is tagged with its discovery source so the
                  repository shows which channel surfaced it.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Because discovery is multi-channel, URLs that only appear in a feed
                  or a deep paginated archive are still captured. The crawler exits
                  gracefully when it hits <code>maxUrls</code>, enforcing project
                  boundaries on large domains.
                </p>
                <div className="border rounded-lg bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="rounded-md border bg-background px-3 py-2">Start URL</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-background px-3 py-2">robots.txt</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-background px-3 py-2">sitemaps</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-background px-3 py-2">HTML crawl</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-background px-3 py-2">Normalized URLs</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="url-normalization">
              <CardHeader>
                <CardTitle>URL Normalization</CardTitle>
                <CardDescription>
                  Duplicate URLs collapse into one canonical record.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Before any URL is stored, it passes through the normalizer. Trailing
                  slashes are standardized, default ports stripped, query parameters
                  that look like session IDs or tracking tokens are removed, and the
                  fragment is dropped. Scheme and hostname are compared case-insensitively.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A unique constraint on <code>(domainId, normalizedUrl)</code> in the
                  database guarantees that two variants of the same page produce a single
                  UrlRecord. The first discovery timestamp is preserved while the last
                  seen timestamp is refreshed on every scan.
                </p>
                <div className="border rounded-lg bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-md border bg-background px-3 py-2 text-destructive">https://example.com/about?utm=a</div>
                      <span className="text-muted-foreground">→</span>
                      <div className="rounded-md border bg-accent/10 px-3 py-2 font-medium">https://example.com/about</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-md border bg-background px-3 py-2 text-destructive">https://example.com/about/</div>
                      <span className="text-muted-foreground">→</span>
                      <div className="rounded-md border bg-accent/10 px-3 py-2 font-medium">https://example.com/about</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-md border bg-background px-3 py-2 text-destructive">https://example.com/about#top</div>
                      <span className="text-muted-foreground">→</span>
                      <div className="rounded-md border bg-accent/10 px-3 py-2 font-medium">https://example.com/about</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="incremental-scanning">
              <CardHeader>
                <CardTitle>Incremental Scanning</CardTitle>
                <CardDescription>
                  Scan 2 only indexes what Scan 1 missed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Each scan records its own <code>discoveredCount</code> and{" "}
                  <code>newUrlCount</code>. When a scan runs, URLs that already exist
                  for the domain simply have their <code>lastDiscoveredAt</code> bumped
                  and do not count toward <code>newUrlCount</code>. URLs that are truly
                  new get fresh rows and are immediately eligible for submission.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This incremental behaviour means a second pass on a fast-growing blog
                  reports only the delta — typically a handful of posts — instead of
                  re-archiving every page already in the repository.
                </p>
                <div className="border rounded-lg bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="rounded-md border bg-background px-3 py-2">Scan 1</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-background px-3 py-2">48 URLs total</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-accent/10 px-3 py-2 font-medium">48 new</div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <div className="rounded-md border bg-background px-3 py-2">Scan 2</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-background px-3 py-2">54 URLs total</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-accent/10 px-3 py-2 font-medium">6 new</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="submission-queue">
              <CardHeader>
                <CardTitle>Submission Queue</CardTitle>
                <CardDescription>
                  A reliable queue turns discovery into archived snapshots.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Each newly discovered URL produces a <code>QueueJob</code>. The worker
                  claims jobs in priority order and oldest-first within a priority band.
                  Claiming atomically transitions the row to <code>PROCESSING</code> and
                  stamps <code>startedAt</code>. On success the job moves to{" "}
                  <code>SUCCESS</code> and a Submission row is written with the returned
                  archive URL and identifier.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Failures increment <code>attempts</code>. If the attempt count is below
                  the configured <code>maxAttempts</code>, the job returns to{" "}
                  <code>RETRYING</code> with exponential backoff applied by the scheduler.
                  Perceived provider errors use longer sleeps than client-side timeouts.
                </p>
                <div className="border rounded-lg bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="rounded-md border bg-muted px-3 py-2">PENDING</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-accent/20 px-3 py-2">PROCESSING</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex gap-2">
                      <div className="rounded-md border bg-green-500/15 px-3 py-2">SUCCESS</div>
                      <div className="rounded-md border bg-destructive/15 px-3 py-2">FAILED</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="archive-providers">
              <CardHeader>
                <CardTitle>Archive Providers</CardTitle>
                <CardDescription>
                  Pluggable providers, each with its own reliability profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Every provider implements the same <code>ArchiveProvider</code>
                  interface: accept a URL, return a success flag with archive URL and
                  identifier, or an error message. The registry maps service keys to
                  provider instances, so new providers are a single file plus a
                  one-line registration.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Wayback Machine uses the public submit endpoint and returns the job
                  page. archive.today is a stub that captures the manual flow. The
                  Development Provider is shipped by default — it deterministically
                  hashes URLs into local demo routes so the UI works fully offline.
                  All mock Submissions are flagged with <code>isMock=true</code> and
                  labelled clearly in the interface.
                </p>
                <div className="border rounded-lg bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="rounded-md border bg-background px-3 py-2">URL Record</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-background px-3 py-2">Provider Registry</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex gap-2">
                      <div className="rounded-md border bg-accent/10 px-3 py-2">Wayback</div>
                      <div className="rounded-md border bg-accent/10 px-3 py-2">archive.today</div>
                      <div className="rounded-md border bg-yellow-500/15 px-3 py-2">Development</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="repository">
              <CardHeader>
                <CardTitle>Repository</CardTitle>
                <CardDescription>
                  A permanent searchable record of every archived URL.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The Submission table is the repository of record. Each successful
                  submission stores the provider used, the timestamp, the returned
                  archive URL, and the provider-assigned identifier. Because
                  submissions are never deleted, you can trace when a page was first
                  preserved, see which provider has a copy, and click through to the
                  snapshot even if the original URL is now gone.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Failed submissions are retained too, with error messages and attempt
                  counts, so the repository also acts as a history of what was
                  attempted and where reliability improvements are needed.
                </p>
                <div className="border rounded-lg bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="rounded-md border bg-background px-3 py-2">Scan</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-background px-3 py-2">Queue</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-background px-3 py-2">Submission</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-accent/10 px-3 py-2 font-medium">Repository</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="failure-recovery">
              <CardHeader>
                <CardTitle>Failure Recovery</CardTitle>
                <CardDescription>
                  Stuck workers, dead providers, and partial scans all recover cleanly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The worker bootstrap runs <code>resetStuckProcessing</code> before
                  starting the main loop. Any <code>QueueJob</code> in PROCESSING whose{" "}
                  <code>startedAt</code> is older than the safety threshold is moved
                  back to PENDING and its attempt count is preserved. This handles
                  killed processes, Node restarts, or a provider call that never
                  returns.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Scans that crash leave behind a <code>FAILED</code> row with the
                  error and no data is lost. Submissions that partially succeeded keep
                  their partial entries so the repository stays append-only. Settings
                  are read from <code>AppSetting</code> each tick, so a user can
                  pause the worker or raise the concurrency limit without a deploy.
                </p>
                <div className="border rounded-lg bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="rounded-md border bg-destructive/15 px-3 py-2">Stuck PROCESSING (30m+)</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-muted px-3 py-2">resetStuckProcessing</div>
                    <span className="text-muted-foreground">→</span>
                    <div className="rounded-md border bg-accent/10 px-3 py-2">Back to PENDING</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
