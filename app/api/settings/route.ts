import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AppSettingsSchema } from "@/lib/validation/zod-schemas";
import { getWorkerState } from "@/lib/queue/worker";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.appSetting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  let dbStatus = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`.catch(() => { dbStatus = "error"; });
  } catch {
    dbStatus = "error";
  }

  return Response.json({
    settings,
    system: {
      database: dbStatus,
      worker: getWorkerState(),
    },
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = AppSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const settings = await prisma.appSetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data,
  });

  return Response.json({ settings });
}
