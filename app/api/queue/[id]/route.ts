import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const job = await prisma.queueJob.findUnique({
    where: { id },
    include: {
      urlRecord: true,
      domain: { select: { hostname: true, id: true } },
    },
  });
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  return Response.json({ job });
}
