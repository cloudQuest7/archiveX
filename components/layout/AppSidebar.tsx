"use client";

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

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r h-screen sticky top-0 flex flex-col gap-1 p-3 bg-background">
      <div className="px-3 py-4 mb-2">
        <span className="tracking-wider font-semibold text-foreground/80 text-sm">
          ARCHIVE
        </span>
      </div>
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
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
