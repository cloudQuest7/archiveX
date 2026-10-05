import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AddDomainSchema } from "@/lib/validation/zod-schemas";
import { getHostname, normalizeUrl } from "@/lib/crawler/url-normalizer";

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      domains: {
        include: {
          _count: {
            select: { urls: true },
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
            take: 1,
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = projects.map((project: any) => ({
    ...project,
    domains: project.domains.map((domain: any) => {
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
      return {
        id: domain.id,
        hostname: domain.hostname,
        originalUrl: domain.originalUrl,
        status: domain.status,
        lastScanAt: domain.lastScanAt,
        lastSubmissionAt: domain.lastSubmissionAt,
        createdAt: domain.createdAt,
        urlsCount: domain._count.urls,
        archived,
        pending:
          pending +
          (domain._count.urls - archived - pending - failed > 0
            ? domain._count.urls - archived - pending - failed
            : 0),
        failed,
        lastScan: domain.scans[0] || null,
      };
    }),
  }));

  return Response.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = AddDomainSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { url, projectName } = parsed.data;
  const hostname = getHostname(url);
  const originalUrl = normalizeUrl(url);

  const project = await prisma.project.create({
    data: {
      name: projectName || null,
      domains: {
        create: {
          hostname,
          originalUrl,
          status: "PENDING",
        },
      },
    },
    include: {
      domains: true,
    },
  });

  const domain = project.domains[0];

  return Response.json({ project, domain }, { status: 201 });
}
