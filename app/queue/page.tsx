"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { toasts } from "@/lib/ui/toasts";
import { cn } from "@/lib/utils";

type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "RETRYING"
  | "SUCCESS"
  | "FAILED";

interface Job {
  id: string;
  url: string;
  hostname: string;
  service: string;
  status: JobStatus;
  attemptCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  currentUrl: string | null;
  workerStatus: "RUNNING" | "PAUSED" | "STOPPED";
}

interface QueueResponse {
  jobs: Job[];
  stats: QueueStats;
}

const KPI_CARD_STYLES =
  "flex items-start gap-4 p-5 rounded-xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
const KPI_ICON_BOX =
  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0";

function serviceLabel(s: string) {
  switch (s) {
    case "wayback":
      return "Wayback Machine";
    case "archive_today":
      return "Archive.today";
    case "mock":
      return "Dev Provider";
    default:
      return s;
  }
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  switch (status) {
    case "SUCCESS":
      return <Badge variant="success">Success</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "PROCESSING":
      return (
        <Badge variant="default">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "RETRYING":
      return (
        <Badge variant="warning">
          <RefreshCw className="h-3 w-3 mr-1" />
          Retrying
        </Badge>
      );
    case "PENDING":
    default:
      return <Badge variant="muted">Pending</Badge>;
  }
}

function WorkerStatusBadge({
  status,
}: {
  status: QueueStats["workerStatus"];
}) {
  switch (status) {
    case "RUNNING":
      return (
        <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200/70">
          Archiving…
        </Badge>
      );
    case "PAUSED":
      return <Badge variant="warning">Paused</Badge>;
    case "STOPPED":
    default:
      return <Badge variant="muted">Idle</Badge>;
  }
}

export default function QueuePage() {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    success: 0,
    failed: 0,
    currentUrl: null,
    workerStatus: "STOPPED",
  });
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/queue");
      if (res.ok) {
        const data: QueueResponse = await res.json();
        setJobs(data.jobs || []);
        setStats(data.stats || {
          total: 0,
          pending: 0,
          processing: 0,
          success: 0,
          failed: 0,
          currentUrl: null,
          workerStatus: "STOPPED",
        });
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const runAction = React.useCallback(
    async (action: "start" | "pause" | "resume" | "retry-failed") => {
      setActionLoading(action);
      try {
        const res = await fetch("/api/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.ok) {
          if (action === "start") toasts.queueStarted();
          else if (action === "pause") toasts.queuePaused();
          else if (action === "resume") toasts.queueResumed();
          else if (action === "retry-failed") {
            const data = await res.json().catch(() => ({}));
            toasts.retryFailed(data.countChanged || stats.failed || 0);
          }
          await fetchData();
        } else {
          toasts.genericError(
            "Action failed",
            `Could not ${action.replace("-", " ")} queue.`
          );
        }
      } catch {
        toasts.genericError("Network error", "Could not reach queue API.");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchData, stats.failed]
  );

  const completed = stats.success + stats.failed;
  const progressTotal = completed + stats.pending + stats.processing;
  const progressPct = progressTotal > 0 ? (stats.success / progressTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Queue</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Background archival submission processing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className={KPI_CARD_STYLES}>
          <CardContent className="p-0 flex items-start gap-4 w-full">
            <div className={cn(KPI_ICON_BOX, "bg-primary/10 text-primary")}>
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Total Jobs
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {loading ? (
                  <Skeleton className="h-7 w-14 inline-block" />
                ) : (
                  stats.total
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={KPI_CARD_STYLES}>
          <CardContent className="p-0 flex items-start gap-4 w-full">
            <div className={cn(KPI_ICON_BOX, "bg-amber-50 text-amber-600")}>
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Pending
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">
                {loading ? (
                  <Skeleton className="h-7 w-14 inline-block" />
                ) : (
                  stats.pending
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={KPI_CARD_STYLES}>
          <CardContent className="p-0 flex items-start gap-4 w-full">
            <div className={cn(KPI_ICON_BOX, "bg-blue-50 text-blue-600")}>
              <Loader2 className={cn("h-5 w-5", !loading && stats.processing > 0 && "animate-spin")} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Processing
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-blue-700">
                {loading ? (
                  <Skeleton className="h-7 w-14 inline-block" />
                ) : (
                  stats.processing
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={KPI_CARD_STYLES}>
          <CardContent className="p-0 flex items-start gap-4 w-full">
            <div className={cn(KPI_ICON_BOX, "bg-emerald-50 text-emerald-600")}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Success
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
                {loading ? (
                  <Skeleton className="h-7 w-14 inline-block" />
                ) : (
                  stats.success
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={KPI_CARD_STYLES}>
          <CardContent className="p-0 flex items-start gap-4 w-full">
            <div className={cn(KPI_ICON_BOX, "bg-destructive/10 text-destructive")}>
              <XCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Failed
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">
                {loading ? (
                  <Skeleton className="h-7 w-14 inline-block" />
                ) : (
                  stats.failed
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => runAction("start")}
          disabled={actionLoading !== null}
        >
          {actionLoading === "start" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Start
        </Button>
        <Button
          variant="outline"
          onClick={() => runAction("pause")}
          disabled={actionLoading !== null}
        >
          {actionLoading === "pause" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
          Pause
        </Button>
        <Button
          variant="outline"
          onClick={() => runAction("resume")}
          disabled={actionLoading !== null}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
        >
          {actionLoading === "resume" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Resume
        </Button>
        <Button
          variant="outline"
          onClick={() => runAction("retry-failed")}
          disabled={actionLoading !== null || stats.failed === 0}
          className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-700"
        >
          {actionLoading === "retry-failed" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Retry Failed
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-medium">
                {stats.success} of {progressTotal} archived
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {progressTotal > 0 ? Math.round(progressPct) : 0}%
              </p>
            </div>
            <Progress value={stats.success} max={Math.max(1, progressTotal)} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0">Current URL:</span>
              {loading ? (
                <Skeleton className="h-4 w-64" />
              ) : stats.currentUrl ? (
                <span className="truncate font-mono text-xs" title={stats.currentUrl}>
                  {stats.currentUrl}
                </span>
              ) : (
                <span className="text-muted-foreground italic">—</span>
              )}
              <WorkerStatusBadge status={stats.workerStatus} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground tabular-nums">
            <span>
              successful <span className="text-emerald-700 font-medium">{stats.success}</span>
            </span>
            <span>
              failed <span className="text-destructive font-medium">{stats.failed}</span>
            </span>
            <span>
              pending <span className="text-amber-700 font-medium">{stats.pending}</span>
            </span>
            <span>
              processing <span className="text-blue-700 font-medium">{stats.processing}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Attempts</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-64" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-8 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading && jobs.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground"
                >
                  Queue is empty.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="max-w-xs">
                    <span className="truncate block" title={j.url}>
                      {j.url}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {j.hostname}
                  </TableCell>
                  <TableCell>{serviceLabel(j.service)}</TableCell>
                  <TableCell>
                    <JobStatusBadge status={j.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {j.attemptCount || 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {new Date(j.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {j.startedAt
                      ? new Date(j.startedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {j.completedAt
                      ? new Date(j.completedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
