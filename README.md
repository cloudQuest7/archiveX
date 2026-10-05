# ARCHIVE — Preserve the web. Automatically.

## Project Overview

ARCHIVE is a self-hosted web-archiving workbench that discovers every public URL on a domain, submits each page to one or more web archive providers, and maintains a permanent, searchable repository of archived snapshots. It is designed for researchers, journalists, and maintainers who need a verifiable record of what a site looked like — without manually clicking through pages or trusting a single provider.

Out of the box, ARCHIVE ships with a Development Provider so the entire pipeline — discovery, queue, submission, and repository browsing — works fully offline against mock snapshots. Real providers (Wayback Machine, archive.today stub) plug in via the same provider interface, and the project is structured so you can add your own without touching the core.

## Features

- **Multi-domain, multi-project.** Organize domains under named projects. Each project has its own independent URL set, scan history, and submission queue.
- **Seven discovery methods.** URLs are surfaced via HTML crawling, sitemaps, sitemap indexes, `robots.txt` Sitemap directives, canonical link tags, pagination (`rel="next"`), and RSS/Atom feeds.
- **Incremental scanning.** Each scan reports both total URLs discovered and the count of truly new URLs. Existing records only refresh their last-seen timestamp; nothing is re-archived unless you explicitly requeue it.
- **Reliable submission queue.** Jobs transit PENDING → PROCESSING → SUCCESS/FAILED with atomic database transitions. Retries apply per-job attempt counts and a configurable max-attempt ceiling.
- **Pluggable archive providers.** Wayback Machine, archive.today stub, and a built-in Development/Mock provider all implement the same interface. New providers require one file plus a one-line registry entry.
- **Permanent repository.** Every submission (success or failure) is retained with the provider used, the returned archive URL and identifier, timestamps, attempt counts, and error messages.
- **Full scan history.** Each completed scan stores its discovered count, new-URL delta, and start/end times, so you can audit when a URL was first seen and when it was last verified.
- **Per-instance settings.** Max URLs per scan, request timeout, crawl concurrency, default archive provider, retry ceiling, and a worker pause toggle are all editable at runtime via the `AppSetting` row.
- **Seedable demo data.** Run `npm run seed` to populate two sample projects, ~160 URL records, ~70% successful mock submissions, a stuck PROCESSING job to exercise recovery, a RETRYING submission + queue-job pair to surface the retry UI, a FAILED job with an upstream-500 error message, a RUNNING in-progress scan row on the Alpha project to show the live-scan banner, and two completed scans per domain (48 URLs → 54 URLs, showing the +6 incremental delta pattern described in the docs).

## Architecture

ARCHIVE is a Next.js 14 App Router application on top of SQLite via Prisma. The crawler, archive providers, and queue worker are all pure TypeScript modules under `lib/`, so the same code runs on the server, inside Route Handlers, and from the CLI.

Discovery writes rows to `UrlRecord` and `Scan`. URLs that are newly discovered produce `QueueJob` rows. The background worker claims jobs in priority order, calls the selected archive provider, and writes a `Submission` row on success. The UI reads from these tables directly.

```
app/
  docs/page.tsx          — Documentation (7 sections + diagrams)
  archive/demo/[hash]/route.ts — Mock archive snapshot handler
  layout.tsx             — Root layout, global metadata
  page.tsx               — Home entry
  globals.css            — Tailwind layers + CSS variables
components/
  ui/                    — Card, Button, Badge, Dialog, Input, Progress,
                           Skeleton, Table, Tabs (shadcn-style)
lib/
  crawler/
    crawler.ts           — Orchestrates a full domain scan
    link-extractor.ts    — Cheerio-based HTML link + rel extraction
    robots-parser.ts     — robots.txt parsing / Sitemap directives
    sitemap-parser.ts    — sitemap.xml + sitemap index parsing
    url-normalizer.ts    — Canonical URL normalization rules
  archive/
    provider.ts          — ArchiveProvider interface + types
    registry.ts          — Service-key → provider instance map
    wayback.ts           — Wayback Machine submit
    archive-today.ts     — archive.today stub
    mock.ts              — Development Provider (local demo route)
  queue/
    queue.ts             — Job creation + status transitions
    worker.ts            — Claim-loop, submit, persist Submission
    retry.ts             — Backoff + reset-stuck-PROCESSING logic
    bootstrap.ts         — Worker entry + recovery-at-startup
  db/
    prisma.ts            — Singleton PrismaClient
  validation/
    zod-schemas.ts       — Input validators (URLs, domain forms, etc.)
  ui/
    toasts.ts            — Sonner toast helpers
  utils.ts               — cn(), shared helpers
prisma/
  schema.prisma          — Project / Domain / UrlRecord / Submission /
                           QueueJob / Scan / AppSetting models
  seed.ts                — Deterministic demo-data seeder
```

## Tech Stack

- **Next.js 14 (App Router)** — Server Components, Route Handlers, and static rendering for documentation pages.
- **TypeScript strict** — Full strict mode with no `any` escape hatches in core modules.
- **Tailwind CSS** — Utility-first styling with design tokens mapped to HSL CSS variables for easy theming.
- **shadcn-style components** — Unstyled Radix primitives wrapped in a local component set (Card, Button, Badge, Table, Tabs, Dialog, Input, Progress, Skeleton) under `components/ui/`.
- **Prisma ORM** — Type-safe data access against SQLite; `prisma migrate dev` for migrations, `prisma generate` for types.
- **SQLite** — Single-file relational database; no external services required for development.
- **Zod** — Runtime validation for URL inputs, domain forms, and provider configuration.
- **Cheerio** — Fast jQuery-style HTML parsing for link extraction, canonical and rel inspection.
- **Lucide icons** — Consistent, lightweight SVG icon set used across the UI.
- **Sonner** — Imperative toast notifications for scan start/completion, queue actions, and provider error feedback.

## Database Setup

The Prisma schema defines seven models:

| Model | Purpose |
| --- | --- |
| **Project** | Top-level container; groups domains. |
| **Domain** | One hostname under a project; tracks last-scan and last-submission timestamps and status. |
| **UrlRecord** | One normalized URL per domain; tagged with discovery source, HTTP status, first/last seen timestamps. Unique on `(domainId, normalizedUrl)`. |
| **Submission** | Permanent repository record — one per attempt per URL per provider. Stores archive URL, identifier, status, error, attempt count. |
| **QueueJob** | Work queue row — PENDING / PROCESSING / SUCCESS / FAILED / RETRYING / CANCELLED with priority and started-at stamp for stuck-job recovery. |
| **Scan** | One row per domain scan; stores discovered-count, new-URL-count, status, and start/end timestamps. |
| **AppSetting** | Singleton settings row (`id=1`) for max URLs, timeout, concurrency, default provider, retry ceiling, and worker pause flag. |

Migrations are applied with `npx prisma migrate dev`, which also regenerates the Prisma Client.

## Environment Variables

Only one variable is required:

```
DATABASE_URL="file:./dev.db"
```

A `.env.example` is included in the repo. `DATABASE_URL` is the full Prisma connection string; for SQLite this points to a file path relative to the `prisma/` directory.

## How to Run

1. **Install dependencies.**
   ```bash
   npm install
   ```
2. **Create and migrate the database.**
   ```bash
   npx prisma migrate dev
   ```
   This initializes `prisma/dev.db`, runs all migrations, and generates the Prisma Client.
3. **Start the dev server.**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

**Bonus — seed demo data.**
```bash
npm run seed
```
This clears any previous `demo-*` data, creates two projects with 48+6 URLs each, ~70% successful mock submissions, a stuck PROCESSING job, a failed job, a 20-job success history, two completed scans per domain (showing the 48 → 54 incremental delta), and seeds the singleton `AppSetting` row.

## How Discovery Works

The crawler runs a domain scan by combining seven independent discovery channels. Each URL found is normalized, checked against the existing `(domainId, normalizedUrl)` unique key, and either inserted (with `firstDiscoveredAt = now`) or refreshed (`lastDiscoveredAt = now`, `newUrlCount` not incremented for the scan).

The seven methods are:

1. **HTML crawl** — Fetch the start URL, parse with Cheerio, extract every `href` from `<a>` tags, same-host only.
2. **sitemap.xml** — Request `/sitemap.xml` and parse `<url><loc>` entries.
3. **sitemap index** — If the sitemap response is a `<sitemapindex>`, recurse into each referenced sitemap.
4. **robots.txt** — Fetch `/robots.txt`, honour `Disallow` boundaries, and read every `Sitemap:` directive into the sitemap phase.
5. **canonical** — From every HTML response, read `<link rel="canonical">` and add the target if it's same-host and unseen.
6. **pagination** — From every HTML response, read `<link rel="next">` / `<link rel="prev">` to traverse paginated archives (blog pages, product listings).
7. **feed** — Detect `<link rel="alternate" type="application/rss+xml">` and `application/atom+xml`, parse the feed, and archive every item link.

## Incremental Scan Flow

Re-running a scan on a domain you already tracked does **not** re-archive everything. The incremental pipeline works like this:

1. **Re-discover.** All seven discovery methods run again and produce the same URL candidates as Scan 1, plus any new pages that have appeared since.
2. **Normalize + dedupe.** Each candidate is normalized and checked against the existing `(domainId, normalizedUrl)` unique key.
3. **Decide insert vs refresh.**
   - **Hit** — URL already exists: update only `UrlRecord.lastDiscoveredAt`. `Scan.newUrlCount` does **not** increase.
   - **Miss** — URL is truly new: insert a fresh `UrlRecord` row with `firstDiscoveredAt = lastDiscoveredAt = now` and bump `Scan.newUrlCount`.
4. **Report delta.** The scan ends with `Scan.discoveredCount = total candidates` and `Scan.newUrlCount = fresh inserts`. The UI shows both totals (e.g. "54 discovered · +6 new") and the project header shows a "+K new URLs" banner.
5. **Queue only the new rows.** Any post-scan "Archive New URLs" action enqueues exclusively the `UrlRecord` rows that still have zero successful submissions, so already-archived pages are not double-submitted.

The seeded demo data reproduces this pattern: Scan 1 reports 48/48 new and Scan 2 reports 54/+6 new, so you can walk the incremental behaviour on a fresh install without any network traffic.

## How Queue Processing Works

Newly inserted `UrlRecord` rows are enqueued as `QueueJob` rows in `PENDING` with a configurable priority. The worker loop runs in-process (bootstrapped by `lib/queue/bootstrap.ts`) and, on each tick:

1. **Recover stuck jobs** — `resetStuckProcessing()` atomically moves any `PROCESSING` row whose `startedAt` is older than the safety window back to `PENDING`, preserving attempt count.
2. **Claim a batch** — Select the top N pending jobs ordered by `(priority desc, createdAt asc)` and transition each to `PROCESSING` with `startedAt = now`.
3. **Invoke the provider** — Call the selected `ArchiveProvider.submit(url)`. Apply a client-side timeout at `requestTimeoutMs`.
4. **Persist the result** — On success, write a `Submission` row with `status=SUCCESS`, the archive URL, identifier, and `completedAt`; transition the job to `SUCCESS`. On error, bump `attempts`, write or update a `Submission` with the error message, and either move to `RETRYING` (if attempts < `maxAttempts`) or `FAILED`.
5. **Sleep and repeat** — Tick interval respects `crawlConcurrency` and respects the `workerPaused` flag from `AppSetting` so admins can freeze the queue without a deploy.

## How Archive Providers Work

Every provider implements the `ArchiveProvider` interface from `lib/archive/provider.ts`: a `name`, a `serviceKey`, an `isDevelopment` flag, and an `async submit(url)` that returns `{ success, archiveUrl?, archiveIdentifier?, error?, isMock }`.

- **Wayback Machine** — `lib/archive/wayback.ts` POSTs to the Wayback submit endpoint and returns the resulting job page URL and snapshot identifier.
- **archive.today stub** — `lib/archive/archive-today.ts` documents the manual-captcha flow; the submission surface is wired but marked as requiring user interaction until a headless provider is available.
- **Development / Mock Provider** — `lib/archive/mock.ts` is the default. It SHA-1 hashes the input URL to produce a deterministic `archiveIdentifier` (`mock-<sha>`) and an `archiveUrl` pointing at the local `app/archive/demo/[hash]/route.ts` handler. A small percentage of calls simulate timeouts and rate-limit errors so the UI's failure states are visible without network access. **All mock submissions are explicitly labelled "Development Provider" in the repository and flagged with `isMock=true`.**

## Production Considerations

- **Authentication.** The current app ships with no auth layer. For any deployment beyond a local single-user install, add a session provider (NextAuth, Clerk, Lucia) and gate every route and mutation.
- **Multi-tenancy.** Row-level `projectId` and `domainId` foreign keys are the natural place to add tenant scoping. Wrap all DB reads in a tenant context and strip `demo-*` seed logic from production.
- **Redis for the queue.** SQLite ACID is sufficient for small volumes, but at high concurrency or high throughput replace the in-process worker with a BullMQ / Temporal worker pool and a Redis broker.
- **Egress proxies.** Archive providers throttle by IP. Run submission workers through a rotating residential proxy pool, with per-provider rate limit budgets enforced at the worker.
- **Rate limits and politeness.** The `AppSetting.requestTimeoutMs` and `crawlConcurrency` knobs are the minimum; for production, add per-host `Crawl-Delay` respect and a global URL-level circuit breaker on 429/5xx responses.

## Limitations

- **Single-user assumption.** No auth, no roles, no per-project ACLs — any user with access to the app can modify every project.
- **No realtime WebSockets.** Scan progress and queue updates refresh on navigation / polling rather than a live socket.
- **archive.today requires manual intervention.** The stub provider cannot complete submissions without solving CAPTCHAs.
- **Playwright is not used by default.** Discovery uses Cheerio (static HTML parse only). URLs rendered client-side by JS frameworks will be under-discovered unless you swap the fetch layer for a Playwright crawl.

## Responsible Crawling

ARCHIVE is built to stay on the right side of site operators:

- **Boundary-enforced.** Every discovery method filters to same-host URLs before enqueueing. Cross-origin URLs found on pages are never followed.
- **Configurable timeout and concurrency.** Every fetch honours `AppSetting.requestTimeoutMs` and `crawlConcurrency` so a scan is a good citizen, not a denial-of-service.
- **`maxUrls` cap.** Each scan halts cleanly after `AppSetting.maxUrls`, even if more URLs exist, so a site admin can't accidentally archive a million-page forum.
- **SSRF guard.** Only `http:` and `https:` schemes are accepted. IP addresses, `file:`, and loopback hostnames are rejected by the Zod validator before any fetch.
- **No auth or CAPTCHA bypass.** No cookie injection, no credential stuffing, no CAPTCHA solver. Pages that require login are expected to 401/403 and are stored as inaccessible.

## Future Improvements

- **Authentication + roles.** Session-based login, admin / member roles, and per-project ownership.
- **Playwright crawl option.** An opt-in rendering backend that evaluates JS before link extraction, for SPAs and client-rendered blogs.
- **More archive providers.** Perma.cc, Archive.ph SaaS, custom self-hosted WARC writer as providers in the same registry.
- **Export CSV.** One-click export of a project's UrlRecords and Submission archive URLs as a CSV.
- **Email / webhook notifications.** Alert on scan completion, job-failure thresholds, and per-provider downtime.
- **CDX lookup before submit.** Query Wayback's CDX API for an existing snapshot of a URL before paying to re-archive it; link to the nearest good snapshot as a fallback.
- **Bulk CSV import of domains.** Upload a CSV of hostnames → create a project, one domain per row, queue scans.
- **Tags / labels on projects.** Free-form tagging, search and filter by tag, per-tag statistics in the dashboard.
# archiveX
