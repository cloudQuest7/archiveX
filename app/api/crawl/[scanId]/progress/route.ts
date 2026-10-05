import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const { scanId } = params;
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      domain: {
        select: {
          id: true,
          _count: { select: { urls: true } },
        },
      },
    },
  });

  if (!scan) {
    return Response.json({ error: "Scan not found" }, { status: 404 });
  }

  return Response.json({
    scan: {
      id: scan.id,
      status: scan.status,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt,
      discoveredCount: scan.discoveredCount,
      newUrlCount: scan.newUrlCount,
      errorMessage: scan.errorMessage,
    },
    totalUrlsInDomain: scan.domain._count.urls,
  });
}
