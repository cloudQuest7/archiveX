Let me do a comprehensive audit of the project to determine what's been built and what's still missing against the spec requirements.
The user wants to understand what tasks are still remaining to be done. They referenced the spec.md task list. Let me explore the project to understand the full state of completion - checking what exists and what doesn't against the spec's acceptance criteria and requirements.

Let me first check the project structure more comprehensively to see what pages, components, and infrastructure exist.

Good, I can see the structure now. Let me check the tasks.md file as the user mentioned it, and also look at some key page files and lib modules to understand what's been implemented.

Let me check the remaining pages and critical lib modules to verify completeness.
This is great progress. I can see that many files exist, but I need to dig deeper to understand which tasks are actually implemented vs just having skeleton files. Let me check more key files - the lib modules and the remaining pages.

Now let me check the critical lib modules and see if there are missing pages (history, settings).
I can see pages exist for dashboard (page.tsx), projects (list and detail), repository, queue, docs. But I'm missing:
1. `/history` page (Archive History - Task 14)
2. `/settings` page (Task 15)

Let me also check critical lib modules to make sure they're fully implemented.

Let me verify a few more critical things — the API response shapes vs front-end expectations, check layout wiring, and identify missing pages.
Good - the crawler and queue/worker libs look properly implemented. Let me check for the missing pages now: `/history` and `/settings`. I also need to check if the bootstrap is wired up properly in layout.tsx, and check the existing API routes to make sure they match the response shapes expected by the front-end pages (since I noticed repository page expects `data.urls` but the actual API returns `data.rows`).

Let me check these items.

Now let me check the remaining components and check the API/UI contract mismatches I've noticed.
Now I can see the mismatches. Let me check the DashboardContent component to understand what data it needs, and also check the queue.ts to see what getOverview returns vs what the QueuePage expects (QueuePage expects `stats: { total, pending, processing, success, failed, currentUrl, workerStatus }` but the API returns `overview` and `worker { currentJobUrl }`).

Also I need to check:
1. /history page - MISSING
2. /settings page - MISSING
3. /projects/list page - EXISTS, need to check content
4. The API shapes vs the front-end expectations (there are definitely mismatches: Queue page expects `{jobs, stats}` but API returns `{overview, jobs, worker}`).
5. Scan endpoint - need to check if it actually kicks off crawler
6. Repository API - returns `rows` but page expects `urls` + `totalPages`

Let me also check the DashboardContent, SubmissionHistoryModal, and projects page.

Let me check a few remaining critical items quickly.
Now I have a very good picture. Let me quickly check the scans route and ProjectDetailClient component, plus the badge variants (the pages use custom badge variants that may not exist in the base badge component), then produce my final gap list.

Great, badge variants are fine. Now I have a full picture. Let me finalize the todo list and produce the gap analysis. Let me also quickly check the sidebar to see if history and settings links are present, and check the docs page briefly.

Now I have a complete picture. The sidebar links to `/history` and `/settings` but those pages don't exist. Let me now compile the full gap list. The big issues are:

1. **Missing Pages**: `/history` (Task 14), `/settings` (Task 15)
2. **API/UI contract mismatches** - The APIs return shapes that don't match what the front-end pages expect, causing breakage.
3. **ProjectDetailClient** is partially shown but likely has gaps.
4. **Projects list page** expects `data.domains` but the API returns an array of projects directly.
5. **README** exists but needs verification of completeness (AC-22).
6. **Task 21** - build/typecheck QA pass.

Let me complete the audit and produce the gap list.

Here's your complete gap analysis against the [tasks.md](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/.trae/specs/tasks.md) plan.

---

## ✅ Tasks Completed (Skeleton/Code Exists)

| Task | Status | Key Files |
|------|--------|-----------|
| **T1** Bootstrap | ✅ Done | [package.json](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/package.json), [tsconfig.json](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/tsconfig.json), [tailwind.config.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/tailwind.config.ts) |
| **T2** Prisma/Schema | ✅ Done | [schema.prisma](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/prisma/schema.prisma), [prisma.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/db/prisma.ts), [seed.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/prisma/seed.ts) (partially verified) |
| **T3** Utilities + shadcn/ui | ✅ Done | [utils.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/utils.ts), [zod-schemas.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/validation/zod-schemas.ts), [components/ui/*](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/components/ui) |
| **T4** Crawler Modules | ✅ Implemented | [crawler/](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/crawler) with all 5 modules; includes SSRF IP check, domain restriction, timeouts |
| **T5** Archive Providers | ✅ Implemented | [archive/](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/archive): provider.ts, mock.ts, wayback.ts, archive-today.ts, registry.ts |
| **T6** Queue/Worker/Retry | ✅ Implemented | [queue/worker.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/queue/worker.ts), [queue.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/queue/queue.ts), [retry.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/queue/retry.ts), [bootstrap.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/queue/bootstrap.ts) — wired in [layout.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/layout.tsx#L6-L8) |
| **T7** API Endpoints | ⚠️ Mostly Done | All routes exist BUT several **response shapes don't match front-end contracts** (see Gap A below) |
| **T8** UI Shell (Layout/Sidebar/Toasts) | ✅ Done | [layout.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/layout.tsx), [AppSidebar.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/components/layout/AppSidebar.tsx), [AppHeader.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/components/layout/AppHeader.tsx), [toasts.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/ui/toasts.ts) |
| **T9** Add Website + Projects List | ✅ Skeleton | [AddWebsiteDialog.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/components/project/AddWebsiteDialog.tsx), [projects/page.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/projects/page.tsx) (but has API shape bug) |
| **T10** Dashboard (KPIs, Recent, Activity) | ✅ Skeleton | [page.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/page.tsx), [DashboardContent.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/components/dashboard/DashboardContent.tsx), [EmptyLanding.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/components/dashboard/EmptyLanding.tsx) |
| **T11** Project Detail (Tabs + Actions) | ⚠️ Partial | [projects/[id]/page.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/projects/[id]/page.tsx), [ProjectDetailClient.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/components/project/ProjectDetailClient.tsx) (incomplete — truncated read) |
| **T12** Repository Page | ⚠️ Skeleton Done | [repository/page.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/repository/page.tsx) — uses SubmissionHistoryModal, BUT response contract broken (see Gap A) |
| **T13** Queue Page | ⚠️ Skeleton Done | [queue/page.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/queue/page.tsx) — contract broken (see Gap A) |
| **T16** Seed Script | ⚠️ Partial | [seed.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/prisma/seed.ts) — only first 100 lines look good; rest unverified |
| **T17** Incremental Scan Behavior | ⚠️ Backend only | `newUrlCount` tracked in [scans/route.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/api/scans/route.ts#L45-L59) + [scan-helpers.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/api/scans/scan-helpers.ts); UI "+K new" banner missing in ProjectDetailClient |

---

## 🔴 Tasks NOT Started / Missing Pages (Highest Priority)

### **Gap 1: Missing Pages** (Sidebar links exist → will 404)
| Page | Route | Task | Why Missing |
|------|-------|------|-------------|
| **Archive History** | `app/history/page.tsx` | **T14** | [AppSidebar.tsx#L21](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/components/layout/AppSidebar.tsx#L21) already links to `/history` — NO file exists. Needs chrono activity list + filters (Domain, Service, Status, Date range). |
| **Settings** | `app/settings/page.tsx` | **T15** | [AppSidebar.tsx#L23](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/components/layout/AppSidebar.tsx#L23) already links to `/settings` — NO file exists. Needs Crawler + Archive forms + System status. Backend API exists: [settings/route.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/api/settings/route.ts) |

### **Gap 2: API ↔ Front-end response shape mismatches** (Will silently fail / show empty)
| API | Returns what | Page expects | Fix location |
|-----|--------------|--------------|--------------|
| **GET /api/queue** | `{ overview, jobs, worker: { currentJobUrl } }` | QueuePage expects `{ jobs, stats: { total, pending, processing, success, failed, currentUrl, workerStatus } }` | Align either in [queue/route.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/api/queue/route.ts#L37-L44) **or** [queue/page.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/queue/page.tsx#L145-L158) (and action uses `retry_failed` snake but schema uses `retry-failed` hyphen) |
| **GET /api/repository** | `{ rows, total, page, perPage }` + NO `totalPages` | RepositoryPage expects `{ urls, total, page, perPage, totalPages }` + hostname/service/status fields flattened differently | Fix in [repository/route.ts](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/api/repository/route.ts#L76-L107) or [repository/page.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/repository/page.tsx#L240-L246) |
| **GET /api/domains** | `[{project, domains:[...]}]` array (projects) | ProjectsPage does `setDomains(data.domains)` → always empty! Dashboard handles it via flatMap but ProjectsPage doesn't. | Fix in [projects/page.tsx#L43-L45](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/projects/page.tsx#L43-L45): should flatten like Dashboard does |
| **POST /api/queue actions** | Queue action schema uses `retry-failed` (hyphen) | QueuePage sends `retry_failed` (underscore) → validation rejects | Align in [zod-schemas.ts#L23-L30](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/lib/validation/zod-schemas.ts#L23-L30) or QueuePage runAction string |

### **Gap 3: T18 Docs page** — file exists [docs/page.tsx](file:///c:/Users/Anjali/OneDrive/Desktop/sma%20ass2/app/docs/page.tsx) — unverified content; needs 7 topic sections (Domain Discovery, Normalization, Incremental Scanning, Submission Queue, Archive Providers, Repository, Failure Recovery) per AC-22.

### **Gap 4: T19 README.md** — file exists but needs to be checked against AC-22 required sections (overview, architecture, DB setup, discovery flow explainers, responsible crawling, etc.).

### **Gap 5: T20 Real-time Progress UI** — Scan progress component ("42 URLs found so far", count ticker) and queue progress bar with "Current URL:" shown live — QueuePage has progress UI but relies on the broken API stats field + `stats.workerStatus` field API doesn't send.

### **Gap 6: T21 Full Build + Typecheck + Demo QA pass** — No indication this has been run; the contract mismatches above mean things won't work at runtime. Must run:
```
npx prisma migrate dev
npm run seed
npx tsc --noEmit
npm run build
```

---

## 🎯 Recommended Execution Order (Start with these)

**P0 (Critical — app is broken without):**
1. **Fix API ↔ UI contract mismatches** (Gap 2) — 4 changes, nothing renders correctly until fixed
2. **Create `app/history/page.tsx`** (Gap 1) — sidebar links to it
3. **Create `app/settings/page.tsx`** (Gap 1) — sidebar links to it

**P1 (Important for ACs):**
4. **Verify ProjectDetailClient completeness** (file read was truncated; confirm all 4 tabs + "Archive New URLs" + "Scan Again" actions work end-to-end)
5. **Add "+K new URLs" UI banner** in ProjectDetailClient after scan (T17 front-end half)
6. **Fill in docs/page.tsx 7 sections** if not already done (T18)
7. **Verify full seed.ts** (it's 100+ lines — ensure Scan rows / PROCESSING demo / incremental demo exist)

**P2 (Polish / Final QA):**
8. **README completeness pass** vs AC-22 anchors
9. **T21 build + typecheck + run demo flow** end-to-end (install → migrate → seed → dev → add website → discover → queue → archive → second scan → new URLs → history → repository filter)

Would you like me to start tackling **P0: Fix API contracts + add History + Settings pages**?