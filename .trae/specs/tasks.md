# ARCHIVE - Implementation Plan

## Task 1: Bootstrap Next.js project with Tailwind, TypeScript strict, and base config
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Initialize Next.js App Router project with TypeScript strict mode in current working directory
  - Install and configure Tailwind CSS v3 with `globals.css`, `tailwind.config.ts`, `postcss.config.js`
  - Add base tsconfig with `strict: true`, proper paths (`@/*`)
  - Create `.env.example` with DATABASE_URL pointing to `file:./dev.db`
  - Create layout skeleton: app/layout.tsx with metadata, font, basic html/body; page.tsx with empty placeholder
- **Acceptance Criteria Addressed**: AC-1, NFR-1, AC-18
- **Test Requirements**:
  - `rule` TR-1.1: `npm install` succeeds; `npx tsc --noEmit` exits 0; dev server starts on localhost:3000 returning 200 for `/`. Evidence: command output + HTTP check.
  - `rubric` TR-1.2: Base config cleanliness; scale 1-5; anchors: 1=broken/missing configs, 3=working but messy/unused deps, 5=minimal deps, clean tsconfig/tailwind config, proper path alias, env example; threshold >= 4. Evidence: code inspection of tsconfig/tailwind/package.json.
- **Notes**: Keep package.json minimal; only add deps needed now (next, react, react-dom, typescript, tailwindcss, postcss, autoprefixer, @types/node, @types/react, @types/react-dom).

## Task 2: Add Prisma + SQLite, create schema, initial migration, db client
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Install prisma (dev) and @prisma/client
  - Create `prisma/schema.prisma` with models: Project, Domain, UrlRecord, Submission, QueueJob, Scan and all fields per spec
  - Enums: DomainStatus, DiscoverySource, ArchiveService, SubmissionStatus, QueueStatus, ScanStatus
  - Add seed infrastructure: `prisma/seed.ts` wired via package.json `"prisma": {"seed": "tsx prisma/seed.ts"}` (install tsx)
  - Create `lib/db/prisma.ts` singleton client with proper Next.js dev HMR handling (globalThis cache)
  - Run initial migration: `npx prisma migrate dev --name init`
- **Acceptance Criteria Addressed**: AC-2, NFR-1
- **Test Requirements**:
  - `rule` TR-2.1: `npx prisma validate` exits 0 and `npx prisma migrate dev` applies without error. Evidence: command output.
  - `rule` TR-2.2: Sqlite introspection shows all 6 tables with correct column names matching documented fields in spec (id/hostname/originalUrl/status/... for Domain, etc.). Evidence: `npx prisma db pull` or `sqlite3` schema listing.
  - `rule` TR-2.3: `lib/db/prisma.ts` imports resolve in a TS file without error. Evidence: a small `import { prisma } from '@/lib/db/prisma'` test compile.

## Task 3: Install shared utilities: Zod, Cheerio, Lucide, shadcn/ui base, clsx/tailwind-merge, sonner toasts
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Install zod, cheerio, lucide-react, @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge, sonner
  - Add `lib/utils.ts` with `cn()` helper
  - Add `lib/validation/zod-schemas.ts` with schemas for domain URL input, settings, etc.
  - Configure shadcn/ui path alias manually (components.json) so ui components land under `components/ui`
  - Add base shadcn components needed for MVP: Button, Card, Input, Badge, Table, Tabs, Dialog/Modal, Select, Progress, Skeleton, Toast (sonner used for notifications). Install each via `npx shadcn@latest add <name>` or hand-write small variants to stay lightweight.
- **Acceptance Criteria Addressed**: NFR-1
- **Test Requirements**:
  - `rule` TR-3.1: Each shadcn/ui component imports and renders without TS errors. Evidence: TS compile.
  - `rule` TR-3.2: Zod schema for domain URL rejects non-HTTP(S) and malformed URLs, accepts valid URLs and extracts hostname correctly. Evidence: unit assertions via a script or inline test outputs.

## Task 4: Implement crawler engine modules (url-normalizer, sitemap-parser, robots-parser, link-extractor, crawler orchestrator)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - Create `lib/crawler/url-normalizer.ts`: remove fragments, normalize trailing slashes, lowercase hostname, canonicalize query ordering where safe, return normalized string
  - Create `lib/crawler/link-extractor.ts`: given HTML string and base URL, extract internal (<a href>, <link rel="canonical">, pagination <link rel="next/prev">, feed links) and return absolute URLs staying within target hostname/domain
  - Create `lib/crawler/sitemap-parser.ts`: fetch and parse sitemap.xml (plain or gzip'd if detectable), parse sitemap indexes recursively to depth limit, extract URL list
  - Create `lib/crawler/robots-parser.ts`: fetch robots.txt, parse Sitemap: directives, return list of sitemap URLs
  - Create `lib/crawler/crawler.ts`: orchestrator class/function accepting {hostname, maxUrls, timeout, concurrency} -> iterates sitemap->robots->HTML BFS, fetches pages, parses links, checks HTTP status, enforces domain boundary, max URL limit, deduplication via Set, records discoverySource, returns structured results
  - Add `MAX_CRAWL_URLS` configurable default 500; request timeout default 10s; SSRF guard: reject IPs in RFC1918 / loopback / link-local by resolving hostname and refusing private ranges.
- **Acceptance Criteria Addressed**: AC-4, NFR-3, NFR-5
- **Test Requirements**:
  - `rule` TR-4.1: URL normalizer unit cases: fragments removed, trailing slash policy consistent, hostname lowercase, query ordering canonical (at least 5 cases pass). Evidence: assertion outputs.
  - `rule` TR-4.2: Link extractor on a static HTML string extracts internal links only, ignores cross-domain, extracts canonical, extracts rel=next. Evidence: test HTML assertions.
  - `rubric` TR-4.3: Crawler safety posture; scale 1-5; anchors: 1=no limits, 3=basic limits, 5=timeout, max URLs, domain strict, SSRF IP check, response size cap, redirect hop limit; threshold >= 4. Evidence: code review of crawler.ts.
  - `rule` TR-4.4: Crawler return type matches {url, normalizedUrl, source, httpStatus, discoveredAt[]} shape per spec. Evidence: TS type compile.

## Task 5: Implement archive provider abstraction + Wayback (safe mode), archive.today (safe stub), mock provider
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Create `lib/archive/provider.ts` with `ArchiveProvider` interface and `submit(url)` return shape
  - Create `lib/archive/registry.ts` to list providers (wayback, archive-today, mock, default)
  - Create `lib/archive/wayback.ts`: use only documented public Wayback Machine "Save Page Now" endpoint; handle rate limit responses gracefully; capture errors; never bypass any CAPTCHA or auth
  - Create `lib/archive/archive-today.ts`: safe stub — returns error indicating "manual submission recommended" to avoid CAPTCHA bypass; provider remains pluggable for future compliant impl
  - Create `lib/archive/mock.ts`: deterministic "Development Provider" returning simulated archiveUrl at `http://localhost:3000/archive/demo/<sha1(url)>` and archiveIdentifier `mock-<sha1>`; clearly labels responses as development/mock so UI can mark
- **Acceptance Criteria Addressed**: AC-7, NFR-5
- **Test Requirements**:
  - `rule` TR-5.1: `ArchiveProvider` interface implemented by all three providers (callable, matches types). Evidence: TS structural check.
  - `rule` TR-5.2: Mock provider submit() always returns success with deterministic localhost-prefixed archive URL and archiveIdentifier prefixed `mock-`. Evidence: function call assertions.
  - `rule` TR-5.3: Wayback provider inspects response status for 429/403 and returns structured error without retrying aggressively. Evidence: code path inspection.

## Task 6: Implement persistent queue module (queue, worker, retry)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 5
- **Description**:
  - Create `lib/queue/queue.ts`: DB-backed QueueJob operations (enqueueUrlRecord, listByStatus, countByStatus, pause, resume, retryFailed, cancelPending, resetStuckProcessing(thresholdMs))
  - Create `lib/queue/retry.ts`: simple backoff (delay = attempts * baseDelay) cap; max attempts default 3 from settings
  - Create `lib/queue/worker.ts`: singleton worker (async function, not a separate process) running in-process; picks oldest PENDING job; marks PROCESSING; calls archive provider submit(); on success marks SUCCESS and writes Submission row; on failure increments attempts, writes error, marks FAILED if attempts >= max else RETRYING; one failure doesn't stop loop; supports pause/resume via a shared flag in-memory + DB state for persistence
  - Expose `getOrCreateWorker()` singleton so API endpoints can start/poll it; on app startup, call `resetStuckProcessing()` once so jobs left in PROCESSING from crash are recoverable
- **Acceptance Criteria Addressed**: AC-6, NFR-6
- **Test Requirements**:
  - `rule` TR-6.1: Enqueue creates QueueJob row with status PENDING for a UrlRecord id. Evidence: DB insert + select.
  - `rule` TR-6.2: Worker processing one SUCCESS and one FAILED job in same batch continues processing subsequent pending jobs; marks correct final statuses, writes Submission record for success (attempts, errorMessage, archiveUrl populated). Evidence: worker loop run + DB inspection.
  - `rule` TR-6.3: `resetStuckProcessing` updates a PROCESSING row with old startedAt (> threshold) back to PENDING/RETRYING. Evidence: insert PROCESSING row with old date -> run reset -> status changes.
  - `rule` TR-6.4: Retry failed transitions FAILED jobs to RETRYING/PENDING and increments attempt count (or resets to allow next worker pick-up). Evidence: function call + DB.

## Task 7: API endpoints and server actions for domains, scans, crawl, queue, submissions, repository
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 4, Task 6
- **Description**:
  - `app/api/domains/route.ts`: POST (create project+domain from input URL), GET (list with stats). Validate with Zod.
  - `app/api/domains/[id]/route.ts`: GET (project detail + stats), DELETE (optional)
  - `app/api/scans/route.ts`: POST (start scan for domainId -> creates Scan row, dispatches crawler via async function not awaited so endpoint returns fast, updates Scan.completedAt and counts at end)
  - `app/api/crawl/[scanId]/progress/route.ts`: GET — returns current scan progress (discovered so far, new, status) by querying Scan and UrlRecord counts
  - `app/api/queue/route.ts`: GET (overview counts + paginated jobs); POST body actions: `{action:'start'|'pause'|'resume'|'retry-failed'|'cancel-pending'}`
  - `app/api/queue/[id]/route.ts`: GET single job
  - `app/api/submissions/route.ts`: GET paginated submissions with filters (for history page and URL history). Accept urlRecordId, domain, service, status, from, to
  - `app/api/repository/route.ts`: GET paginated UrlRecords joined with latest Submission; query params: q (search URL/domain), archiveStatus, service, discoverySource, httpStatus, sortBy, page, perPage
  - All endpoints: Zod validation on query/body, proper 4xx/5xx responses, Prisma error handling, pagination limits (max 100 per page)
- **Acceptance Criteria Addressed**: FR-19, AC-3, AC-4, AC-6, AC-8, AC-11, AC-12, AC-13
- **Test Requirements**:
  - `rule` TR-7.1: POST /api/domains with valid URL creates Domain + Project rows; invalid URL returns 400 with Zod issue. Evidence: curl calls.
  - `rule` TR-7.2: POST /api/scans returns 202 and creates Scan row; subsequent /crawl/progress reports updated count as crawler runs. Evidence: sequential calls.
  - `rule` TR-7.3: GET /api/repository with pagination and q= filter returns correct subset and correct page metadata. Evidence: calls with known rows.
  - `rule` TR-7.4: POST /api/queue {action:'retry-failed'} changes FAILED jobs to RETRYING/PENDING and returns count of updated jobs. Evidence: DB before/after.

## Task 8: UI shell: navigation layout (sidebar/header), wordmark logo, System status indicator, empty landing state, toasts
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - `app/layout.tsx` wraps children in shell with sidebar nav (Dashboard, Projects, Repository, Queue, Archive History, Settings) + top bar (ARCHIVE wordmark logo, System Status dot, user placeholder)
  - Create `components/layout/AppSidebar.tsx`, `AppHeader.tsx`
  - System status: green/amber/red based on worker alive + last DB heartbeat (simple: green if DB reachable via quick prisma query)
  - Landing empty state when 0 projects: headline "Preserve your websites.", description, CTA "Add your first website"
  - Add `<Toaster />` from sonner in layout; helper `lib/ui/toasts.ts` to fire standard toasts (discovery started, N URLs discovered, queue started, archive completed, N failed)
- **Acceptance Criteria Addressed**: FR-15, FR-17, NFR-3, AC-14, AC-19
- **Test Requirements**:
  - `rule` TR-8.1: Layout renders nav links; route click navigates via Next Link without full page reload. Evidence: browser navigation.
  - `rule` TR-8.2: With 0 projects, home page renders empty state CTA; with >=1 project it renders dashboard KPIs. Evidence: conditional render inspection.

## Task 9: Add Website modal/dialog flow with validation + redirect to project detail; Projects list page
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 8, Task 7
- **Description**:
  - `components/project/AddWebsiteDialog.tsx`: controlled Dialog with Input for Website URL, optional Input for Project name, Button "Start Discovery"; Zod client validation; on success calls POST /api/domains then POST /api/scans and redirects to `/projects/[id]`
  - `app/projects/page.tsx`: Projects list page; table/cards of projects with domain, URLs, archived, pending, failed, last scan, status; primary "+ Add Website" top CTA
- **Acceptance Criteria Addressed**: AC-3, FR-1, FR-18
- **Test Requirements**:
  - `rule` TR-9.1: Submit "notaurl" in Add Website dialog shows client Zod error and no POST. Evidence: UI interaction + network tab.
  - `rule` TR-9.2: Submit valid URL -> redirects to project detail URL; Scan row exists. Evidence: network + DB.

## Task 10: Dashboard page with KPIs, Recent Projects, Recent Activity, Processing Overview, Quick Actions
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 8, Task 7
- **Description**:
  - `app/page.tsx` (Dashboard) fetches initial data via server component or client fetch; keep data fetch light; poll counts every 5s if user has projects
  - KPI cards: Total Domains, Total URLs, Queued, Archived, Failed, Pending — each with small Lucide icon, subtle styling
  - Recent Projects table: columns (Domain, URLs, Archived, Pending, Failed, Last Scan, Status) with Badges
  - Recent Activity feed: list of chronological events (domain added, URLs discovered, scan completed, submissions completed with success/fail counts, N submissions failed) — generate from union of Scan + Submission summary rows or an ActivityLog approach (add Scan events plus aggregates)
  - Processing Overview: progress bar or stacked mini-bars visualizing Archived / Pending / Failed
  - Quick Actions: "+ Add website", "Start scan" (opens project picker), "View queue", "Open repository"
- **Acceptance Criteria Addressed**: AC-9, FR-12
- **Test Requirements**:
  - `rule` TR-10.1: With seeded data, each KPI matches aggregate DB counts. Evidence: compare UI numbers to SQL `count(*)` queries.
  - `rule` TR-10.2: Recent Projects table shows all seeded domains with correct column values. Evidence: UI/DB comparison.
  - `rubric` TR-10.3: Dashboard aesthetics; scale 1-5; anchors: 1=cluttered/rainbow, 3=acceptable, 5=spacious, minimal, strong hierarchy, one accent, subtle borders/shadows; threshold >= 4. Evidence: screenshot evaluation.

## Task 11: Project detail page (`/projects/[id]`) with Overview/URLs/Queue/History tabs and actions
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 9, Task 7
- **Description**:
  - `app/projects/[id]/page.tsx`: Server component shell; client component inside handles tabs and polling
  - Header: Domain name big, Status badge, Last scan, Last submission; Buttons: "Scan Again", "Archive New URLs", "View Repository" filtered to domain
  - Stats row: URLs discovered, New URLs (last scan delta — approximate via firstDiscoveredAt vs last scan window), Already archived, Pending, Archived, Failed
  - Performance metrics section (from Scan row + aggregates): Discovery duration, URLs discovered, URLs/sec; Submission duration, submissions completed, average submission time
  - Tabs: Overview (summary cards + processing overview); URLs (paginated URLs table: original URL, discovery source, HTTP status, latest archive status with actions View/Open Archive/History); Queue (jobs for domain); History (submissions timeline condensed for project)
  - "Scan Again" calls POST /api/scans; "Archive New URLs" finds UrlRecords of domain with zero SUCCESS submissions and enqueues them via queue API
- **Acceptance Criteria Addressed**: AC-10, AC-5, AC-21
- **Test Requirements**:
  - `rule` TR-11.1: Scan Again action creates a new Scan row; subsequent URL discovery updates counts on tab URLs. Evidence: DB row creation.
  - `rule` TR-11.2: "Archive New URLs" enqueues only URLs without prior SUCCESS submission. Evidence: QueueJob count delta.
  - `rule` TR-11.3: All 4 tabs render without crash. Evidence: UI clicks.

## Task 12: Repository page (`/repository`) with search, filters, pagination, archive link, Submission History modal
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 8, Task 7
- **Description**:
  - `app/repository/page.tsx` + client table component
  - Columns: URL (truncated with title), Domain, Discovery Source, HTTP Status, Archive Status (badge), Archive Service, Last Submitted, Archive Link, Actions
  - Search bar: search by URL substring or domain
  - Filters: Archive Status, Submission Service, Discovery Source, HTTP Status (use Select/Combobox)
  - Sort: clickable column headers (last submitted desc default, URL asc/desc, domain asc)
  - Pagination: page size 25, prev/next, jump to page via select
  - Row actions: "View" (open URL history modal), "Open Archive" (opens archiveUrl new tab, guarded with tooltip when mock "Development archive"), "Submission History" (modal timeline)
  - Submission history modal shows Timeline UI (Discovered, then each submission: Submitted -> Success/Failed with error, Archive link if success)
- **Acceptance Criteria Addressed**: AC-8, AC-13
- **Test Requirements**:
  - `rule` TR-12.1: Search q= returns only rows where URL or domain contains substring. Evidence: seeded test.
  - `rule` TR-12.2: Pagination page=2 returns second page without duplicates; total count consistent. Evidence: API + UI.
  - `rule` TR-12.3: Submission History modal for a URL with >1 submission shows all events chronologically. Evidence: timeline inspection.

## Task 13: Queue page (`/queue`) with overview counts, actions, job table
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 8, Task 7
- **Description**:
  - `app/queue/page.tsx`
  - Overview cards: Total jobs, Pending, Processing, Success, Failed
  - Action buttons: Start, Pause, Resume, Retry Failed (all call POST /api/queue action)
  - Job table: URL, Domain, Service, Status (badge), Attempts, Created, Started, Completed
  - Poll every 3s when page active
- **Acceptance Criteria Addressed**: AC-11, FR-10
- **Test Requirements**:
  - `rule` TR-13.1: Retry Failed button click updates FAILED rows and overview counts. Evidence: UI+DB.
  - `rule` TR-13.2: Pause sets worker paused flag, Resume clears it; polling reflects state. Evidence: action response inspection.

## Task 14: Archive History page (`/history`) chronological activity, filters
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 8, Task 7
- **Description**:
  - `app/history/page.tsx`
  - Filters row: Domain (multi-select or single), Service, Status, Date range (from/to inputs)
  - Activity list: each item shows status check icon (✓ archived / ✕ failed), URL, Service, timestamp (HH:MM + date)
  - Paginate; large friendly list (not overcrowded)
- **Acceptance Criteria Addressed**: AC-12, FR-11
- **Test Requirements**:
  - `rule` TR-14.1: Status filter shows only matching status rows. Evidence: UI interaction.
  - `rule` TR-14.2: Date range filters submissions within range inclusive. Evidence: seeded boundary test.

## Task 15: Settings page (`/settings`) with crawler + archive + system sections
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 8
- **Description**:
  - `app/settings/page.tsx`
  - Crawler Settings form: Maximum URLs (number), Request timeout (seconds ms label), Crawl concurrency (number 1-10). Persist to a Settings singleton: since MVP is single-user, store in a simple `app_settings` Prisma model OR a JSON file; easiest: add Settings model to Prisma with id=1 singleton row and fields maxUrls, requestTimeoutMs, crawlConcurrency, defaultProvider, maxAttempts. Extend schema in Task 2 follow-up migration.
  - Archive Settings: Default provider (select: wayback/archive-today/mock), Retry attempts (number)
  - System: Database status (connected ok / error), Worker status (running / paused / stopped with small heartbeat timestamp from worker)
- **Acceptance Criteria Addressed**: FR-14
- **Test Requirements**:
  - `rule` TR-15.1: Save settings changes DB row; next page load shows new values. Evidence: save + reload.
  - `rule` TR-15.2: DB status green if prisma query succeeds. Evidence: healthy case.

## Task 16: Seed script (prisma/seed.ts) for demo mode; wire up `npm run seed`
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 5
- **Description**:
  - Add new domain: `demo-archive-example.com` (fake, marked demo) and optionally `demo-archive-sample.org`
  - Generate 40-60 UrlRecords with varied discoverySource (html/sitemap/robots/canonical/pagination/feed), mix of HTTP 200/404/301
  - Generate Submission mix: 70% SUCCESS with mock provider (demo archive URLs), 10% FAILED with errors (Timeout, Provider rate-limited), 20% not yet submitted
  - Generate QueueJob rows: some PENDING, one PROCESSING (for reset demo), one FAILED, some SUCCESS
  - Generate 2 Scan rows per domain: first scan + second scan (showing incremental new URLs via firstDiscoveredAt)
  - All demo data distinguishable: mark domains with hostname prefix `demo-` or add `note` field; label mock submissions in UI via service=='mock'
- **Acceptance Criteria Addressed**: AC-16, AC-17
- **Test Requirements**:
  - `rule` TR-16.1: `npm run seed` exits 0; DB now has >0 Domain/UrlRecord/Submission/QueueJob/Scan rows. Evidence: counts.
  - `rule` TR-16.2: At least one FAILED submission and one PROCESSING queue job exist; resetStuckProcessing can convert PROCESSING -> PENDING for demo job. Evidence: DB before/after.
  - `rule` TR-16.3: UI labels mock provider rows as "Development Provider" clearly. Evidence: Repository/Queue rendering.

## Task 17: Second scan / incremental behavior implementation and UI indicators
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4, Task 5, Task 6, Task 7, Task 11
- **Description**:
  - In scan endpoint/app: compare discovered normalizedUrls against existing; create new only for unseen; update lastDiscoveredAt for existing; count newUrlCount on Scan row
  - "Archive New URLs" logic: find UrlRecords in domain whose latest Submission.status !== 'SUCCESS' (or no submissions); enqueue each
  - Add explicit "Archive updated snapshot" action (on project detail, per-row or bulk in URLs tab) that re-enqueues even already-successful URLs (skip in default flow)
  - UI banner/indicator on project detail post-scan: "+{newUrlCount} new URLs" with accent badge
- **Acceptance Criteria Addressed**: AC-5, AC-17, FR-4
- **Test Requirements**:
  - `rule` TR-17.1: Running scan #2 with K new URLs yields Scan.newUrlCount == K; UrlRecord total delta == K; QueueJob pending delta == K after Archive New URLs (unless some already queued). Evidence: counts.
  - `rule` TR-17.2: Already-successful URLs are NOT re-queued by "Archive New URLs" but ARE re-queued when explicitly invoking "Archive updated snapshot". Evidence: two action invocations compared.

## Task 18: Docs page `/docs` with 7 topics
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 8
- **Description**:
  - `app/docs/page.tsx` — clean documentation layout with sidebar sections and inline sections
  - 7 sections: Domain Discovery, URL Normalization, Incremental Scanning, Submission Queue, Archive Providers, Repository, Failure Recovery
  - Each section: short paragraph + visual summary (use ASCII/mermaid fenced diagram or simple box diagrams with Tailwind divs; keep static, no external libs)
- **Acceptance Criteria Addressed**: AC-22
- **Test Requirements**:
  - `rule` TR-18.1: All 7 topics present and reachable via anchor nav. Evidence: page scroll/click.
  - `rubric` TR-18.2: Docs clarity and diagram usefulness; scale 1-5; 1=walls of text, 3=text + some structure, 5=structured, headings, diagram blocks, scan-able; threshold >= 4. Evidence: page review.

## Task 19: README.md professional documentation
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1..Task 18 (completes last but can be drafted iteratively)
- **Description**:
  - README.md covers: Project overview, Features list, Architecture (diagram text), Tech stack, Database setup, Environment variables, How to run (3 steps: install/migrate/dev), How discovery works, How queue processing works, How archive providers work + Development/Mock provider note, Production considerations, Limitations, Responsible crawling section, Future improvements list
- **Acceptance Criteria Addressed**: AC-22
- **Test Requirements**:
  - `rubric` TR-19.1: README completeness and clarity; scale 1-5 per AC-22 anchors; threshold >= 4. Evidence: document review.

## Task 20: Real-time progress UI (scan progress, queue progress with current URL/status) and toast notifications across all flows
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 7, Task 8, Task 10, Task 11, Task 13
- **Description**:
  - Scan progress component: used on project detail after adding website — "Discovering... 42 URLs found so far", progress if max known, spinner
  - Queue progress component: "23 / 100 archived", progress bar % = SUCCESS / total, "Current URL: https://...", "Current status: Archiving...", sub-stats: Successful / Failed / Pending / Processing. Uses polling GET /api/queue overview and current oldest PROCESSING job.
  - Add toasts on: discovery started, N URLs discovered scan complete (with +new count), queue started, archive completed (with counts), N failed
- **Acceptance Criteria Addressed**: FR-7, FR-17, AC-14
- **Test Requirements**:
  - `rule` TR-20.1: Queue progress bar increments in visible ticks during worker run; "Current URL" updates as worker picks up next job. Evidence: visual run.
  - `rule` TR-20.2: At least 5 distinct toast events fire across add-website + scan + queue workflow. Evidence: toast capture / manual run.

## Task 21: Run build and typecheck; fix all errors; do full QA pass over demo flow
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1..Task 20
- **Description**:
  - `npx tsc --noEmit`; fix every error
  - `npm run build`; fix every Next.js error (including any app router "use client" issues, async server component issues, unused imports)
  - Run `npm run seed`, then `npm run dev`, and walk through 31-step demonstration flow outlined in prompt; fix issues found; iterate until each step achievable without console errors
  - Ensure no residual `console.log` debug spams; clean up unused imports
- **Acceptance Criteria Addressed**: AC-1, AC-18, FR-17, AC-14
- **Test Requirements**:
  - `rule` TR-21.1: `npx tsc --noEmit` exits 0 with 0 errors. Evidence: command output.
  - `rule` TR-21.2: `npm run build` exits 0 with 0 errors. Evidence: command output.
  - `rule` TR-21.3: Walkthrough of demo flow (19 steps of critical path: dashboard -> add website -> discover -> queue -> archive -> repository -> history -> second scan -> new URLs -> multi-domain) each reachable and working end-to-end with no fatal UI errors. Evidence: checklist pass.
