"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DashboardSyncProps = {
  employeeId: string | null;
};

export function DashboardSync({ employeeId }: DashboardSyncProps) {
  const router = useRouter();

  useEffect(() => {
    if (!employeeId) {
      return;
    }

    let supabase: ReturnType<typeof createClient>;

    try {
      supabase = createClient();
    } catch {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    function refresh() {
      window.clearTimeout(timer);
      timer = setTimeout(() => {
        router.refresh();
      }, 400);
    }

    const channel = supabase
      .channel(`employee-dashboard-${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timesheet_events",
          filter: `employee_id=eq.${employeeId}`,
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timesheet_summaries",
          filter: `employee_id=eq.${employeeId}`,
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_files",
        },
        refresh
      )
      .subscribe();

    function onVisible() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [employeeId, router]);

  return null;
}
