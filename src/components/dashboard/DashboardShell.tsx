"use client";

import { useState } from "react";
import LeftRail from "@/components/dashboard/LeftRail";

const LEFT_RAIL_COLLAPSED_KEY = "cc:dashboard:left-rail-collapsed";

interface DashboardShellProps {
  labels: {
    command: string;
    identity: string;
    hub: string;
    courses: string;
    projectsSeminars: string;
    studyPlan: string;
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
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = window.localStorage.getItem(LEFT_RAIL_COLLAPSED_KEY);
      return saved === "true";
    } catch {
      return false;
    }
  });

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LEFT_RAIL_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore localStorage errors.
      }
      return next;
    });
  };

  return (
    <div className="h-full flex overflow-hidden">
      <LeftRail labels={labels} collapsed={collapsed} onToggle={handleToggle} />
      <section className="flex-1 min-w-0 h-full overflow-hidden p-1.5 sm:p-2">
        <div id="dashboard-scroll" className="h-full rounded-lg bg-[#fcfcfc] px-2 pt-[2.75rem] pb-0 sm:px-3 sm:pt-3 sm:pb-3 overflow-y-auto">
          {children}
        </div>
      </section>
    </div>
  );
}
