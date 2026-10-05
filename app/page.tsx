"use client";

import * as React from "react";
import { EmptyLanding } from "@/components/dashboard/EmptyLanding";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [hasProjects, setHasProjects] = React.useState<boolean | null>(null);
  const [domains, setDomains] = React.useState<any[]>([]);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/domains");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.projects || data.domains || [];
        setDomains(list);
        setHasProjects(list.length > 0);
      } else {
        setHasProjects(false);
      }
    } catch {
      setHasProjects(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (hasProjects === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-52" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!hasProjects) return <EmptyLanding />;

  return <DashboardContent initialDomains={domains} />;
}
