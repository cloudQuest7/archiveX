"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Globe,
  Database,
  ListTodo,
  History,
  BookOpen,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/projects", label: "Projects", icon: Globe },
  { href: "/repository", label: "Repository", icon: Database },
  { href: "/queue", label: "Queue", icon: ListTodo },
  { href: "/history", label: "Archive History", icon: History },
  { href: "/docs", label: "Documentation", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

type SidebarContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const toggle = React.useCallback(() => setOpen((v) => !v), []);
  const value = React.useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);
  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
              isActive
                ? "bg-accent/10 text-accent font-medium"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar() {
  const { open, setOpen } = useSidebar();
  const close = React.useCallback(() => setOpen(false), [setOpen]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 md:z-0 h-screen shrink-0",
          "w-[85%] max-w-[300px] md:w-60",
          "border-r bg-background flex flex-col gap-1 p-3",
          "transition-transform duration-200 ease-out md:translate-x-0",
          open ? "translate-x-0 shadow-2xl md:shadow-none" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="px-3 py-3 mb-2 flex items-center justify-between md:justify-start">
          <span className="tracking-wider font-semibold text-foreground/80 text-sm">
            ARCHIVE
          </span>
          <button
            type="button"
            onClick={close}
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin -mx-1 px-1">
          <NavLinks onNavigate={close} />
        </div>
      </aside>
    </>
  );
}
