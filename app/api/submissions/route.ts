import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { SubmissionStatus, ArchiveService } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const urlRecordId = searchParams.get("urlRecordId") || undefined;
  const domainId = searchParams.get("domainId") || undefined;
  const service = (searchParams.get("service") as ArchiveService | undefined) || undefined;
  const status = (searchParams.get("status") as SubmissionStatus | undefined) || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = Math.min(parseInt(searchParams.get("perPage") || "25"), 100);

  const where: any = {};
  if (urlRecordId) where.urlRecordId = urlRecordId;
  if (domainId) where.urlRecord = { domainId };
  if (service) where.service = service;
  if (status) where.status = status;
  const submittedAt: any = {};
  if (from) submittedAt.gte = new Date(from);
  if (to) submittedAt.lte = new Date(to + "T23:59:59");
  if (Object.keys(submittedAt).length) where.submittedAt = submittedAt;

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        urlRecord: {
          select: {
            originalUrl: true,
            normalizedUrl: true,
            domain: { select: { id: true, hostname: true } },
          },
        },
      },
    }),
    prisma.submission.count({ where }),
  ]);

  return Response.json({ submissions, total, page, perPage });
}
