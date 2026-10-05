import { prisma } from "@/lib/db/prisma";
import type { ArchiveService, DiscoverySource } from "@prisma/client";
import { enqueueUrlRecords } from "@/lib/queue/queue";
import type { DiscoveredUrl } from "@/lib/crawler/crawler";

export async function upsertDiscoveredUrls(
  domainId: string,
  discovered: DiscoveredUrl[]
): Promise<{ newCount: number; existingCount: number }> {
  let newCount = 0;
  let existingCount = 0;

  for (const d of discovered) {
    const existing = await prisma.urlRecord.findUnique({
      where: {
        domainId_normalizedUrl: {
          domainId,
          normalizedUrl: d.normalizedUrl,
        },
      },
      select: { id: true, httpStatus: true },
    });

    if (existing) {
      const updateData: any = {
        lastDiscoveredAt: d.discoveredAt,
      };
      if (existing.httpStatus == null && d.httpStatus != null) {
        updateData.httpStatus = d.httpStatus;
        if (d.httpStatus >= 200 && d.httpStatus < 400) {
          updateData.isAccessible = true;
        }
      }
      await prisma.urlRecord.update({
        where: { id: existing.id },
        data: updateData,
      });
      existingCount++;
    } else {
      await prisma.urlRecord.create({
        data: {
          domainId,
          originalUrl: d.url,
          normalizedUrl: d.normalizedUrl,
          discoverySource: d.source as DiscoverySource,
          httpStatus: d.httpStatus,
          isAccessible: d.httpStatus != null && d.httpStatus >= 200 && d.httpStatus < 400,
          firstDiscoveredAt: d.discoveredAt,
          lastDiscoveredAt: d.discoveredAt,
        },
      });
      newCount++;
    }
  }

  return { newCount, existingCount };
}

export async function enqueueUnarchivedUrls(
  domainId: string,
  service: ArchiveService
): Promise<number> {
  const unarchived = await prisma.urlRecord.findMany({
    where: {
      domainId,
      submissions: {
        none: {
          status: "SUCCESS",
        },
      },
    },
    select: {
      id: true,
      domainId: true,
    },
  });

  type UnarchivedUrl = (typeof unarchived)[number];
  const toEnqueue = unarchived.map((u: UnarchivedUrl) => ({
    urlRecordId: u.id,
    domainId: u.domainId,
    service,
  }));

  return enqueueUrlRecords(toEnqueue, true);
}
