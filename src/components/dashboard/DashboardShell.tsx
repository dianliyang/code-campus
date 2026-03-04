"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import LeftRail from "@/components/dashboard/LeftRail";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const LEFT_RAIL_COLLAPSED_KEY = "cc:dashboard:left-rail-collapsed";

interface DashboardShellProps {
  labels: {
    command: string;
    identity: string;
    hub: string;
    courses: string;
    projectsSeminars: string;
    studyPlan: string;
    smartPlanner: string;
    studySchedule: string;
    workouts: string;
    profile: string;
    settings: string;
    settingsEngine: string;
    settingsUsage: string;
    settingsSecurity: string;
    settingsSystem: string;
    settingsApiControl: string;
    settingsApiReference: string;
    docs?: string;
    import: string;
  };
  children: React.ReactNode;
}

export default function DashboardShell({ labels, children }: DashboardShellProps) {
  const pathname = usePathname();
  const isScheduleRoute = pathname.startsWith("/study-schedule");
  const isFlushScrollRoute = isScheduleRoute;

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = window.localStorage.getItem(LEFT_RAIL_COLLAPSED_KEY);
      return saved === "true";
    } catch {
      return false;
    }
  });

  return (
    <SidebarProvider
      className="h-svh min-h-0 overflow-hidden overscroll-none"
      open={!collapsed}
      onOpenChange={(open) => {
        const nextCollapsed = !open;
        setCollapsed(nextCollapsed);
        try {
          window.localStorage.setItem(LEFT_RAIL_COLLAPSED_KEY, String(nextCollapsed));
        } catch {
          // Ignore localStorage errors.
        }
      }}
    >
      <LeftRail labels={labels} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden overscroll-none">
        <div
          id="dashboard-scroll"
          className={`h-full w-full ${
            isFlushScrollRoute
              ? "overflow-y-auto overflow-x-hidden overscroll-contain"
              : "overflow-y-auto overflow-x-hidden overscroll-contain p-4"
          }`}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
