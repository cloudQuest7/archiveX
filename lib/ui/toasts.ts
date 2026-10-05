"use client";

import { toast } from "sonner";

export const toasts = {
  discoveryStarted(domain: string) {
    toast.success(`Discovery started`, {
      description: `Crawling ${domain} for public URLs.`,
    });
  },
  urlsDiscovered(count: number, newCount?: number) {
    const suffix =
      typeof newCount === "number" && newCount > 0
        ? ` · +${newCount} new`
        : "";
    toast.success(`URLs discovered`, {
      description: `${count} URLs found${suffix}.`,
    });
  },
  scanCompleted(count: number, newCount: number) {
    toast.success(`Scan completed`, {
      description: `${count} total URLs · +${newCount} new.`,
    });
  },
  scanFailed(message: string) {
    toast.error(`Scan failed`, { description: message });
  },
  queueStarted() {
    toast.success(`Archival queue started`);
  },
  queuePaused() {
    toast(`Archival queue paused`, { description: `Processing is on hold.` });
  },
  queueResumed() {
    toast.success(`Archival queue resumed`);
  },
  archiveCompleted(success: number, failed: number) {
    if (failed === 0) {
      toast.success(`Archive completed`, {
        description: `${success} URLs archived successfully.`,
      });
    } else {
      toast(`Archive completed`, {
        description: `${success} succeeded · ${failed} failed.`,
      });
    }
  },
  someFailed(failed: number) {
    if (failed > 0) {
      toast.error(`${failed} URL${failed === 1 ? "" : "s"} failed`, {
        description: `Use Retry Failed to re-queue.`,
      });
    }
  },
  retryFailed(count: number) {
    toast.success(`Re-queued ${count} failed job${count === 1 ? "" : "s"}`);
  },
  genericSuccess(title: string, description?: string) {
    toast.success(title, description ? { description } : undefined);
  },
  genericError(title: string, description?: string) {
    toast.error(title, description ? { description } : undefined);
  },
};
