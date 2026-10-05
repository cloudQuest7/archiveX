-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastScanAt" DATETIME,
    "lastSubmissionAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "domains_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "url_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domainId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "discoverySource" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "isAccessible" BOOLEAN NOT NULL DEFAULT false,
    "firstDiscoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDiscoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "url_records_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "urlRecordId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "archiveUrl" TEXT,
    "archiveIdentifier" TEXT,
    "errorMessage" TEXT,
    "lastAttemptAt" DATETIME,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "submissions_urlRecordId_fkey" FOREIGN KEY ("urlRecordId") REFERENCES "url_records" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "queue_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "urlRecordId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "queue_jobs_urlRecordId_fkey" FOREIGN KEY ("urlRecordId") REFERENCES "url_records" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "queue_jobs_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domainId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "discoveredCount" INTEGER NOT NULL DEFAULT 0,
    "newUrlCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    CONSTRAINT "scans_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "maxUrls" INTEGER NOT NULL DEFAULT 500,
    "requestTimeoutMs" INTEGER NOT NULL DEFAULT 10000,
    "crawlConcurrency" INTEGER NOT NULL DEFAULT 2,
    "defaultProvider" TEXT NOT NULL DEFAULT 'mock',
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "workerPaused" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "domains_projectId_hostname_key" ON "domains"("projectId", "hostname");

-- CreateIndex
CREATE INDEX "url_records_normalizedUrl_idx" ON "url_records"("normalizedUrl");

-- CreateIndex
CREATE UNIQUE INDEX "url_records_domainId_normalizedUrl_key" ON "url_records"("domainId", "normalizedUrl");

-- CreateIndex
CREATE INDEX "submissions_urlRecordId_status_idx" ON "submissions"("urlRecordId", "status");

-- CreateIndex
CREATE INDEX "submissions_service_status_idx" ON "submissions"("service", "status");

-- CreateIndex
CREATE INDEX "queue_jobs_status_priority_createdAt_idx" ON "queue_jobs"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "queue_jobs_domainId_idx" ON "queue_jobs"("domainId");
