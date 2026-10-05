# ARCHIVE - Product Requirements Document

## Overview
- **Summary**: ARCHIVE is a production-quality web application that accepts website domains, discovers publicly accessible URLs via multiple methods (crawling, sitemaps, robots.txt), creates an archival submission queue, submits URLs to supported web-archiving services, and maintains a persistent searchable repository of the entire archival history.
- **Purpose**: Provide automated, responsible web preservation with incremental scanning, persistent queuing, and a complete audit trail of all archival activity.
- **Target Users**: Web archivists, researchers, content preservation teams, and anyone needing to maintain backups of public websites.

## Goals
- Accept one or more domains and perform responsible URL discovery
- Normalize, deduplicate, and persist all discovered URLs with source attribution
- Maintain a database-backed archival submission queue with failure recovery
- Integrate with archive providers via an extensible provider abstraction (with mock provider for safe local demos)
- Provide a premium minimal UI for monitoring, searching, and reviewing all archival activity
- Support incremental scans that identify only new URLs for re-archival

## Non-Goals
- Bypassing CAPTCHAs, authentication, robots.txt restrictions, or rate limits
- Scraping private or authenticated content
- Production deployment infrastructure (Docker, Redis, Kafka, cloud services) beyond local MVP
- Full-text content extraction or page rendering beyond link discovery
- User authentication / multi-tenancy for MVP (single-user local application)

## Background & Context
The application runs locally via `npm install && npx prisma migrate dev && npm run dev` using Next.js App Router + TypeScript + Tailwind + shadcn/ui + Prisma + SQLite. External archive providers (Wayback, archive.today) must be integrated only via permitted public mechanisms; a clearly-labeled Development/Mock provider is used for local demonstration while keeping the provider abstraction ready for compliant real integrations.

## Functional Requirements
- **FR-1 Domain Management**: Create/list/view projects with domains; validate URLs (HTTP/HTTPS only), extract hostname, normalize.
- **FR-2 URL Discovery**: Real crawler discovering URLs via: internal HTML links, sitemap.xml + sitemap indexes, robots.txt sitemap refs, canonical URLs, pagination, public feeds. Stay within domain, normalize, dedupe, record source + HTTP status, respect max URL limit, timeouts, redirects.
- **FR-3 URL Normalization & Deduplication**: Remove fragments, normalize trailing slashes, compare against existing records; no duplicate UrlRecords; update lastDiscoveredAt on re-scan.
- **FR-4 Incremental Scanning**: Second scan identifies +N new URLs; queues only new URLs (or explicitly requested updated snapshots); preserves all historical submissions.
- **FR-5 Persistent Queue**: Database-backed QueueJob (PENDING / PROCESSING / SUCCESS / FAILED / RETRYING) with retry count, timestamps, resume after restart, stuck-in-PROCESSING reset, per-job failure isolation.
- **FR-6 Archive Provider Abstraction**: `ArchiveProvider` interface; Wayback, archive.today, and mock providers; mock labeled "Development Provider" with deterministic simulated archive URLs never presented as real.
- **FR-7 Real-time Progress UI**: Polling-based progress with count (23/100), progress bar, current URL, status, and success/failed/pending/processing stats.
- **FR-8 Repository**: Paginated, searchable, filterable table of all archived URLs with columns: URL, Domain, Discovery Source, HTTP Status, Archive Status, Service, Last Submitted, Archive Link.
- **FR-9 Submission History**: Per-URL timeline with discovery, submissions, success/failures with errors, and archive links; preserves multiple submissions for the same URL.
- **FR-10 Queue Page**: Overview counts + job table with actions (start/pause/resume/retry failed).
- **FR-11 Archive History**: Chronological activity feed with filters (domain, service, status, date).
- **FR-12 Dashboard**: KPIs (Total Domains, URLs, Queued, Archived, Failed, Pending), Recent Projects table, Recent Activity, Processing Overview, Quick Actions.
- **FR-13 Project Detail**: Header stats, tabs (Overview / URLs / Queue / History), actions (Scan Again, Archive New URLs, View Repository).
- **FR-14 Settings**: Crawler (max URLs, timeout, concurrency), Archive (default provider, retries), System (DB status, worker status).
- **FR-15 Landing/Empty State**: Elegant onboarding when no projects exist.
- **FR-16 Seed / Demo Mode**: `npm run seed` seeds 1-2 demo domains with discovered URLs, successful + failed submissions, pending jobs, and history; clearly labeled.
- **FR-17 UI States**: Loading, Empty, Success, Error, Processing, Paused, Failed on every important view; skeleton loaders; toast notifications.
- **FR-18 Failure Recovery**: Survive browser refresh, server restart, individual URL failure, network timeout, provider failure; never lose queue state; retry failed; reset stuck PROCESSING jobs.
- **FR-19 API Endpoints**: `/api/domains`, `/api/scans`, `/api/crawl`, `/api/queue`, `/api/submissions`, `/api/repository` + server actions where appropriate.

## Non-Functional Requirements
- **NFR-1 Tech Stack**: Next.js App Router + TypeScript strict + Tailwind + shadcn/ui + Prisma + SQLite + Zod + Cheerio + Lucide.
- **NFR-2 Performance**: Handle thousands of URLs via pagination, batch processing, incremental inserts; never load entire crawl into React memory.
- **NFR-3 Design Quality**: Premium minimalist aesthetic inspired by Apple/Google/Linear/Vercel; restrained palette (white/neutral bg, black/dark type, one subtle accent); spacious; rounded corners; subtle shadows; smooth transitions.
- **NFR-4 Responsive**: Desktop + tablet usable.
- **NFR-5 Responsible Crawling**: Domain restriction, timeout, max URL limit (default 500), SSRF prevention, no private content, no auth/CAPTCHA bypass.
- **NFR-6 Persistence**: All state (URLs, queue, scans, submissions) in SQLite via Prisma; queue survives restart.
- **NFR-7 Type Safety**: TypeScript strict, no `any` leaks, Zod validation on API boundaries.
- **NFR-8 Build Quality**: `npm run build` + typecheck passes with zero errors.

## Constraints
- **Technical**: No Redis, Kafka, Docker, or external cloud services in MVP. Use native fetch + Cheerio; Playwright optional only if genuinely required for JS-rendered discovery and kept optional.
- **Business**: Never bypass CAPTCHAs, auth, rate limits, or robots/security restrictions. Mock provider clearly labeled when real automation is unavailable/inappropriate. Never present mocked archival URLs as real.
- **Dependencies**: Package list must be minimal; only install libraries actually needed.

## Assumptions
- Node.js + npm available on host machine
- Internet connectivity for real crawls and real provider calls (mock provider works offline)
- Local filesystem writable for SQLite DB file
- User understands this is MVP-level and not hardened for public Internet deployment

## Acceptance Criteria

### AC-1: Application bootstraps and starts successfully
- **Type**: `rule`
- **Given**: A fresh checkout of the project
- **When**: `npm install && npx prisma migrate dev && npm run dev` are executed
- **Then**: The dev server starts without errors and the landing page is reachable at `http://localhost:3000`
- **Pass Condition**: Dev server runs, page responds 200, no fatal errors in console
- **Evidence**: `npm run dev` server log + successful HTTP 200 on root

### AC-2: Prisma schema and migrations are valid
- **Type**: `rule`
- **Given**: The project root with Prisma configured for SQLite
- **When**: `npx prisma validate` and `npx prisma migrate dev` are executed
- **Then**: Schema is valid, migration applies cleanly, all required models exist (Project, Domain, UrlRecord, Submission, QueueJob, Scan) with documented fields and relationships
- **Pass Condition**: Both commands exit 0; introspection shows all tables and columns
- **Evidence**: Command exit codes + Prisma introspect output

### AC-3: Domain creation and validation flow works
- **Type**: `rule`
- **Given**: Running app, no projects
- **When**: User navigates to Dashboard, clicks "+ Add website", enters `https://example.com`, clicks "Start Discovery"
- **Then**: Domain validated (HTTP/HTTPS only, valid URL), hostname extracted, Project/Domain records created, discovery initiated, user navigated to project detail
- **Pass Condition**: Invalid URLs rejected; valid URL persists Domain row; project detail page renders
- **Evidence**: Manual UI flow + DB inspection of Domain table

### AC-4: URL discovery engine discovers URLs via multiple methods
- **Type**: `rule`
- **Given**: A domain with known sitemap, robots.txt, and HTML links
- **When**: Discovery crawler is started for the domain
- **Then**: URLs are discovered from (1) HTML internal links, (2) sitemap.xml, (3) sitemap indexes, (4) robots.txt sitemap references, (5) canonical URLs, (6) pagination where discoverable, (7) feeds; each URL's discoverySource recorded; HTTP status recorded; duplicates normalized and deduplicated; crawl respects max URL limit, domain boundary, timeouts, redirects
- **Pass Condition**: UrlRecord rows exist with varied `discoverySource` values; normalizedUrl field populated; no records outside target domain
- **Evidence**: DB rows for UrlRecord showing varied source values + normalized URLs

### AC-5: Incremental scan prevents duplicate UrlRecords and queues only new URLs
- **Type**: `rule`
- **Given**: A domain already scanned with N UrlRecords and M successful submissions
- **When**: A second scan is run that discovers N+K URLs (K new)
- **Then**: K new UrlRecord rows created; N existing rows have `lastDiscoveredAt` updated; K new URLs are added to QueueJob; zero of the N existing URLs are re-queued unless "Archive updated snapshot" explicitly triggered
- **Pass Condition**: Count of UrlRecord = N+K after second scan; QueueJob pending count = K; first-discovered timestamps preserved for existing
- **Evidence**: Row counts before/after + lastDiscoveredAt updates inspected in DB

### AC-6: Persistent queue survives restart and processes jobs with failure isolation
- **Type**: `rule`
- **Given**: Queue with PENDING jobs, some SUCCESS, some FAILED
- **When**: Server process is killed and restarted; then queue is resumed
- **Then**: Previously PENDING jobs remain PENDING; PROCESSING jobs stuck past threshold reset to PENDING/RETRYING; jobs execute sequentially (or with controlled concurrency); one failed job does not stop remaining jobs; each job tracks attempts, timestamps, error messages
- **Pass Condition**: After restart pending count unchanged; stuck PROCESSING reset after next worker tick; remaining jobs complete even when middle job fails
- **Evidence**: Kill-and-restart test with DB inspection of QueueJob status transitions

### AC-7: Archive provider abstraction supports mock and real providers with clear labeling
- **Type**: `rule`
- **Given**: Configured providers (Wayback, archive.today, mock)
- **When**: Queue processes a job using mock provider and a job using real provider
- **Then**: For mock: success returns deterministic simulated archive URL prefixed with localhost path; submission row is clearly marked as mock/development. For real: provider uses only permitted public endpoints; errors captured without bypassing controls. Provider interface `submit(url)` returns `{success, archiveUrl?, archiveIdentifier?, error?}`
- **Pass Condition**: Mock archive URLs contain the "Development Provider" marker label in UI; real provider never sends requests that bypass documented public interfaces
- **Evidence**: Code inspection of provider.ts/wayback.ts/archive-today.ts/mock.ts + Submission rows in DB

### AC-8: Repository page is searchable, filterable, paginated, and actionably complete
- **Type**: `rule`
- **Given**: Repository page at `/repository` with populated data
- **When**: User searches by URL substring, filters by archive status, sorts by submitted date, pages through results, clicks "Open Archive" and "Submission History"
- **Then**: Search narrows results, filters apply, sort order is correct, pagination works without loading all rows, archive link opens correct URL, history modal/tab shows timeline
- **Pass Condition**: Each UI operation produces correct filtered/sorted/page without JS errors
- **Evidence**: Manual UI walkthrough + network tab showing paginated API calls

### AC-9: Dashboard shows correct KPIs, recent projects, activity, and progress
- **Type**: `rule`
- **Given**: Multiple domains with URLs, submissions, and queue activity
- **When**: Dashboard is loaded
- **Then**: KPI cards show accurate counts (Total Domains, Total URLs, Queued, Archived, Failed, Pending); Recent Projects table shows per-domain columns (URLs, Archived, Pending, Failed, Last Scan, Status); Recent Activity feed shows chronological events; Processing Overview visualizes archived/pending/failed
- **Pass Condition**: Each KPI value matches DB aggregate query equivalent
- **Evidence**: Dashboard screenshot/values vs SQL counts for each metric

### AC-10: Project detail page shows statistics, tabs, and supports scan-again and archive-new actions
- **Type**: `rule`
- **Given**: A project detail page `/projects/[id]` with existing data
- **When**: Page loaded; tabs switched (Overview, URLs, Queue, History); "Scan Again" clicked; "Archive New URLs" clicked
- **Then**: Header stats (URLs discovered, New URLs, Already archived, Pending, Archived, Failed) accurate; each tab renders appropriate content; Scan Again starts new Scan row; Archive New URLs enqueues unarchived URLs
- **Pass Condition**: Each tab renders with data; actions create Scan/QueueJob rows in DB
- **Evidence**: DB row creation + UI state transitions

### AC-11: Queue page controls and statuses work end-to-end
- **Type**: `rule`
- **Given**: Queue page `/queue` with jobs in multiple states
- **When**: Pause, Resume, Start, Retry Failed actions are clicked
- **Then**: Overview counts (Total, Pending, Processing, Success, Failed) update; job table rows reflect state changes; Retry Failed creates RETRYING/PENDING rows for previously FAILED jobs with attempt increment
- **Pass Condition**: Each button click produces correct state transition visible in UI and DB
- **Evidence**: Button interaction logs + QueueJob table state transitions

### AC-12: Archive history page shows chronological filterable activity
- **Type**: `rule`
- **Given**: Archive history page `/history` with submissions
- **When**: Filters applied (Domain, Service, Status, Date range)
- **Then**: Results filter correctly, ordered chronologically, each row shows status icon + URL + service + time
- **Pass Condition**: Filtered result sets match DB queries
- **Evidence**: UI filter outputs vs equivalent DB queries

### AC-13: Submission history timeline shows events for a single URL with multiple submissions
- **Type**: `rule`
- **Given**: A UrlRecord with 2+ Submission rows (success, failure, retry)
- **When**: URL history timeline viewed
- **Then**: Timeline shows Discovered event + each Submission (Submitted, Success or Failed with error) + Archive link where applicable, all chronologically with timestamps
- **Pass Condition**: Every Submission row rendered correctly with status
- **Evidence**: UI timeline inspection vs Submission table rows

### AC-14: All key UI states (Loading, Empty, Error, Processing, Paused, Failed) are represented
- **Type**: `rule`
- **Given**: Application in various states (empty DB, slow fetch, API error, queue paused, queue with failed jobs)
- **When**: Each state encountered on Dashboard, Projects, Repository, Queue, History, Settings, Project Detail
- **Then**: Appropriate skeleton/empty/error/processing/paused/failed UI shown; no blank screens; toast notifications appear after actions
- **Pass Condition**: No page renders blank in any state; correct state component shown
- **Evidence**: Screenshots / manual inspection of each state

### AC-15: Settings page surfaces crawler and archive configuration plus system status
- **Type**: `rule`
- **Given**: Settings page at `/settings`
- **When**: User views page and modifies crawler (max URLs, timeout, concurrency) and archive (default provider, retries) settings
- **Then**: System section shows DB status and worker status; settings updates persist (via env/config mechanism appropriate for MVP)
- **Pass Condition**: DB status green; settings changes effective on next crawl/queue run
- **Evidence**: Settings UI state + subsequent behavior of crawler/queue

### AC-16: Seed command populates demo data clearly labeled
- **Type**: `rule`
- **Given**: Empty DB
- **When**: `npm run seed` executed
- **Then**: 1-2 demo domains inserted; discovered URLs with varied sources; mix of SUCCESS / FAILED submissions; pending QueueJobs; history entries; all demo rows marked (e.g., `isDemo: true` or hostname convention) so UI can label them
- **Pass Condition**: Row counts match documented seed profile; UI labels demo data clearly
- **Evidence**: DB rows after seed + UI labels visible on Dashboard/Repository

### AC-17: Second scan demo shows +N new URLs and limited re-queueing
- **Type**: `rule`
- **Given**: Demo project from seed with N URLs
- **When**: Second scan triggered that introduces K extra synthetic URLs
- **Then**: UI shows "+K new URLs" banner/counter; only K new QueueJob rows created; no existing archived URLs re-queued without explicit "Archive updated snapshot"
- **Pass Condition**: New counter == K in UI; QueueJob pending delta == K
- **Evidence**: UI screenshot showing new count + DB QueueJob delta

### AC-18: TypeScript strict and build pass with zero errors
- **Type**: `rule`
- **Given**: Full project source
- **When**: `npx tsc --noEmit` and `npm run build` executed
- **Then**: Both commands exit 0 with zero errors
- **Pass Condition**: Exit codes 0, no TS errors, no Next.js build errors
- **Evidence**: Command output

### AC-19: UI design quality matches premium minimal aesthetic
- **Type**: `rubric`
- **Dimension**: Visual design quality and adherence to premium minimal aesthetic (Apple/Google/Linear/Vercel-inspired)
- **Scale**: 1-5
- **Anchors**: 1 = generic admin template, heavy gradients, cluttered, poor hierarchy; 3 = clean but generic components, some clutter, decent typography; 5 = spacious, minimal, strong typography and hierarchy, restrained palette (mostly white/neutral bg, black/dark type, one subtle accent), subtle borders/shadows, smooth transitions, rounded but not excessive corners, no neon/glassmorphism/rainbow
- **Pass Threshold**: >= 4
- **Evidence**: Screenshots of Dashboard, Project Detail, Repository, Queue, Settings evaluated against anchors

### AC-20: Clean architecture and code quality
- **Type**: `rubric`
- **Dimension**: Architecture, modularity, and code quality
- **Scale**: 1-5
- **Anchors**: 1 = all logic in components, huge files, no separation of concerns; 3 = some separation but mixed concerns, large files, duplication; 5 = clean folders (lib/crawler, lib/archive, lib/queue, lib/db, lib/validation; app/api/*), reusable components, Zod validation, Prisma models match spec, meaningful names, no giant files, business logic out of UI, no `any`, proper error handling
- **Pass Threshold**: >= 4
- **Evidence**: Codebase inspection of folder structure, key modules, component boundaries

### AC-21: Responsible crawling and security safeguards
- **Type**: `rubric`
- **Dimension**: Responsible crawling and defensive security posture
- **Scale**: 1-5
- **Anchors**: 1 = crawls external links, no timeout, no max URL, SSRF-risky fetch; 3 = basic domain restriction, timeout present; 5 = HTTP/HTTPS only, strict domain restriction, URL normalization, configurable MAX_CRAWL_URLS (default 500), per-request timeout, response size limits, robots.txt considerations, SSRF mitigations (e.g., reject internal/private IPs), no auth/CAPTCHA/rate-limit bypasses
- **Pass Threshold**: >= 4
- **Evidence**: Code inspection of crawler.ts, URL validation, request configuration

### AC-22: Documentation (README + /docs page) is complete and usable
- **Type**: `rubric`
- **Dimension**: README + /docs page completeness and clarity
- **Scale**: 1-5
- **Anchors**: 1 = missing or single-paragraph README; 3 = README covers setup but thin on architecture/how it works; 5 = README covers overview, features, architecture, tech stack, DB setup, env vars, how to run, discovery, queue, providers (with mock note), production considerations, limitations, responsible crawling, future improvements; /docs page covers 7 topics with clean diagrams/sections
- **Pass Threshold**: >= 4
- **Evidence**: README.md content list + /docs page rendering

## Open Questions
- None. Requirements fully specified in the source prompt; ambiguous real-provider automation addressed via the mock-provider fallback explicitly required.
