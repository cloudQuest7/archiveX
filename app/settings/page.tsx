"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSettingsSchema } from "@/lib/validation/zod-schemas";
import { toasts } from "@/lib/ui/toasts";
import {
  Settings2,
  Archive,
  Activity,
  Database,
  HardDrive,
  Play,
  Pause,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Provider = "wayback" | "archive_today" | "mock";

interface SettingsState {
  maxUrls: number;
  requestTimeoutMs: number;
  crawlConcurrency: number;
  defaultProvider: Provider;
  maxAttempts: number;
}

interface SystemState {
  database: "connected" | "error" | "unknown";
  worker: {
    running: boolean;
    paused: boolean;
    currentJobId: string | null;
    processedSinceBoot: number;
    bootAt: string | null;
  };
}

const DEFAULT_SETTINGS: SettingsState = {
  maxUrls: 2500,
  requestTimeoutMs: 15000,
  crawlConcurrency: 3,
  defaultProvider: "wayback",
  maxAttempts: 3,
};

const PROVIDER_OPTIONS: { value: Provider; label: string }[] = [
  { value: "wayback", label: "Wayback Machine (Internet Archive)" },
  { value: "archive_today", label: "Archive.today" },
  { value: "mock", label: "Dev Provider (local mock)" },
];

function InputRow({
  id,
  label,
  hint,
  type = "number",
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  id: string;
  label: string;
  hint?: string;
  type?: "number" | "text";
  value: string | number;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-4 items-start">
      <div className="sm:col-span-2">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {hint && (
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        )}
      </div>
      <div className="sm:col-span-3 relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className={suffix ? "pr-14 tabular-nums" : "tabular-nums"}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = React.useState<SettingsState>(DEFAULT_SETTINGS);
  const [system, setSystem] = React.useState<SystemState>({
    database: "unknown",
    worker: {
      running: false,
      paused: false,
      currentJobId: null,
      processedSinceBoot: 0,
      bootAt: null,
    },
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const fetchAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        setSettings({
          maxUrls: s.maxUrls ?? DEFAULT_SETTINGS.maxUrls,
          requestTimeoutMs: s.requestTimeoutMs ?? DEFAULT_SETTINGS.requestTimeoutMs,
          crawlConcurrency: s.crawlConcurrency ?? DEFAULT_SETTINGS.crawlConcurrency,
          defaultProvider: s.defaultProvider ?? DEFAULT_SETTINGS.defaultProvider,
          maxAttempts: s.maxAttempts ?? DEFAULT_SETTINGS.maxAttempts,
        });
        setSystem({
          database: data.system?.database || "unknown",
          worker: data.system?.worker || system.worker,
        });
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [system.worker]);

  React.useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 4000);
    return () => clearInterval(i);
  }, [fetchAll]);

  const handleSave = React.useCallback(async () => {
    const parsed = AppSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toasts.genericError(
        "Settings invalid",
        first?.message || "Please correct the highlighted fields."
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.ok) {
        toasts.genericSuccess("Settings saved");
        await fetchAll();
      } else {
        toasts.genericError("Save failed", "Could not update settings.");
      }
    } catch {
      toasts.genericError("Network error", "Could not reach settings API.");
    } finally {
      setSaving(false);
    }
  }, [settings, fetchAll]);

  const setField = <K extends keyof SettingsState>(
    key: K,
    parser: (v: string) => SettingsState[K]
  ) =>
    (raw: string) => {
      setSettings((prev) => ({ ...prev, [key]: parser(raw) }));
    };

  const workerState =
    system.worker.running && !system.worker.paused
      ? "RUNNING"
      : system.worker.paused
        ? "PAUSED"
        : "STOPPED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold inline-flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-muted-foreground" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tune crawl behavior, archival preferences, and view system health.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              Crawler Settings
            </CardTitle>
            <CardDescription>
              Tuning knobs for the URL discovery subsystem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <InputRow
              id="maxUrls"
              label="Max URLs per scan"
              hint="Hard cap on new URLs discovered during a single crawl. Higher values increase scan duration."
              value={settings.maxUrls}
              onChange={setField("maxUrls", (v) => parseInt(v) || 0)}
              min={1}
              max={50000}
            />
            <InputRow
              id="requestTimeoutMs"
              label="Per-request timeout"
              hint="Total time, including connect + response read, before a single HTTP fetch is abandoned."
              value={settings.requestTimeoutMs}
              onChange={setField("requestTimeoutMs", (v) => parseInt(v) || 0)}
              min={1000}
              max={300000}
              suffix="ms"
            />
            <InputRow
              id="crawlConcurrency"
              label="Crawl concurrency"
              hint="Simultaneous in-flight requests. Keep low to respect hosts and rate limits."
              value={settings.crawlConcurrency}
              onChange={setField("crawlConcurrency", (v) => parseInt(v) || 0)}
              min={1}
              max={20}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-muted-foreground" />
              System Status
            </CardTitle>
            <CardDescription>
              Live health indicators for core services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Database</span>
                </div>
                {loading ? (
                  <Skeleton className="h-5 w-24 rounded-full" />
                ) : system.database === "connected" ? (
                  <Badge variant="success" className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Error
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Queue Worker</span>
                </div>
                {loading ? (
                  <Skeleton className="h-5 w-20 rounded-full" />
                ) : workerState === "RUNNING" ? (
                  <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200/70 inline-flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    Archiving…
                  </Badge>
                ) : workerState === "PAUSED" ? (
                  <Badge variant="warning" className="inline-flex items-center gap-1">
                    <Pause className="h-3 w-3" />
                    Paused
                  </Badge>
                ) : (
                  <Badge variant="muted">Idle</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-muted-foreground">
                <div>
                  Processed this boot:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {loading ? (
                      <Skeleton className="h-3 w-10 inline-block align-middle" />
                    ) : (
                      system.worker.processedSinceBoot || 0
                    )}
                  </span>
                </div>
                <div>
                  Current job:{" "}
                  <span className="font-mono text-foreground truncate inline-block max-w-[7rem] align-bottom">
                    {loading ? (
                      <Skeleton className="h-3 w-16 inline-block align-middle" />
                    ) : system.worker.currentJobId ? (
                      system.worker.currentJobId.slice(0, 8) + "…"
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-lg">
            <Archive className="h-5 w-5 text-muted-foreground" />
            Archive Settings
          </CardTitle>
          <CardDescription>
            Default archival provider and submission retry policy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-4 items-start">
            <div className="sm:col-span-2">
              <Label htmlFor="defaultProvider" className="text-sm font-medium">
                Default archive provider
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                New URLs queued without an explicit provider will use this
                service.
              </p>
            </div>
            <div className="sm:col-span-3">
              <select
                id="defaultProvider"
                value={settings.defaultProvider}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultProvider: e.target.value as Provider,
                  }))
                }
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {PROVIDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <InputRow
            id="maxAttempts"
            label="Maximum submission attempts"
            hint="After this many failed retries, the job transitions to FAILED and will only retry if explicitly requested."
            value={settings.maxAttempts}
            onChange={setField("maxAttempts", (v) => parseInt(v) || 0)}
            min={1}
            max={20}
          />

          <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Changes apply to newly queued jobs immediately; in-flight jobs
              continue with their current settings.
            </p>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
