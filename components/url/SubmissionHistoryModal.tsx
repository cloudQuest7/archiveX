"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Globe,
  History,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Submission = {
  id: string;
  service: string;
  status: string;
  submittedAt: string;
  completedAt: string | null;
  archiveUrl: string | null;
  errorMessage: string | null;
  attemptCount: number;
};

type UrlRecordType = {
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  discoverySource: string;
  httpStatus: number | null;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
};

export function SubmissionHistoryModal({
  open,
  onOpenChange,
  urlRecordId,
  maxAttempts = 3,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  urlRecordId: string | null;
  maxAttempts?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [urlRecord, setUrlRecord] = useState<UrlRecordType | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (!open || !urlRecordId) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [subRes, urlRes] = await Promise.all([
          fetch(`/api/submissions?urlRecordId=${urlRecordId}`),
          fetch(`/api/urls/${urlRecordId}`),
        ]);
        if (subRes.ok) {
          const data = await subRes.json();
          if (!cancelled) setSubmissions(data.submissions || data || []);
        }
        if (urlRes.ok) {
          const data = await urlRes.json();
          if (!cancelled) setUrlRecord(data.urlRecord || data || null);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [open, urlRecordId]);

  const displayUrl = urlRecord?.originalUrl || urlRecord?.normalizedUrl || "";

  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Submission History
          </DialogTitle>
          <DialogDescription className="break-all">
            {displayUrl || (loading ? "Loading…" : "—")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {urlRecord && (
            <div className="mb-6 rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Discovery:</span>{" "}
                  <Badge variant="secondary" className="ml-1">
                    {urlRecord.discoverySource}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">HTTP:</span>{" "}
                  <span className="font-medium ml-1">
                    {urlRecord.httpStatus ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">First seen:</span>{" "}
                  <span className="ml-1">
                    {formatDate(urlRecord.firstDiscoveredAt)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last seen:</span>{" "}
                  <span className="ml-1">
                    {formatDate(urlRecord.lastDiscoveredAt)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
              <div className="h-16 bg-muted animate-pulse rounded" />
              <div className="h-16 bg-muted animate-pulse rounded" />
            </div>
          )}

          {!loading && (
            <div className="relative pl-6">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

              <TimelineItem
                dot={<Globe className="h-3 w-3" />}
                dotClassName="bg-background border text-muted-foreground"
                title="Discovered"
                time={formatDate(urlRecord?.firstDiscoveredAt)}
                description="First time this URL was found during crawl."
              />

              {submissions.length === 0 && (
                <div className="mt-6 text-sm text-muted-foreground italic">
                  No archival submissions yet.
                </div>
              )}

              {submissions.map((sub) => (
                <div key={sub.id} className="mt-4">
                  <TimelineItem
                    dot={<Clock className="h-3 w-3" />}
                    dotClassName="bg-background border text-muted-foreground"
                    title={`Submitted to ${serviceLabel(sub.service)}`}
                    time={formatDate(sub.submittedAt)}
                    description={`Attempt ${sub.attemptCount || 1} of ${maxAttempts}`}
                  />
                  {sub.status === "SUCCESS" ? (
                    <div className="mt-3 ml-6">
                      <TimelineItem
                        dot={<CheckCircle2 className="h-3 w-3" />}
                        dotClassName="bg-background border border-emerald-300 text-emerald-600"
                        title="Archived successfully"
                        time={formatDate(sub.completedAt)}
                        description={
                          sub.archiveUrl ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="mt-2 h-7"
                            >
                              <a
                                href={sub.archiveUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open Archive
                              </a>
                            </Button>
                          ) : undefined
                        }
                      />
                    </div>
                  ) : sub.status === "FAILED" ? (
                    <div className="mt-3 ml-6">
                      <TimelineItem
                        dot={<XCircle className="h-3 w-3" />}
                        dotClassName="bg-background border border-destructive/40 text-destructive"
                        title="Submission failed"
                        time={formatDate(sub.completedAt || sub.submittedAt)}
                        description={
                          <div className="space-y-2">
                            {sub.errorMessage && (
                              <p className="text-destructive text-xs font-mono bg-destructive/5 border border-destructive/20 rounded px-2 py-1">
                                {sub.errorMessage}
                              </p>
                            )}
                            {(sub.attemptCount || 0) < maxAttempts && (
                              <Badge variant="warning" className="mt-1">
                                <RefreshCw className="h-3 w-3 mr-1 inline" />
                                Will retry
                              </Badge>
                            )}
                          </div>
                        }
                      />
                    </div>
                  ) : sub.status === "PROCESSING" || sub.status === "PENDING" || sub.status === "RETRYING" ? (
                    <div className="mt-3 ml-6">
                      <TimelineItem
                        dot={<RefreshCw className="h-3 w-3 animate-spin" />}
                        dotClassName="bg-background border text-primary"
                        title={statusLabel(sub.status)}
                        time={formatDate(sub.submittedAt)}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          {displayUrl && (
            <Button asChild size="sm" variant="ghost">
              <a href={displayUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Visit URL
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TimelineItem({
  dot,
  dotClassName,
  title,
  time,
  description,
}: {
  dot: React.ReactNode;
  dotClassName?: string;
  title: string;
  time: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          "absolute -left-6 top-0.5 h-6 w-6 rounded-full flex items-center justify-center",
          dotClassName
        )}
      >
        {dot}
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {time}
          </span>
        </div>
        {description && (
          <div className="mt-1 text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

function serviceLabel(s: string) {
  switch (s) {
    case "wayback":
      return "Wayback Machine";
    case "archive_today":
      return "Archive.today";
    case "mock":
      return "Development (mock)";
    default:
      return s;
  }
}

function statusLabel(s: string) {
  switch (s) {
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "RETRYING":
      return "Retrying";
    case "SUCCESS":
      return "Success";
    case "FAILED":
      return "Failed";
    default:
      return s;
  }
}
