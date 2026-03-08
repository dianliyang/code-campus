import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardShell from "@/components/dashboard/DashboardShell";

const pathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

vi.mock("@/components/dashboard/LeftRail", () => ({
  default: () => <div data-testid="left-rail" />,
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarInset: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sidebar-inset" className={className}>
      {children}
    </div>
  ),
}));

const labels = {
  command: "Command",
  identity: "Identity",
  hub: "Hub",
  courses: "Courses",
  projectsSeminars: "Projects",
  studyPlan: "Roadmap",
  smartPlanner: "Assist",
  studySchedule: "Calendar",
  workouts: "Workouts",
  profile: "Profile",
  settings: "Settings",
  settingsEngine: "Engine",
  settingsUsage: "Usage",
  settingsSystem: "System",
  settingsApiControl: "API",
  settingsApiReference: "Reference",
  import: "Import",
};

describe("DashboardShell padding", () => {
  beforeEach(() => {
    pathnameMock.mockReset();
  });

  test("does not add shared horizontal padding to the dashboard scroll container", () => {
    pathnameMock.mockReturnValue("/courses");

    render(
      <DashboardShell labels={labels}>
        <div>Content</div>
      </DashboardShell>,
    );

    const scrollContainer = document.getElementById("dashboard-scroll");

    expect(scrollContainer).toBeDefined();
    expect(scrollContainer?.className).not.toContain("px-4");
    expect(scrollContainer?.className).not.toContain("pb-8");
    expect(scrollContainer?.className).toContain("pb-[calc(88px+env(safe-area-inset-bottom,0px))]");
  });

  test("keeps calendar page free of shared horizontal shell padding", () => {
    pathnameMock.mockReturnValue("/calendar");

    render(
      <DashboardShell labels={labels}>
        <div>Content</div>
      </DashboardShell>,
    );

    const scrollContainer = document.getElementById("dashboard-scroll");

    expect(scrollContainer).toBeDefined();
    expect(scrollContainer?.className).not.toContain("px-4");
    expect(scrollContainer?.className).not.toContain("pb-8");
    expect(screen.getAllByTestId("left-rail").length).toBeGreaterThan(0);
  });
});
