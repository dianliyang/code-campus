"use client";

import { useSyncExternalStore } from "react";
import LeftRail from "@/components/dashboard/LeftRail";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const LEFT_RAIL_COLLAPSED_KEY = "cc:dashboard:left-rail-collapsed";
const LEFT_RAIL_EVENT = "cc:dashboard:left-rail-changed";

interface DashboardShellProps {
  labels: {
    command: string;
    overview: string;
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
    settingsSystem: string;
    settingsApiControl: string;
    settingsApiReference: string;
    docs?: string;
    import: string;
  };
  children: React.ReactNode;
}

export default function DashboardShell({ labels, children }: DashboardShellProps) {
  const collapsed = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const handleChange = () => callback();
      window.addEventListener("storage", handleChange);
      window.addEventListener(LEFT_RAIL_EVENT, handleChange);
      return () => {
        window.removeEventListener("storage", handleChange);
        window.removeEventListener(LEFT_RAIL_EVENT, handleChange);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(LEFT_RAIL_COLLAPSED_KEY) === "true";
      } catch {
        return false;
      }
    },
    () => false
  );

  return (
    <SidebarProvider
      className="h-svh min-h-0 overflow-hidden overscroll-none"
      open={!collapsed}
      onOpenChange={(open) => {
        const nextCollapsed = !open;
        try {
          window.localStorage.setItem(LEFT_RAIL_COLLAPSED_KEY, String(nextCollapsed));
          window.dispatchEvent(new Event(LEFT_RAIL_EVENT));
        } catch {
          // Ignore localStorage errors.
        }
      }}
    >
      <LeftRail labels={labels} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden overscroll-none">
        <div
          id="dashboard-scroll"
          className="h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain pb-[calc(88px+env(safe-area-inset-bottom,0px))] lg:pb-0"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
