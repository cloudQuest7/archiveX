"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AddWebsiteDialog } from "@/components/project/AddWebsiteDialog";

export function EmptyLanding() {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center relative">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-[15%] left-[18%] w-3 h-3 rounded-sm bg-foreground/10" />
      <div className="absolute top-[28%] right-[22%] w-2 h-2 rounded-sm bg-foreground/10" />
      <div className="absolute bottom-[24%] left-[28%] w-2 h-2 rounded-sm bg-foreground/10" />
      <div className="absolute bottom-[18%] right-[16%] w-3 h-3 rounded-sm bg-foreground/10" />

      <div className="relative text-center max-w-2xl px-6">
        <div className="tracking-[0.25em] text-foreground/70 font-semibold text-sm">
          ARCHIVE
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold mt-6">
          Preserve your websites.
        </h1>
        <p className="max-w-xl mx-auto text-muted-foreground mt-3">
          Discover public URLs, archive them automatically, and maintain a
          permanent searchable history.
        </p>
        <div className="mt-8">
          <Button size="lg" onClick={() => setDialogOpen(true)}>
            + Add your first website
          </Button>
        </div>
      </div>

      <AddWebsiteDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
