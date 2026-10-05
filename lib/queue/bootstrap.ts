import { prisma } from "@/lib/db/prisma";
import { startWorker } from "./worker";
import { resetStuckProcessing } from "./queue";

let bootstrapped = false;

export async function bootstrapQueueSystem() {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    await prisma.appSetting.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  } catch {
    /* DB migrations may not have run yet — swallow. */
  }

  try {
    await resetStuckProcessing(10 * 60 * 1000);
  } catch {
    /* swallow */
  }

  startWorker();
}
