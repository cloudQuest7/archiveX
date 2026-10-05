import { prisma } from "@/lib/db/prisma";
import type { SubmissionStatus, ArchiveService, QueueJob } from "@prisma/client";
import {
  pickNextPending,
  markSuccess,
  markFailure,
  resetStuckProcessing,
} from "./queue";
import { DEFAULT_RETRY_POLICY, shouldRetry, computeDelay } from "./retry";
import { getProvider } from "@/lib/archive/registry";
import type { ArchiveSubmitResult } from "@/lib/archive/provider";

type WorkerState = {
  paused: boolean;
  running: boolean;
  lastHeartbeat: Date | null;
  currentJobId: string | null;
};

const state: WorkerState = {
  paused: false,
  running: false,
  lastHeartbeat: null,
  currentJobId: null,
};

export function getWorkerState(): WorkerState {
  return { ...state };
}

export function setWorkerPaused(paused: boolean): void {
  state.paused = paused;
}

async function ensureSettings() {
  const s = await prisma.appSetting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  return s;
}

async function createSubmissionRecord(params: {
  urlRecordId: string;
  service: ArchiveService;
  status: SubmissionStatus;
  archiveUrl?: string | null;
  archiveIdentifier?: string | null;
  errorMessage?: string | null;
  isMock: boolean;
  attemptCount: number;
}) {
  return prisma.submission.create({
    data: {
      urlRecordId: params.urlRecordId,
      service: params.service,
      status: params.status,
      submittedAt: new Date(),
      completedAt:
        params.status === "SUCCESS" || params.status === "FAILED"
          ? new Date()
          : undefined,
      archiveUrl: params.archiveUrl || null,
      archiveIdentifier: params.archiveIdentifier || null,
      errorMessage: params.errorMessage || null,
      isMock: params.isMock,
      lastAttemptAt: new Date(),
      attemptCount: params.attemptCount,
    },
  });
}

async function processJob(job: NonNullable<Awaited<ReturnType<typeof pickNextPending>>>) {
  const settings = await ensureSettings();
  const attempts = (job.attempts || 0) + 1;
  state.currentJobId = job.id;

  let submitResult: ArchiveSubmitResult;
  try {
    const provider = getProvider(job.service as any);
    submitResult = await provider.submit(job.urlRecord.originalUrl);
  } catch (err: any) {
    submitResult = {
      success: false,
      error:
        err?.message?.toString()?.slice(0, 500) ||
        "Unexpected error calling provider",
    };
  }

  const isMock = submitResult.isMock === true || job.service === "mock";

  if (submitResult.success) {
    await createSubmissionRecord({
      urlRecordId: job.urlRecordId,
      service: job.service,
      status: "SUCCESS",
      archiveUrl: submitResult.archiveUrl || null,
      archiveIdentifier: submitResult.archiveIdentifier || null,
      errorMessage: null,
      isMock,
      attemptCount: attempts,
    });
    await markSuccess(job.id, new Date());
    await prisma.domain.update({
      where: { id: job.domainId },
      data: { lastSubmissionAt: new Date() },
    });
  } else {
    await createSubmissionRecord({
      urlRecordId: job.urlRecordId,
      service: job.service,
      status: shouldRetry(attempts, settings.maxAttempts)
        ? "RETRYING"
        : "FAILED",
      archiveUrl: null,
      archiveIdentifier: null,
      errorMessage: submitResult.error || null,
      isMock,
      attemptCount: attempts,
    });
    await markFailure(
      job.id,
      submitResult.error || "Submission failed",
      attempts,
      settings.maxAttempts
    );
    if (shouldRetry(attempts, settings.maxAttempts)) {
      const delayMs = computeDelay(attempts, {
        baseDelayMs: DEFAULT_RETRY_POLICY.baseDelayMs,
        maxDelayMs: DEFAULT_RETRY_POLICY.maxDelayMs,
      });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  state.currentJobId = null;
}

let workerLoopPromise: Promise<void> | null = null;

async function loop() {
  try {
    await resetStuckProcessing(10 * 60 * 1000);
  } catch {
    /* ignore */
  }

  while (state.running) {
    state.lastHeartbeat = new Date();
    if (state.paused) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    try {
      const job = await pickNextPending();
      if (!job) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      await processJob(job);
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export function startWorker(): void {
  if (state.running) return;
  state.running = true;
  workerLoopPromise = loop();
}

export async function stopWorker(): Promise<void> {
  state.running = false;
  if (workerLoopPromise) await workerLoopPromise.catch(() => {});
  workerLoopPromise = null;
}

export function getOrCreateWorker(): typeof state {
  if (!state.running) startWorker();
  return getWorkerState();
}
