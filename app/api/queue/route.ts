import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  getOverview,
  retryFailed,
  cancelPending,
  listJobs,
} from "@/lib/queue/queue";
import {
  startWorker,
  setWorkerPaused,
  getWorkerState,
} from "@/lib/queue/worker";
import { QueueActionSchema } from "@/lib/validation/zod-schemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "ALL") as any;
  const domainId = searchParams.get("domainId") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "25");

  const overview = await getOverview(domainId);
  const jobs = await listJobs({ status, domainId, page, perPage });

  const workerState = getWorkerState();

  const currentJobUrl = workerState.currentJobId
    ? await prisma.queueJob
        .findUnique({
          where: { id: workerState.currentJobId },
          include: { urlRecord: { select: { originalUrl: true } } },
        })
        .catch(() => null)
    : null;

  const total = overview.total || 0;
  const pending = overview.pending || 0;
  const processing = overview.processing || 0;
  const success = overview.success || 0;
  const failed = overview.failed || 0;

  let workerStatus: "RUNNING" | "PAUSED" | "STOPPED" = "STOPPED";
  if (workerState.running) {
    workerStatus = workerState.paused ? "PAUSED" : "RUNNING";
  }

  return Response.json({
    jobs: jobs.rows,
    stats: {
      total,
      pending,
      processing,
      success,
      failed,
      currentUrl: currentJobUrl?.urlRecord?.originalUrl || null,
      workerStatus,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = QueueActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const { action, domainId } = parsed.data;

  let countChanged = 0;
  switch (action) {
    case "start":
      setWorkerPaused(false);
      startWorker();
      break;
    case "pause":
      setWorkerPaused(true);
      break;
    case "resume":
      setWorkerPaused(false);
      startWorker();
      break;
    case "retry-failed":
      countChanged = await retryFailed(domainId);
      break;
    case "cancel-pending":
      countChanged = await cancelPending(domainId);
      break;
  }

  await prisma.appSetting.upsert({
    where: { id: 1 },
    create: { id: 1, workerPaused: action === "pause" },
    update: { workerPaused: action === "pause" },
  });

  return Response.json({
    ok: true,
    action,
    countChanged,
    worker: getWorkerState(),
  });
}
