import {
  PrismaClient,
  DomainStatus,
  DiscoverySource,
  ArchiveService,
  SubmissionStatus,
  QueueStatus,
  ScanStatus,
} from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function sha1(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

function deterministicRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const URL_PATHS = [
  "/",
  "/about",
  "/contact",
  "/products",
  "/products/1",
  "/products/2",
  "/products/3",
  "/blog",
  "/blog/hello-world",
  "/blog/getting-started",
  "/blog/tutorial",
  "/pricing",
  "/faq",
  "/terms",
  "/privacy",
  "/sitemap.xml",
  "/robots.txt",
  "/feed.xml",
  "/rss",
  "/help",
  "/help/getting-started",
  "/search",
  "/login",
  "/signup",
  "/docs",
  "/docs/v1",
  "/docs/v2",
  "/assets/style.css",
  "/api/users",
  "/api/health",
  "/team",
  "/careers",
  "/press",
  "/events",
  "/events/2024",
  "/gallery",
  "/gallery/photo-1",
  "/gallery/photo-2",
  "/gallery/photo-3",
  "/downloads",
  "/status",
  "/cdn-cgi/styles",
  "/blog/page/2",
  "/products/page/2",
  "/docs/v1/intro",
  "/docs/v1/api",
  "/docs/v2/intro",
  "/docs/v2/api",
];

const DISCOVERY_SOURCES: DiscoverySource[] = [
  "html",
  "sitemap",
  "sitemap_index",
  "robots",
  "canonical",
  "pagination",
  "feed",
];

const PROJECTS_CONFIG = [
  {
    name: "Demo Project Alpha",
    hostname: "demo-archive-example.com",
  },
  {
    name: "Demo Project Beta",
    hostname: "demo-archive-sample.org",
  },
];

const NON_HTML_PATHS = new Set([
  "/sitemap.xml",
  "/robots.txt",
  "/feed.xml",
  "/rss",
  "/assets/style.css",
  "/api/users",
  "/api/health",
  "/cdn-cgi/styles",
]);

async function main() {
  console.log("Seeding demo data…");

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

  console.log("Clearing old demo data…");
  await prisma.domain.deleteMany({
    where: {
      hostname: {
        startsWith: "demo-",
      },
    },
  });
  await prisma.project.deleteMany({
    where: {
      name: {
        startsWith: "Demo Project",
      },
    },
  });

  for (const projectConfig of PROJECTS_CONFIG) {
    const rand = deterministicRandom(
      projectConfig.hostname === "demo-archive-example.com" ? 12345 : 67890
    );

    console.log(`Creating project: ${projectConfig.name}`);
    const project = await prisma.project.create({
      data: {
        name: projectConfig.name,
      },
    });

    console.log(`Creating domain: ${projectConfig.hostname}`);
    const domain = await prisma.domain.create({
      data: {
        projectId: project.id,
        hostname: projectConfig.hostname,
        originalUrl: `https://${projectConfig.hostname}/`,
        status: DomainStatus.ACTIVE,
        lastScanAt: twoDaysAgo,
        lastSubmissionAt: twoDaysAgo,
      },
    });

    console.log(`Creating UrlRecords for ${projectConfig.hostname}…`);
    const urlRecords = [];
    for (let i = 0; i < URL_PATHS.length; i++) {
      const path = URL_PATHS[i];
      const originalUrl = `https://${projectConfig.hostname}${path}`;
      const normalizedUrl = originalUrl;
      const isNonHtml = NON_HTML_PATHS.has(path);

      const statusRoll = rand();
      let httpStatus = 200;
      if (isNonHtml && (path.endsWith(".css") || path.startsWith("/cdn-cgi"))) {
        httpStatus = 404;
      } else if (statusRoll < 0.7) {
        httpStatus = 200;
      } else if (statusRoll < 0.8) {
        httpStatus = 301;
      } else if (statusRoll < 0.95) {
        httpStatus = 404;
      } else {
        httpStatus = 500;
      }

      const isNewlyDiscovered = i >= URL_PATHS.length - 6;

      const discoverySource = pick(DISCOVERY_SOURCES, i);

      const urlRecord = await prisma.urlRecord.create({
        data: {
          domainId: domain.id,
          originalUrl,
          normalizedUrl,
          discoverySource,
          httpStatus,
          isAccessible: httpStatus === 200 || httpStatus === 301,
          firstDiscoveredAt: isNewlyDiscovered ? sixHoursAgo : twoDaysAgo,
          lastDiscoveredAt: now,
        },
      });
      urlRecords.push(urlRecord);
    }

    console.log(`Creating Submissions for ${projectConfig.hostname}…`);
    const submissionIds: string[] = [];
    for (let i = 0; i < urlRecords.length; i++) {
      const urlRecord = urlRecords[i];
      const subRoll = rand();

      if (subRoll < 0.7) {
        const digest = sha1(urlRecord.originalUrl);
        const submittedAt = new Date(
          twoDaysAgo.getTime() +
            Math.floor(rand() * (2 * 24 * 60 * 60 * 1000))
        );
        const submission = await prisma.submission.create({
          data: {
            urlRecordId: urlRecord.id,
            service: ArchiveService.mock,
            status: SubmissionStatus.SUCCESS,
            submittedAt,
            completedAt: new Date(submittedAt.getTime() + 5000 + Math.floor(rand() * 60000)),
            archiveUrl: `http://localhost:3000/archive/demo/${digest}?url=${encodeURIComponent(urlRecord.originalUrl)}`,
            archiveIdentifier: `mock-${digest}`,
            attemptCount: 1,
            isMock: true,
          },
        });
        submissionIds.push(submission.id);
      } else if (subRoll < 0.8) {
        const errorMsg = rand() < 0.5 ? "Timeout" : "Provider rate-limited";
        await prisma.submission.create({
          data: {
            urlRecordId: urlRecord.id,
            service: ArchiveService.mock,
            status: SubmissionStatus.FAILED,
            submittedAt: new Date(
              twoDaysAgo.getTime() +
                Math.floor(rand() * (2 * 24 * 60 * 60 * 1000))
            ),
            errorMessage: errorMsg,
            attemptCount: 3,
            isMock: true,
          },
        });
      }
    }

    console.log(`Creating QueueJobs for ${projectConfig.hostname}…`);

    const pendingCount = 10;
    for (let i = 0; i < pendingCount; i++) {
      const urlRecord = urlRecords[i % urlRecords.length];
      await prisma.queueJob.create({
        data: {
          urlRecordId: urlRecord.id,
          domainId: domain.id,
          service: ArchiveService.mock,
          status: QueueStatus.PENDING,
          priority: i < 3 ? 1 : 0,
          attempts: 0,
          createdAt: new Date(now.getTime() - Math.floor(rand() * 3600000)),
        },
      });
    }

    const stuckUrlRecord = urlRecords[pendingCount % urlRecords.length];
    await prisma.queueJob.create({
      data: {
        urlRecordId: stuckUrlRecord.id,
        domainId: domain.id,
        service: ArchiveService.mock,
        status: QueueStatus.PROCESSING,
        priority: 0,
        attempts: 1,
        startedAt: thirtyMinAgo,
        createdAt: new Date(thirtyMinAgo.getTime() - 120000),
      },
    });

    const failedUrlRecord = urlRecords[(pendingCount + 1) % urlRecords.length];
    await prisma.queueJob.create({
      data: {
        urlRecordId: failedUrlRecord.id,
        domainId: domain.id,
        service: ArchiveService.mock,
        status: QueueStatus.FAILED,
        priority: 0,
        attempts: 3,
        errorMessage: "Upstream service returned 500 error",
        createdAt: new Date(now.getTime() - 7200000),
        completedAt: new Date(now.getTime() - 7100000),
      },
    });

    const retryingUrlRecord = urlRecords[(pendingCount + 2) % urlRecords.length];
    const retryingSubmission = await prisma.submission.create({
      data: {
        urlRecordId: retryingUrlRecord.id,
        service: ArchiveService.mock,
        status: SubmissionStatus.RETRYING,
        submittedAt: new Date(now.getTime() - 1800000),
        errorMessage: "Gateway timeout — will retry",
        attemptCount: 2,
        isMock: true,
      },
    });
    await prisma.queueJob.create({
      data: {
        urlRecordId: retryingUrlRecord.id,
        domainId: domain.id,
        service: ArchiveService.mock,
        status: QueueStatus.RETRYING,
        priority: 1,
        attempts: 2,
        errorMessage: "Gateway timeout — will retry",
        createdAt: new Date(now.getTime() - 1800000),
        startedAt: new Date(now.getTime() - 1700000),
      },
    });

    const successCount = 20;
    for (let i = 0; i < successCount; i++) {
      const urlRecord = urlRecords[i % urlRecords.length];
      const subId = submissionIds[i % submissionIds.length];
      const createdAt = new Date(
        twoDaysAgo.getTime() +
          Math.floor(rand() * (2 * 24 * 60 * 60 * 1000))
      );
      await prisma.queueJob.create({
        data: {
          urlRecordId: urlRecord.id,
          domainId: domain.id,
          service: ArchiveService.mock,
          status: QueueStatus.SUCCESS,
          priority: 0,
          attempts: 1,
          createdAt,
          startedAt: new Date(createdAt.getTime() + 1000),
          completedAt: new Date(createdAt.getTime() + 5000 + Math.floor(rand() * 60000)),
        },
      });
    }

    console.log(`Creating Scans for ${projectConfig.hostname}…`);
    const scan1Started = twoDaysAgo;
    const scan1Completed = new Date(twoDaysAgo.getTime() + 30 * 60 * 1000);
    await prisma.scan.create({
      data: {
        domainId: domain.id,
        status: ScanStatus.COMPLETED,
        startedAt: scan1Started,
        completedAt: scan1Completed,
        discoveredCount: 48,
        newUrlCount: 48,
      },
    });

    const scan2Started = sixHoursAgo;
    const scan2Completed = new Date(sixHoursAgo.getTime() + 20 * 60 * 1000);
    await prisma.scan.create({
      data: {
        domainId: domain.id,
        status: ScanStatus.COMPLETED,
        startedAt: scan2Started,
        completedAt: scan2Completed,
        discoveredCount: 54,
        newUrlCount: 6,
      },
    });

    if (projectConfig.hostname === "demo-archive-example.com") {
      const scan3Started = new Date(now.getTime() - 5 * 60 * 1000);
      await prisma.scan.create({
        data: {
          domainId: domain.id,
          status: ScanStatus.RUNNING,
          startedAt: scan3Started,
          discoveredCount: 12,
          newUrlCount: 2,
        },
      });
    }

    await prisma.domain.update({
      where: { id: domain.id },
      data: {
        lastScanAt: scan2Completed,
      },
    });
  }

  console.log("Upserting AppSetting…");
  await prisma.appSetting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      maxUrls: 500,
      requestTimeoutMs: 10000,
      crawlConcurrency: 2,
      defaultProvider: ArchiveService.mock,
      maxAttempts: 3,
      workerPaused: false,
    },
    update: {
      maxUrls: 500,
      requestTimeoutMs: 10000,
      crawlConcurrency: 2,
      defaultProvider: ArchiveService.mock,
      maxAttempts: 3,
      workerPaused: false,
    },
  });

  console.log("Seeding complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
