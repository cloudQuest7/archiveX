"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Link as LinkIcon,
  Clock,
  CheckCircle2,
  XCircle,
  LoaderCircle,
  Plus,
  Database,
  ListTodo,
  Play,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddWebsiteDialog } from "@/components/project/AddWebsiteDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { toasts } from "@/lib/ui/toasts";

type Project = any;
type Counts = { totalDomains: number; totalUrls: number; queued: number; archived: number; failed: number; pending: number };
type ActivityItem = { id: string; text: string; time: Date | string; variant: "info" | "success" | "warning" | "error" };

export function DashboardContent({ initialDomains = [] }: { initialDomains?: Project[] }) {
  const [domains, setDomains] = React.useState<Project[]>(initialDomains);
  const [counts, setCounts] = React.useState<Counts>({ totalDomains: 0, totalUrls: 0, queued: 0, archived: 0, failed: 0, pending: 0 });
  const [overview, setOverview] = React.useState<any>(null);
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickedDomainId, setPickedDomainId] = React.useState<string>("");

  const refresh = React.useCallback(async () => {
    try {
      const [dres, qres] = await Promise.all([
        fetch("/api/domains"),
        fetch("/api/queue?perPage=5"),
      ]);
      let list: Project[] = [];
      if (dres.ok) {
        const d = await dres.json();
        list = Array.isArray(d) ? d : d.projects || d.domains || [];
        setDomains(list);
      }
      const flatDomains = list.flatMap((p: any) => (p.domains ? p.domains : [p]));
      let totalUrls = 0, archived = 0, failed = 0, pending = 0;
      for (const d of flatDomains) {
        totalUrls += d.urlsCount ?? d._count?.urls ?? 0;
        archived += d.archived ?? 0;
        failed += d.failed ?? 0;
        pending += d.pending ?? 0;
      }
      const queued = pending;
      setCounts({ totalDomains: flatDomains.length, totalUrls, queued, archived, failed, pending });

      if (qres.ok) {
        const q = await qres.json();
        setOverview(q.overview || null);
      }

      const items: ActivityItem[] = [];
      for (const d of flatDomains) {
        if (d.lastScanAt) {
          items.push({ id: `scan-${d.id}`, text: `${d.hostname} — scan completed`, time: d.lastScanAt, variant: "info" });
        }
        if (d.urlsCount) {
          items.push({ id: `urls-${d.id}`, text: `${d.hostname} — ${d.urlsCount} URLs discovered`, time: d.createdAt || d.lastScanAt || new Date(), variant: "info" });
        }
        if (d.archived) {
          items.push({ id: `arc-${d.id}`, text: `${d.hostname} — ${d.archived} URLs archived`, time: d.lastSubmissionAt || d.createdAt, variant: "success" });
        }
        if (d.failed) {
          items.push({ id: `fail-${d.id}`, text: `${d.hostname} — ${d.failed} submissions failed`, time: d.lastSubmissionAt || d.createdAt, variant: "error" });
        }
      }
      items.sort((a, b) => +new Date(b.time) - +new Date(a.time));
      setActivity(items.slice(0, 10));
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const startScanForPicked = async () => {
    if (!pickedDomainId) return;
    try {
      const r = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: pickedDomainId }),
      });
      if (r.ok) {
        toasts.discoveryStarted("selected domain");
        setPickerOpen(false);
        setTimeout(refresh, 1000);
      } else {
        toasts.genericError("Failed to start scan");
      }
    } catch {
      toasts.genericError("Failed to start scan");
    }
  };

  const flatDomains = domains.flatMap((p: any) => (p.domains ? p.domains : [p]));
  const totalActive = (overview?.success || 0) + (overview?.failed || 0) + (overview?.pending || 0) + (overview?.processing || 0) + (overview?.retrying || 0) || 1;
  const archivedPct = Math.round(((overview?.success || 0) / totalActive) * 100);
  const pendingPct = Math.round((((overview?.pending || 0) + (overview?.processing || 0) + (overview?.retrying || 0)) / totalActive) * 100);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Website Archive</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor discovery, archival submissions, and historical backups.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add website
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard icon={Building2} label="Total Domains" value={counts.totalDomains} />
        <KpiCard icon={LinkIcon} label="Total URLs" value={counts.totalUrls} />
        <KpiCard icon={Clock} label="Queued" value={overview?.pending ?? counts.queued} />
        <KpiCard icon={CheckCircle2} label="Archived" value={overview?.success ?? counts.archived} valueClass="text-emerald-600" />
        <KpiCard icon={XCircle} label="Failed" value={overview?.failed ?? counts.failed} valueClass="text-destructive" />
        <KpiCard icon={LoaderCircle} label="Pending" value={(overview?.processing || 0) + (overview?.retrying || 0) + (overview?.pending || 0)} valueClass="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Projects</CardTitle>
              <CardDescription>Tracked domains and archival progress.</CardDescription>
            </div>
            <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center">
              View all <ChevronRight className="h-4 w-4 ml-0.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead className="text-right">URLs</TableHead>
                  <TableHead className="text-right">Archived</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Last Scan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatDomains.slice(0, 5).map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link href={`/projects/${d.id}`} className="hover:underline">
                        {d.hostname}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{d.urlsCount ?? d._count?.urls ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{d.archived ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">{d.pending ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{d.failed ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{d.lastScanAt ? new Date(d.lastScanAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      {(d.failed ?? 0) > 0 ? (
                        <Badge variant="destructive">Issues</Badge>
                      ) : (d.pending ?? 0) > 0 ? (
                        <Badge variant="warning">Processing</Badge>
                      ) : (d.archived ?? 0) > 0 ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Idle</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {flatDomains.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No projects yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest discovery and archival events.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {activity.length === 0 && (
                <li className="text-sm text-muted-foreground">No recent activity.</li>
              )}
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className={`mt-1 inline-flex h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    a.variant === "success" ? "bg-emerald-500" :
                    a.variant === "error" ? "bg-destructive" :
                    a.variant === "warning" ? "bg-amber-500" : "bg-border"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{a.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.time).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">Processing Overview</CardTitle>
          <CardDescription>Overall archival progress across all domains.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Archived</span>
              <span className="font-medium tabular-nums">{overview?.success ?? 0} / {totalActive === 1 && !overview ? 0 : totalActive}</span>
            </div>
            <Progress value={archivedPct} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Archived</div>
              <div className="font-semibold text-emerald-600 mt-1">{overview?.success ?? 0}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="font-semibold text-amber-600 mt-1">{(overview?.pending ?? 0) + (overview?.processing ?? 0) + (overview?.retrying ?? 0)}</div>
              <Progress value={pendingPct} className="mt-2" />
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Failed</div>
              <div className="font-semibold text-destructive mt-1">{overview?.failed ?? 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <QuickActionCard title="Add website" icon={Plus} onClick={() => setDialogOpen(true)} />
          <QuickActionCard title="Start scan" icon={Play} onClick={() => setPickerOpen(true)} />
          <QuickActionCard title="View queue" icon={ListTodo} href="/queue" />
          <QuickActionCard title="Open repository" icon={Database} href="/repository" />
        </div>
      </div>

      <AddWebsiteDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start scan</DialogTitle>
            <DialogDescription>Choose a project to run URL discovery again.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <label className="text-sm font-medium">Project</label>
            <select
              value={pickedDomainId}
              onChange={(e) => setPickedDomainId(e.target.value)}
              className="mt-2 w-full h-9 rounded-md border border-input px-3 text-sm bg-background"
            >
              <option value="">Select project…</option>
              {flatDomains.map((d: any) => (
                <option key={d.id} value={d.id}>{d.hostname}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={startScanForPicked} disabled={!pickedDomainId}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: any;
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <Card className="border">
      <CardContent className="p-5 flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-md bg-muted flex items-center justify-center text-foreground/70">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className={`text-xl font-semibold tabular-nums mt-0.5 ${valueClass ?? ""}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  icon: Icon,
  onClick,
  href,
}: {
  title: string;
  icon: any;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <Card className="border hover:shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-shadow h-full cursor-pointer">
      <CardContent className="p-5 flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-md bg-accent/10 text-accent flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div className="font-medium">{title}</div>
      </CardContent>
    </Card>
  );
  if (href) {
    return <Link href={href} className="block h-full">{inner}</Link>;
  }
  return <div onClick={onClick}>{inner}</div>;
}
