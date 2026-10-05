import { prisma } from "@/lib/db/prisma";
import type {
  ArchiveService,
  QueueStatus,
  QueueJob,
  UrlRecord,
  Domain,
} from "@prisma/client";

export type QueueOverview = {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  retrying: number;
  cancelled: number;
};

export async function getOverview(
  domainId?: string
): Promise<QueueOverview> {
  const base = domainId ? { where: { domainId } } : {};
  const counts = await prisma.queueJob.groupBy({
    by: ["status"],
    where: base.where,
    _count: { status: true },
  });
  const map: Record<string, number> = {};
  for (const c of counts) map[c.status] = c._count.status;
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  return {
    total,
    pending: map["PENDING"] ?? 0,
    processing: map["PROCESSING"] ?? 0,
    success: map["SUCCESS"] ?? 0,
    failed: map["FAILED"] ?? 0,
    retrying: map["RETRYING"] ?? 0,
    cancelled: map["CANCELLED"] ?? 0,
  };
}

export async function enqueueUrlRecords(
  input: {
    urlRecordId: string;
    domainId: string;
    service: ArchiveService;
    priority?: number;
  }[],
  skipIfExistingActive = true
): Promise<number> {
  if (input.length === 0) return 0;
  let added = 0;
  for (const it of input) {
    if (skipIfExistingActive) {
      const existing = await prisma.queueJob.findFirst({
        where: {
          urlRecordId: it.urlRecordId,
          status: { in: ["PENDING", "PROCESSING", "RETRYING"] },
        },
        select: { id: true },
      });
      if (existing) continue;
    }
    await prisma.queueJob.create({
      data: {
        urlRecordId: it.urlRecordId,
        domainId: it.domainId,
        service: it.service,
        priority: it.priority ?? 0,
        status: "PENDING",
        attempts: 0,
      },
    });
    added++;
  }
  return added;
}

export async function pickNextPending(): Promise<
  | (QueueJob & { urlRecord: UrlRecord & { domain: Domain } })
  | null
> {
  const next = await prisma.queueJob.findFirst({
    where: { status: { in: ["PENDING", "RETRYING"] } },
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" },
    ],
    include: { urlRecord: { include: { domain: true } } },
  });
  if (!next) return null;
  const updated = await prisma.queueJob.update({
    where: { id: next.id, status: { in: ["PENDING", "RETRYING"] } },
    data: { status: "PROCESSING", startedAt: new Date() },
    include: { urlRecord: { include: { domain: true } } },
  });
  return updated;
}

export async function markSuccess(
  jobId: string,
  completedAt: Date
): Promise<void> {
  await prisma.queueJob.update({
    where: { id: jobId },
    data: { status: "SUCCESS", completedAt },
  });
}

export async function markFailure(
  jobId: string,
  errorMessage: string,
  attempts: number,
  maxAttempts: number
): Promise<"RETRYING" | "FAILED"> {
  const willRetry = attempts < maxAttempts;
  const newStatus: QueueStatus = willRetry ? "RETRYING" : "FAILED";
  await prisma.queueJob.update({
    where: { id: jobId },
    data: {
      status: newStatus,
      errorMessage: errorMessage.slice(0, 1000),
      attempts,
      completedAt: willRetry ? null : new Date(),
    },
  });
  return newStatus;
}

export async function retryFailed(domainId?: string): Promise<number> {
  const where = {
    status: "FAILED" as QueueStatus,
    ...(domainId ? { domainId } : {}),
  } as const;
  const res = await prisma.queueJob.updateMany({
    where,
    data: {
      status: "PENDING",
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    },
  });
  return res.count;
}

export async function cancelPending(domainId?: string): Promise<number> {
  const where = {
    status: { in: ["PENDING", "RETRYING"] as QueueStatus[] },
    ...(domainId ? { domainId } : {}),
  } as const;
  const res = await prisma.queueJob.updateMany({
    where,
    data: { status: "CANCELLED", completedAt: new Date() },
  });
  return res.count;
}

export async function resetStuckProcessing(
  thresholdMs = 10 * 60 * 1000
): Promise<number> {
  const cutoff = new Date(Date.now() - thresholdMs);
  const candidates = await prisma.queueJob.findMany({
    where: {
      status: "PROCESSING",
      startedAt: { not: null, lt: cutoff },
    },
    select: { id: true, attempts: true },
  });
  if (candidates.length === 0) return 0;
  let reset = 0;
  for (const c of candidates) {
    const next: QueueStatus = c.attempts === 0 ? "PENDING" : "RETRYING";
    await prisma.queueJob.update({
      where: { id: c.id },
      data: { status: next, startedAt: null, errorMessage: "Job reset: stuck in PROCESSING" },
    });
    reset++;
  }
  return reset;
}

export async function listJobs(params: {
  status?: QueueStatus | "ALL";
  domainId?: string;
  page?: number;
  perPage?: number;
}) {
  const { page = 1, perPage = 25 } = params;
  const where: any = {};
  if (params.status && params.status !== "ALL") where.status = params.status;
  if (params.domainId) where.domainId = params.domainId;
  const [rows, total] = await Promise.all([
    prisma.queueJob.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        urlRecord: {
          select: { originalUrl: true, normalizedUrl: true },
        },
        domain: { select: { hostname: true } },
      },
    }),
    prisma.queueJob.count({ where }),
  ]);
  return { rows, total, page, perPage };
}
