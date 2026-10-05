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
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
} from "lucide-react";
import { SubmissionHistoryModal } from "@/components/url/SubmissionHistoryModal";
import { cn } from "@/lib/utils";

type ArchiveStatusFilter =
  | "ALL"
  | "ARCHIVED"
  | "PENDING"
  | "FAILED"
  | "NO_SUBMISSION";

type ServiceFilter = "ALL" | "wayback" | "archive_today" | "mock";

type DiscoverySourceFilter =
  | "ALL"
  | "html"
  | "sitemap"
  | "sitemap_index"
  | "robots"
  | "canonical"
  | "pagination"
  | "feed";

type SubmissionStatus =
  | "PENDING"
  | "PROCESSING"
  | "RETRYING"
  | "SUCCESS"
  | "FAILED";

interface Submission {
  id: string;
  service: string;
  status: SubmissionStatus;
  submittedAt: string;
  completedAt: string | null;
  archiveUrl: string | null;
}

interface UrlRecord {
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  hostname: string;
  discoverySource: string;
  httpStatus: number | null;
  lastSubmittedAt: string | null;
  archiveUrl: string | null;
  archiveService: string | null;
  submissions: Submission[];
}

interface RepositoryResponse {
  urls: UrlRecord[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const ARCHIVE_STATUS_OPTIONS: {
  value: ArchiveStatusFilter;
  label: string;
}[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "NO_SUBMISSION", label: "No Submission" },
];

const SERVICE_OPTIONS: { value: ServiceFilter; label: string }[] = [
  { value: "ALL", label: "All Services" },
  { value: "wayback", label: "Wayback Machine" },
  { value: "archive_today", label: "Archive.today" },
  { value: "mock", label: "Development Provider" },
];

const DISCOVERY_SOURCE_OPTIONS: {
  value: DiscoverySourceFilter;
  label: string;
}[] = [
  { value: "ALL", label: "All Sources" },
  { value: "html", label: "HTML" },
  { value: "sitemap", label: "Sitemap" },
  { value: "sitemap_index", label: "Sitemap Index" },
  { value: "robots", label: "Robots.txt" },
  { value: "canonical", label: "Canonical" },
  { value: "pagination", label: "Pagination" },
  { value: "feed", label: "Feed" },
];

function getEffectiveArchiveStatus(
  submissions: Submission[]
): "ARCHIVED" | "PENDING" | "FAILED" | "NO_SUBMISSION" {
  if (!submissions || submissions.length === 0) return "NO_SUBMISSION";
  const hasSuccess = submissions.some((s) => s.status === "SUCCESS");
  if (hasSuccess) return "ARCHIVED";
  const hasPending = submissions.some((s) =>
    ["PENDING", "PROCESSING", "RETRYING"].includes(s.status)
  );
  if (hasPending) return "PENDING";
  const hasFailed = submissions.every((s) => s.status === "FAILED");
  if (hasFailed) return "FAILED";
  return "FAILED";
}

function ArchiveStatusBadge({
  effectiveStatus,
}: {
  effectiveStatus: ReturnType<typeof getEffectiveArchiveStatus>;
}) {
  switch (effectiveStatus) {
    case "ARCHIVED":
      return <Badge variant="success">Archived</Badge>;
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "NO_SUBMISSION":
    default:
      return <Badge variant="muted">No Submission</Badge>;
  }
}

function ServiceBadge({ service }: { service: string | null }) {
  if (!service) return <span className="text-muted-foreground">—</span>;
  const label =
    service === "wayback"
      ? "Wayback Machine"
      : service === "archive_today"
        ? "Archive.today"
        : service === "mock"
          ? "Dev Provider"
          : service;
  const variant: "default" | "muted" = service === "mock" ? "muted" : "default";
  return (
    <Badge variant={variant} className={cn(service === "mock" ? "" : "bg-secondary text-secondary-foreground")}>
      {label}
    </Badge>
  );
}

function DiscoverySourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    html: "HTML",
    sitemap: "Sitemap",
    sitemap_index: "Sitemap Index",
    robots: "Robots.txt",
    canonical: "Canonical",
    pagination: "Pagination",
    feed: "Feed",
  };
  return <Badge variant="secondary">{labels[source] || source}</Badge>;
}

const selectClass =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

export default function RepositoryPage() {
  const [urls, setUrls] = React.useState<UrlRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [perPage] = React.useState(20);
  const [totalPages, setTotalPages] = React.useState(0);

  const [q, setQ] = React.useState("");
  const [archiveStatus, setArchiveStatus] =
    React.useState<ArchiveStatusFilter>("ALL");
  const [service, setService] = React.useState<ServiceFilter>("ALL");
  const [discoverySource, setDiscoverySource] =
    React.useState<DiscoverySourceFilter>("ALL");
  const [httpStatus, setHttpStatus] = React.useState<string>("");
  const [sortBy] = React.useState<string>("lastSubmittedAt:desc");

  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [selectedUrlId, setSelectedUrlId] = React.useState<string | null>(null);

  const qRef = React.useRef(q);
  const archiveStatusRef = React.useRef(archiveStatus);
  const serviceRef = React.useRef(service);
  const discoverySourceRef = React.useRef(discoverySource);
  const httpStatusRef = React.useRef(httpStatus);

  React.useEffect(() => {
    qRef.current = q;
  }, [q]);
  React.useEffect(() => {
    archiveStatusRef.current = archiveStatus;
  }, [archiveStatus]);
  React.useEffect(() => {
    serviceRef.current = service;
  }, [service]);
  React.useEffect(() => {
    discoverySourceRef.current = discoverySource;
  }, [discoverySource]);
  React.useEffect(() => {
    httpStatusRef.current = httpStatus;
  }, [httpStatus]);

  const fetchData = React.useCallback(
    async (targetPage: number) => {
      try {
        const params = new URLSearchParams();
        if (qRef.current) params.set("q", qRef.current);
        if (archiveStatusRef.current !== "ALL")
          params.set("archiveStatus", archiveStatusRef.current);
        if (serviceRef.current !== "ALL")
          params.set("service", serviceRef.current);
        if (discoverySourceRef.current !== "ALL")
          params.set("discoverySource", discoverySourceRef.current);
        if (httpStatusRef.current)
          params.set("httpStatus", httpStatusRef.current);
        params.set("sortBy", sortBy);
        params.set("page", String(targetPage));
        params.set("perPage", String(perPage));

        const res = await fetch(`/api/repository?${params.toString()}`);
        if (res.ok) {
          const data: RepositoryResponse = await res.json();
          setUrls(data.urls || []);
          setTotal(data.total || 0);
          setPage(data.page || targetPage);
          setTotalPages(data.totalPages || 0);
        }
      } catch {
        /* swallow */
      } finally {
        setLoading(false);
      }
    },
    [perPage, sortBy]
  );

  React.useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, archiveStatus, service, discoverySource, httpStatus]);

  React.useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchData(page);
    }, 10000);
    return () => clearInterval(interval);
  }, [page, fetchData]);

  const handlePrev = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const openHistory = (id: string) => {
    setSelectedUrlId(id);
    setHistoryOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Repository</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Full inventory of all discovered URLs and their archival status.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search URLs or domains…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={archiveStatus}
            onChange={(e) =>
              setArchiveStatus(e.target.value as ArchiveStatusFilter)
            }
            className={selectClass}
          >
            {ARCHIVE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={service}
            onChange={(e) => setService(e.target.value as ServiceFilter)}
            className={selectClass}
          >
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={discoverySource}
            onChange={(e) =>
              setDiscoverySource(e.target.value as DiscoverySourceFilter)
            }
            className={selectClass}
          >
            {DISCOVERY_SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="HTTP Status"
            value={httpStatus}
            onChange={(e) => setHttpStatus(e.target.value)}
            className="w-36"
          />
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Discovery Source</TableHead>
              <TableHead>HTTP Status</TableHead>
              <TableHead>Archive Status</TableHead>
              <TableHead>Archive Service</TableHead>
              <TableHead>Last Submitted</TableHead>
              <TableHead>Archive Link</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-28 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading && urls.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-12 text-muted-foreground"
                >
                  No URLs discovered yet.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              urls.map((u) => {
                const effectiveStatus = getEffectiveArchiveStatus(
                  u.submissions || []
                );
                const displayUrl = u.originalUrl || u.normalizedUrl;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="max-w-xs">
                      <span
                        className="truncate block"
                        title={displayUrl}
                      >
                        {displayUrl}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.hostname}
                    </TableCell>
                    <TableCell>
                      <DiscoverySourceBadge source={u.discoverySource} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {u.httpStatus ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ArchiveStatusBadge effectiveStatus={effectiveStatus} />
                    </TableCell>
                    <TableCell>
                      <ServiceBadge service={u.archiveService} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm tabular-nums">
                      {u.lastSubmittedAt
                        ? new Date(u.lastSubmittedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        asChild
                        size="icon"
                        variant="outline"
                        disabled={!u.archiveUrl}
                      >
                        <a
                          href={u.archiveUrl || "#"}
                          target={u.archiveUrl ? "_blank" : undefined}
                          rel={u.archiveUrl ? "noreferrer" : undefined}
                          aria-label="Open archive link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openHistory(u.id)}
                      >
                        <History className="h-3.5 w-3.5" />
                        View History
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground tabular-nums">
            {total > 0
              ? `${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total}`
              : "0 results"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrev}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums px-2">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNext}
              disabled={page >= totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <SubmissionHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        urlRecordId={selectedUrlId}
      />
    </div>
  );
}
