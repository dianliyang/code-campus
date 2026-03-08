import React from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import BottomTabBar from "@/components/layout/BottomTabBar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/overview",
}));

describe("BottomTabBar", () => {
  test("renders the primary tabs and exposes the remaining destinations through a More bottom drawer", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <BottomTabBar
        labels={{
          overview: "Overview",
          courses: "Courses",
          studyPlan: "Roadmap",
          studySchedule: "Calendar",
          workouts: "Workouts",
          smartPlanner: "Assist",
          identity: "Identity",
          projectsSeminars: "S&P",
          settings: "Settings",
          settingsEngine: "Engine",
          settingsUsage: "Usage Statistics",
          settingsSystem: "Synchronization",
          settingsApiControl: "API Control",
          import: "Import",
          docs: "Doc",
          settingsApiReference: "API Reference",
        }}
      />,
    );

    expect(screen.getByText("Overview")).toBeDefined();
    expect(screen.getByText("Courses")).toBeDefined();
    expect(screen.getByText("Roadmap")).toBeDefined();
    const calendarLabel = screen.getByText("Calendar");
    expect(calendarLabel).toBeDefined();
    expect(screen.getByText("Workouts")).toBeDefined();
    expect(screen.getByText("More")).toBeDefined();
    expect(calendarLabel.className).not.toContain("uppercase");

    fireEvent.click(screen.getByRole("button", { name: /more/i }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="drawer-content"]')).not.toBeNull();
    });

    const drawer = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
    expect(drawer.getAttribute("data-vaul-drawer-direction")).toBe("bottom");
    expect(within(drawer).getByText("Assist")).toBeDefined();
    expect(within(drawer).getByText("Identity")).toBeDefined();
    expect(within(drawer).getByText("Hub")).toBeDefined();
    expect(within(drawer).getByText("S&P")).toBeDefined();
    expect(within(drawer).getByText("Settings")).toBeDefined();
    expect(within(drawer).getByText("Engine")).toBeDefined();
    expect(within(drawer).getByText("Usage Statistics")).toBeDefined();
    expect(within(drawer).getByText("Synchronization")).toBeDefined();
    expect(within(drawer).getByText("API Control")).toBeDefined();
    expect(within(drawer).getByText("Import")).toBeDefined();
    expect(within(drawer).getAllByText("Doc").length).toBeGreaterThan(0);
    expect(within(drawer).getByText("API Reference")).toBeDefined();
    expect(within(drawer).queryByText("Courses")).toBeNull();
    expect(within(drawer).queryByText("Calendar")).toBeNull();
  });
});
