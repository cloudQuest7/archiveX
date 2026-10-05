import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { RepositoryQuerySchema } from "@/lib/validation/zod-schemas";

export async function GET(req: NextRequest) {
  const raw: any = {};
  const { searchParams } = new URL(req.url);
  for (const [k, v] of searchParams.entries()) raw[k] = v;

  const parsed = RepositoryQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const q = parsed.data;

  const where: any = {};
  if (q.q) {
    where.OR = [
      { originalUrl: { contains: q.q } },
      { normalizedUrl: { contains: q.q } },
      { domain: { hostname: { contains: q.q } } },
    ];
  }
  if (q.domainId) where.domainId = q.domainId;
  if (q.discoverySource) where.discoverySource = q.discoverySource;
  if (q.httpStatus) where.httpStatus = q.httpStatus;

  if (q.archiveStatus) {
    const s = q.archiveStatus;
    if (s === "NO_SUBMISSION") {
      where.submissions = { none: {} };
    } else if (s === "ARCHIVED") {
      where.submissions = { some: { status: "SUCCESS" } };
    } else if (s === "PENDING") {
      where.AND = [
        { submissions: { none: { status: "SUCCESS" } } },
        {
          OR: [
            { submissions: { some: { status: { in: ["PENDING", "PROCESSING", "RETRYING"] } } } },
            { jobs: { some: { status: { in: ["PENDING", "PROCESSING", "RETRYING"] } } } },
          ],
        },
      ];
    } else if (s === "FAILED") {
      where.AND = [
        { submissions: { none: { status: "SUCCESS" } } },
        { submissions: { some: { status: "FAILED" } } },
      ];
    }
  }

  if (q.service) {
    where.submissions = where.submissions || {};
    if (q.archiveStatus) {
    } else {
      where.submissions = { some: { service: q.service as any } };
    }
  }

  const orderBy: any = [];
  switch (q.sortBy) {
    case "url_asc": orderBy.push({ originalUrl: "asc" }); break;
    case "url_desc": orderBy.push({ originalUrl: "desc" }); break;
    case "domain_asc": orderBy.push({ domain: { hostname: "asc" } }); break;
    case "created_desc": orderBy.push({ firstDiscoveredAt: "desc" }); break;
    case "lastSubmitted_asc":
    case "lastSubmitted_desc":
    default:
      orderBy.push({ lastDiscoveredAt: "desc" });
  }

  const skip = (q.page - 1) * q.perPage;
  const take = q.perPage;

  const [rows, total] = await Promise.all([
    prisma.urlRecord.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        domain: { select: { id: true, hostname: true } },
        submissions: {
          orderBy: { submittedAt: "desc" },
        },
      },
    }),
    prisma.urlRecord.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / q.perPage));

  type RawRow = (typeof rows)[number];

  const rowsMapped = rows.map((r: RawRow) => {
    const latestSubmission = r.submissions[0] || null;
    const _lastSubmittedAt = latestSubmission?.submittedAt?.getTime() ?? 0;
    return {
      ...r,
      hostname: r.domain?.hostname || "",
      lastSubmittedAt: latestSubmission?.submittedAt || null,
      archiveUrl: latestSubmission?.archiveUrl || null,
      archiveService: latestSubmission?.service || null,
      latestSubmission,
      _lastSubmittedAt,
    };
  });
  type MappedRow = (typeof rowsMapped)[number];
  if (q.sortBy === "lastSubmitted_desc") {
    rowsMapped.sort((a: MappedRow, b: MappedRow) => b._lastSubmittedAt - a._lastSubmittedAt);
  } else if (q.sortBy === "lastSubmitted_asc") {
    rowsMapped.sort((a: MappedRow, b: MappedRow) => a._lastSubmittedAt - b._lastSubmittedAt);
  }
  rowsMapped.forEach((r: MappedRow) => {
    delete (r as any)._lastSubmittedAt;
    delete (r as any).domain;
    delete (r as any).latestSubmission;
  });

  return Response.json({
    urls: rowsMapped,
    total,
    page: q.page,
    perPage: q.perPage,
    totalPages,
  });
}
