"use client";

import * as React from "react";
import Link from "next/link";
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter =
  | "ALL"
  | "SUCCESS"
  | "PENDING"
  | "PROCESSING"
  | "RETRYING"
  | "FAILED";

type ServiceFilter = "ALL" | "wayback" | "archive_today" | "mock";

interface Submission {
  id: string;
  service: string;
  status: "PENDING" | "PROCESSING" | "RETRYING" | "SUCCESS" | "FAILED";
  submittedAt: string;
  completedAt: string | null;
  archiveUrl: string | null;
  errorMessage: string | null;
  attemptCount: number;
  urlRecord: {
    id: string;
    originalUrl: string;
    normalizedUrl: string;
    domain: { id: string; hostname: string } | null;
  };
}

interface HistoryResponse {
  submissions: Submission[];
  total: number;
  page: number;
  perPage: number;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "SUCCESS", label: "Success" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "RETRYING", label: "Retrying" },
  { value: "FAILED", label: "Failed" },
];

const SERVICE_OPTIONS: { value: ServiceFilter; label: string }[] = [
  { value: "ALL", label: "All Services" },
  { value: "wayback", label: "Wayback Machine" },
  { value: "archive_today", label: "Archive.today" },
  { value: "mock", label: "Development Provider" },
];

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

function ServiceBadge({ service }: { service: string }) {
  const label = serviceLabel(service);
  const variant: "default" | "muted" = service === "mock" ? "muted" : "default";
  return (
    <Badge
      variant={variant}
      className={cn(service === "mock" ? "" : "bg-secondary text-secondary-foreground")}
    >
      {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: Submission["status"] }) {
  switch (status) {
    case "SUCCESS":
      return (
        <Badge variant="success" className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="destructive" className="inline-flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge variant="default" className="inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "RETRYING":
      return (
        <Badge variant="warning" className="inline-flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Retrying
        </Badge>
      );
    case "PENDING":
    default:
      return (
        <Badge variant="muted" className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

const selectClass =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

export default function HistoryPage() {
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [perPage] = React.useState(25);

  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [service, setService] = React.useState<ServiceFilter>("ALL");
  const [hostname, setHostname] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const statusRef = React.useRef(status);
  const serviceRef = React.useRef(service);
  const hostnameRef = React.useRef(hostname);
  const fromRef = React.useRef(from);
  const toRef = React.useRef(to);

  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);
  React.useEffect(() => {
    serviceRef.current = service;
  }, [service]);
  React.useEffect(() => {
    hostnameRef.current = hostname;
  }, [hostname]);
  React.useEffect(() => {
    fromRef.current = from;
  }, [from]);
  React.useEffect(() => {
    toRef.current = to;
  }, [to]);

  const fetchData = React.useCallback(
    async (targetPage: number) => {
      try {
        const params = new URLSearchParams();
        if (statusRef.current !== "ALL")
          params.set("status", statusRef.current);
        if (serviceRef.current !== "ALL")
          params.set("service", serviceRef.current);
        if (hostnameRef.current) params.set("q", hostnameRef.current);
        if (fromRef.current) params.set("from", fromRef.current);
        if (toRef.current) params.set("to", toRef.current);
        params.set("page", String(targetPage));
        params.set("perPage", String(perPage));

        const res = await fetch(`/api/submissions?${params.toString()}`);
        if (res.ok) {
          const data: HistoryResponse = await res.json();
          setSubmissions(data.submissions || []);
          setTotal(data.total || 0);
          setPage(data.page || targetPage);
        }
      } catch {
        /* swallow */
      } finally {
        setLoading(false);
      }
    },
    [perPage]
  );

  React.useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, service, hostname, from, to]);

  React.useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  React.useEffect(() => {
    const i = setInterval(() => fetchData(page), 6000);
    return () => clearInterval(i);
  }, [page, fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const handlePrev = () => page > 1 && setPage(page - 1);
  const handleNext = () => page < totalPages && setPage(page + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold inline-flex items-center gap-2">
            <History className="h-6 w-6 text-muted-foreground" />
            Archive History
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Chronological feed of every archival attempt, with filters and
            per-URL details.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <Input
            placeholder="Search hostname…"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
          />
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="pl-9"
              aria-label="From date"
            />
          </div>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="pl-9"
              aria-label="To date"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={service}
            onChange={(e) => setService(e.target.value as ServiceFilter)}
            className={selectClass}
          >
            {SERVICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitted</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Attempt</TableHead>
              <TableHead>Archive Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-64" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading && submissions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground"
                >
                  No archival attempts yet.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              submissions.map((s) => {
                const displayUrl =
                  s.urlRecord?.originalUrl || s.urlRecord?.normalizedUrl || "";
                const hn = s.urlRecord?.domain?.hostname || "";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                      {new Date(s.submittedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <Link
                        href={displayUrl || "#"}
                        target={displayUrl ? "_blank" : undefined}
                        rel={displayUrl ? "noreferrer" : undefined}
                        className="truncate block hover:underline"
                        title={displayUrl}
                      >
                        {displayUrl || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {hn || "—"}
                    </TableCell>
                    <TableCell>
                      <ServiceBadge service={s.service} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                      {s.status === "FAILED" && s.errorMessage && (
                        <p
                          className="mt-1 text-xs text-destructive/90 font-mono"
                          title={s.errorMessage}
                        >
                          {s.errorMessage.length > 48
                            ? s.errorMessage.slice(0, 48) + "…"
                            : s.errorMessage}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                      {s.completedAt
                        ? new Date(s.completedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {s.attemptCount || 1}
                    </TableCell>
                    <TableCell>
                      <Button
                        asChild
                        size="icon"
                        variant="outline"
                        disabled={!s.archiveUrl}
                      >
                        <a
                          href={s.archiveUrl || "#"}
                          target={s.archiveUrl ? "_blank" : undefined}
                          rel={s.archiveUrl ? "noreferrer" : undefined}
                          aria-label="Open archive link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
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
              ? `${(page - 1) * perPage + 1}–${Math.min(
                  page * perPage,
                  total
                )} of ${total}`
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
    </div>
  );
}
