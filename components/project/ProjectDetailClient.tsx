"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Archive,
  Database,
  Link as LinkIcon,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Play,
  History,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toasts } from "@/lib/ui/toasts";
import { SubmissionHistoryModal } from "@/components/url/SubmissionHistoryModal";

export function ProjectDetailClient({ domainId }: { domainId: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<any>(null);
  const [urls, setUrls] = React.useState<any[]>([]);
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [submissions, setSubmissions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [scanLoading, setScanLoading] = React.useState(false);
  const [archiveLoading, setArchiveLoading] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [selectedUrlId, setSelectedUrlId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [d, u, q, s] = await Promise.all([
        fetch(`/api/domains/${domainId}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/repository?domainId=${domainId}&perPage=25&sortBy=created_desc`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/queue?domainId=${domainId}&perPage=25`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/submissions?domainId=${domainId}&perPage=25`).then((r) => (r.ok ? r.json() : null)),
      ]);
      setData(d);
      setUrls(u?.urls || []);
      setJobs(q?.jobs || []);
      setSubmissions(s?.submissions || []);
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const scanAgain = async () => {
    setScanLoading(true);
    try {
      const r = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      if (r.ok) {
        toasts.discoveryStarted(data?.hostname || "domain");
        setTimeout(load, 1000);
      } else {
        toasts.genericError("Failed to start scan");
      }
    } finally {
      setScanLoading(false);
    }
  };

  const archiveNewUrls = async () => {
    setArchiveLoading(true);
    try {
      const r = await fetch("/api/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      if (r.ok) {
        const { added } = await r.json().catch(() => ({}));
        toasts.genericSuccess("Queued for archival", added ? `${added} unarchived URLs will be submitted.` : undefined);
        toasts.queueStarted();
        setTimeout(load, 1000);
      } else {
        toasts.genericError("Failed to enqueue URLs");
      }
    } finally {
      setArchiveLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const c = data?.counts || { totalUrls: 0, archived: 0, pending: 0, failed: 0 };
  const latestScan = data?.scans?.[0];
  const newCount = latestScan?.newUrlCount ?? 0;
  const archiveCountTotal = (data?.queueOverview?.success || 0) + c.archived;
  const totalJobs = (data?.queueOverview?.total || 1) || 1;
  const queueProgressPct = Math.round(((data?.queueOverview?.success || 0) / totalJobs) * 100);

  const statusBadge = (c.failed ?? 0) > 0 ? (
    <Badge variant="destructive">Issues</Badge>
  ) : latestScan?.status === "RUNNING" ? (
    <Badge variant="warning">Scanning</Badge>
  ) : data?.queueOverview?.processing || data?.queueOverview?.pending || data?.queueOverview?.retrying ? (
    <Badge variant="warning">Processing</Badge>
  ) : (c.archived ?? 0) > 0 ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="muted">Idle</Badge>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data?.hostname}</h1>
            {statusBadge}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
            <span>Last scan: {data?.lastScanAt ? new Date(data.lastScanAt).toLocaleString() : "—"}</span>
            <span>Last submission: {data?.lastSubmissionAt ? new Date(data.lastSubmissionAt).toLocaleString() : "—"}</span>
          </div>
          {newCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              +{newCount} new URLs from latest scan
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={scanAgain} variant="outline" disabled={scanLoading}>
            {scanLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Scan Again
          </Button>
          <Button onClick={archiveNewUrls} disabled={archiveLoading}>
            {archiveLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Archive New URLs
          </Button>
          <Button asChild variant="outline">
            <Link href={`/repository?domainId=${domainId}`}>
              <Database className="h-4 w-4" />
              View Repository
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={LinkIcon} label="URLs discovered" value={c.totalUrls} />
        <StatCard icon={Sparkles} label="New URLs" value={newCount} accent />
        <StatCard icon={CheckCircle2} label="Already archived" value={c.archived} valueClass="text-emerald-600" />
        <StatCard icon={Clock} label="Pending" value={c.pending} valueClass="text-amber-600" />
        <StatCard icon={Archive} label="Archived" value={data?.queueOverview?.success ?? c.archived} valueClass="text-emerald-600" />
        <StatCard icon={XCircle} label="Failed" value={c.failed ?? data?.queueOverview?.failed ?? 0} valueClass="text-destructive" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base">Discovery</CardTitle>
            <CardDescription>Most recent URL scan performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow label="Duration" value={latestScan?.startedAt && latestScan?.completedAt ? `${((+new Date(latestScan.completedAt) - +new Date(latestScan.startedAt)) / 1000).toFixed(1)} sec` : latestScan?.status === "RUNNING" ? "Running…" : "—"} />
            <MetricRow label="URLs discovered" value={`${latestScan?.discoveredCount ?? 0}`} />
            <MetricRow label="URLs / second" value={latestScan?.startedAt && latestScan?.completedAt && latestScan.discoveredCount > 0 ? (latestScan.discoveredCount / ((+new Date(latestScan.completedAt) - +new Date(latestScan.startedAt)) / 1000)).toFixed(1) : "—"} />
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base">Archival</CardTitle>
            <CardDescription>Submission throughput and status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Progress</span>
                <span className="tabular-nums font-medium">{data?.queueOverview?.success ?? 0} / {totalJobs}</span>
              </div>
              <Progress value={queueProgressPct} />
            </div>
            <MetricRow label="Successful" value={`${data?.queueOverview?.success ?? 0}`} />
            <MetricRow label="Failed" value={`${data?.queueOverview?.failed ?? 0}`} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="urls">URLs</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border">
              <CardHeader>
                <CardTitle className="text-base">Processing Overview</CardTitle>
                <CardDescription>URL states in this project.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <MiniStatRow label="Archived" value={c.archived} total={c.totalUrls} tone="emerald" />
                  <MiniStatRow label="Pending" value={c.pending} total={c.totalUrls} tone="amber" />
                  <MiniStatRow label="Failed" value={c.failed} total={c.totalUrls} tone="red" />
                </div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-base">Recent Scans</CardTitle>
                <CardDescription>Last 5 discovery runs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data?.scans || []).slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div>
                      <Badge variant={s.status === "COMPLETED" ? "success" : s.status === "RUNNING" ? "warning" : s.status === "FAILED" ? "destructive" : "muted"}>
                        {s.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">{s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}</div>
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      <div>{s.discoveredCount} discovered</div>
                      {s.newUrlCount > 0 && <div className="text-accent">+{s.newUrlCount} new</div>}
                    </div>
                  </div>
                ))}
                {(!data?.scans || data.scans.length === 0) && (
                  <div className="text-sm text-muted-foreground">No scans yet.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="urls">
          <Card className="border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>Archive Status</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urls.map((u: any) => {
                    const sub = u.latestSubmission;
                    let badge: React.ReactNode = <Badge variant="muted">Not submitted</Badge>;
                    if (sub?.status === "SUCCESS") badge = <Badge variant="success">Archived</Badge>;
                    else if (sub?.status === "FAILED") badge = <Badge variant="destructive">Failed</Badge>;
                    else if (sub?.status === "PROCESSING" || sub?.status === "PENDING" || sub?.status === "RETRYING") badge = <Badge variant="warning">Pending</Badge>;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs max-w-xs truncate" title={u.originalUrl}>{u.originalUrl}</TableCell>
                        <TableCell><Badge variant="secondary">{u.discoverySource}</Badge></TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{u.httpStatus ?? "—"}</TableCell>
                        <TableCell>{badge}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            {sub?.archiveUrl && (
                              <Button asChild size="sm" variant="ghost">
                                <a href={sub.archiveUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                  Archive
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUrlId(u.id);
                                setHistoryOpen(true);
                              }}
                            >
                              <History className="h-3.5 w-3.5 mr-1" />
                              History
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {urls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No URLs for this project yet. Start a scan to discover.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card className="border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j: any) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono text-xs max-w-md truncate" title={j.urlRecord?.originalUrl}>{j.urlRecord?.originalUrl}</TableCell>
                      <TableCell><Badge variant={j.service === "mock" ? "muted" : "secondary"}>{j.service === "mock" ? "Dev Provider" : j.service}</Badge></TableCell>
                      <TableCell><QueueStatusBadge status={j.status} /></TableCell>
                      <TableCell className="tabular-nums">{j.attempts}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{j.createdAt ? new Date(j.createdAt).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{j.completedAt ? new Date(j.completedAt).toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {jobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No queue jobs for this project.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border">
            <CardContent className="p-6 space-y-3">
              {submissions.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-10">No archival submissions yet.</div>
              )}
              {submissions.map((s: any) => (
                <div key={s.id} className="flex items-start gap-3 border-b last:border-0 pb-3 last:pb-0">
                  <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${s.status === "SUCCESS" ? "bg-emerald-50 text-emerald-600" : s.status === "FAILED" ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-600"}`}>
                    {s.status === "SUCCESS" ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.status === "FAILED" ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs truncate">{s.urlRecord?.originalUrl}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <Badge variant={s.service === "mock" ? "muted" : "secondary"} className="mr-2">{s.service === "mock" ? "Dev Provider" : s.service}</Badge>
                      {s.status}
                      {s.errorMessage && (
                        <span className="text-destructive ml-2">Error: {s.errorMessage}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—"}</div>
                  </div>
                  {s.archiveUrl && (
                    <Button asChild size="sm" variant="outline">
                      <a href={s.archiveUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Open
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SubmissionHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        urlRecordId={selectedUrlId}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  valueClass,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  valueClass?: string;
  accent?: boolean;
}) {
  return (
    <Card className="border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-8 w-8 shrink-0 rounded-md flex items-center justify-center ${accent ? "bg-accent/10 text-accent" : "bg-muted text-foreground/70"}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className={`text-lg font-semibold tabular-nums mt-0.5 ${valueClass ?? ""}`}>{value.toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function MiniStatRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "emerald" | "amber" | "red";
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const toneClass =
    tone === "emerald" ? "bg-emerald-500" :
    tone === "amber" ? "bg-amber-500" :
    "bg-destructive";
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{value} / {total}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${toneClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QueueStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "SUCCESS":
      return <Badge variant="success">Success</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "PROCESSING":
      return <Badge variant="warning">Processing</Badge>;
    case "RETRYING":
      return <Badge variant="warning">Retrying</Badge>;
    case "CANCELLED":
      return <Badge variant="muted">Cancelled</Badge>;
    case "PENDING":
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}
