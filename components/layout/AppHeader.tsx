"use client";

import { CircleUser, Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/AppSidebar";

export function AppHeader() {
  const { toggle } = useSidebar();
  return (
    <header className="h-14 shrink-0 border-b flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="hidden sm:inline text-sm text-muted-foreground">System</span>
        </div>
        <div className="flex items-center gap-2 pl-2 sm:pl-4 border-l">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 shrink-0">
            <CircleUser className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline text-sm font-medium">Admin</span>
        </div>
      </div>
    </header>
  );
}
