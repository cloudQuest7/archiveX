"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { AddWebsiteDialog } from "@/components/project/AddWebsiteDialog";
import { ChevronRight } from "lucide-react";

interface DomainRow {
  id: string;
  hostname: string;
  projectName?: string | null;
  createdAt: string;
  lastScanAt?: string | null;
  _count?: {
    urls?: number;
    archivedUrls?: number;
    pendingJobs?: number;
    failedJobs?: number;
  };
  scanStatus?: string;
}

export default function ProjectsPage() {
  const [domains, setDomains] = React.useState<DomainRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const fetchDomains = React.useCallback(async () => {
    try {
      const res = await fetch("/api/domains");
      if (res.ok) {
        const data = await res.json();
        const flat = Array.isArray(data)
          ? data.flatMap((p: any) => p.domains || [])
          : data.domains || [];
        setDomains(flat);
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDomains();
    const interval = setInterval(fetchDomains, 5000);
    return () => clearInterval(interval);
  }, [fetchDomains]);

  const handleCreated = React.useCallback(() => {
    fetchDomains();
  }, [fetchDomains]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage tracked domains, discovery scans, and archival progress.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ Add Website</Button>
      </div>

      <div className="border rounded-xl overflow-hidden">
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
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
            {!loading && domains.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No projects yet. Add your first website to get started.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              domains.map((d) => {
                const counts = d._count || {};
                const urls = counts.urls || 0;
                const archived = counts.archivedUrls || 0;
                const pending = counts.pendingJobs || 0;
                const failed = counts.failedJobs || 0;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/projects/${d.id}`}
                        className="hover:underline"
                      >
                        {d.projectName || d.hostname}
                        {d.projectName && (
                          <div className="text-xs text-muted-foreground font-normal mt-0.5">
                            {d.hostname}
                          </div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{urls}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{archived}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">{pending}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{failed}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {d.lastScanAt
                        ? new Date(d.lastScanAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.scanStatus} pending={pending} failed={failed} archived={archived} />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/projects/${d.id}`}
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <AddWebsiteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}

function StatusBadge({
  status,
  pending,
  failed,
  archived,
}: {
  status?: string;
  pending: number;
  failed: number;
  archived: number;
}) {
  if (failed > 0) {
    return <Badge variant="destructive">Issues</Badge>;
  }
  if (status === "scanning" || pending > 0) {
    return <Badge variant="warning">Processing</Badge>;
  }
  if (archived > 0) {
    return <Badge variant="success">Active</Badge>;
  }
  return <Badge variant="muted">Idle</Badge>;
}
