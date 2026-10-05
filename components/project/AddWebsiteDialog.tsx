"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddDomainSchema } from "@/lib/validation/zod-schemas";
import { toasts } from "@/lib/ui/toasts";
import { Loader2 } from "lucide-react";

interface AddWebsiteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (domainId: string) => void;
}

export function AddWebsiteDialog({
  open,
  onOpenChange,
  onCreated,
}: AddWebsiteDialogProps) {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const [errors, setErrors] = React.useState<{ url?: string; projectName?: string }>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setUrl("");
      setProjectName("");
      setErrors({});
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = AddDomainSchema.safeParse({ url, projectName });
    if (!parsed.success) {
      const fieldErrors: { url?: string; projectName?: string } = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0] === "url") fieldErrors.url = issue.message;
        if (issue.path[0] === "projectName") fieldErrors.projectName = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const hostname = new URL(parsed.data.url).hostname;

      const domainRes = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!domainRes.ok) {
        throw new Error("Failed to create domain");
      }

      const domainData = await domainRes.json();
      const domainId = domainData.domain.id;

      await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });

      toasts.discoveryStarted(hostname);
      onCreated?.(domainId);
      onOpenChange(false);
      router.push(`/projects/${domainId}`);
    } catch (err) {
      setErrors({ url: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Website</DialogTitle>
            <DialogDescription>
              Enter a website domain to discover public URLs and queue them for archival.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Website URL</label>
              <Input
                type="text"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              {errors.url && (
                <p className="text-xs text-destructive">{errors.url}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Project name (optional)</label>
              <Input
                type="text"
                placeholder="My Project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              {errors.projectName && (
                <p className="text-xs text-destructive">{errors.projectName}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Start Discovery
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
