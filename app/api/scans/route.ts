import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { StartScanSchema } from "@/lib/validation/zod-schemas";
import { runCrawler } from "@/lib/crawler/crawler";
import { upsertDiscoveredUrls, enqueueUnarchivedUrls } from "./scan-helpers";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = StartScanSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }
  const { domainId } = parsed.data;

  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return Response.json({ error: "Domain not found" }, { status: 404 });

  const scan = await prisma.scan.create({
    data: {
      domainId,
      status: "RUNNING",
      startedAt: new Date(),
      discoveredCount: 0,
      newUrlCount: 0,
    },
  });

  void (async () => {
    try {
      const settings = await prisma.appSetting.upsert({
        where: { id: 1 },
        create: { id: 1 },
        update: {},
      });

      const discovered = await runCrawler({
        targetUrl: domain.originalUrl,
        maxUrls: settings.maxUrls || 500,
        timeoutMs: settings.requestTimeoutMs || 10_000,
        concurrency: settings.crawlConcurrency || 2,
      });

      const { newCount, existingCount } = await upsertDiscoveredUrls(domainId, discovered);

      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          discoveredCount: discovered.length,
          newUrlCount: newCount,
        },
      });
      await prisma.domain.update({
        where: { id: domainId },
        data: { lastScanAt: new Date(), status: "ACTIVE" },
      });

      await enqueueUnarchivedUrls(domainId, settings.defaultProvider);
    } catch (err: any) {
      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: err?.message?.toString()?.slice(0, 1000) || "Scan failed",
        },
      });
      await prisma.domain.update({
        where: { id: domainId },
        data: { status: "ERROR" },
      });
    }
  })();

  return Response.json({ scan }, { status: 202 });
}
