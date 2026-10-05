import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOverview } from "@/lib/queue/queue";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const domain = await prisma.domain.findUnique({
    where: { id },
    include: {
      project: true,
      _count: {
        select: { urls: true, scans: true, jobs: true },
      },
      urls: {
        select: {
          submissions: {
            select: { status: true },
          },
        },
      },
      scans: {
        orderBy: { startedAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          discoveredCount: true,
          newUrlCount: true,
          errorMessage: true,
        },
      },
    },
  });

  if (!domain) {
    return Response.json({ error: "Domain not found" }, { status: 404 });
  }

  let archived = 0;
  let pending = 0;
  let failed = 0;
  for (const url of domain.urls) {
    const hasSuccess = url.submissions.some(
      (s: { status: string }) => s.status === "SUCCESS"
    );
    const hasFailed = url.submissions.some(
      (s: { status: string }) => s.status === "FAILED"
    );
    const hasPending = url.submissions.some(
      (s: { status: string }) =>
        s.status === "PENDING" ||
        s.status === "PROCESSING" ||
        s.status === "RETRYING"
    );
    if (hasSuccess) archived++;
    else if (hasPending) pending++;
    else if (hasFailed) failed++;
  }
  const noSubmission = domain._count.urls - archived - pending - failed;

  const queueOverview = await getOverview(id);

  const result = {
    id: domain.id,
    hostname: domain.hostname,
    originalUrl: domain.originalUrl,
    status: domain.status,
    lastScanAt: domain.lastScanAt,
    lastSubmissionAt: domain.lastSubmissionAt,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
    project: domain.project,
    counts: {
      totalUrls: domain._count.urls,
      totalScans: domain._count.scans,
      totalJobs: domain._count.jobs,
      archived,
      pending: pending + noSubmission,
      failed,
    },
    scans: domain.scans,
    queueOverview,
  };

  return Response.json(result);
}
