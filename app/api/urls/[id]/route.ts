import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const urlRecord = await prisma.urlRecord.findUnique({
    where: { id },
    include: {
      domain: {
        select: {
          id: true,
          hostname: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
      },
      jobs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!urlRecord) {
    return Response.json({ error: "URL record not found" }, { status: 404 });
  }

  return Response.json({ urlRecord });
}
