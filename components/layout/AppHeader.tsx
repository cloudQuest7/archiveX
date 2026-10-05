"use client";

import { CircleUser } from "lucide-react";

export function AppHeader() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-8">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-sm text-muted-foreground">System</span>
        </div>
        <div className="flex items-center gap-2 pl-4 border-l">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground/70">
            <CircleUser className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Admin</span>
        </div>
      </div>
    </header>
  );
}
