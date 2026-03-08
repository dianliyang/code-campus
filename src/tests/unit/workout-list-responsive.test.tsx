import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { Workout } from "@/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workouts",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/actions/courses", () => ({
  toggleWorkoutEnrollmentAction: vi.fn(),
}));

vi.mock("@/components/common/AppToastProvider", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/components/workouts/WorkoutListHeader", () => ({
  default: ({ viewMode }: { viewMode: "list" | "grid" }) => (
    <div data-testid="workout-list-header">mode:{viewMode}</div>
  ),
}));

const dict = {
  sidebar_categories: "Category",
  status_available: "Available",
  status_full: "Full",
  status_expired: "Expired",
  status_waitlist: "Waitlist",
  status_cancelled: "Cancelled",
  status_details: "Details",
} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const workout: Workout = {
  id: 1,
  source: "Uni Sport",
  courseCode: "W-1",
  category: "Cardio",
  categoryEn: "Cardio",
  title: "Campus Run",
  titleEn: "Campus Run",
  dayOfWeek: "Mon",
  startTime: "09:00:00",
  endTime: "10:00:00",
  location: "Track",
  locationEn: "Track",
  instructor: null,
  startDate: "2026-03-01",
  endDate: "2026-03-10",
  priceStudent: 10,
  priceStaff: 20,
  priceExternal: null,
  priceExternalReduced: null,
  bookingStatus: "available",
  bookingUrl: null,
  url: null,
  semester: "SS 2026",
  details: {},
};

describe("WorkoutList responsive behavior", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.setItem("workoutViewMode", "list");
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 640,
    });
  });

  test("forces card layout on mobile even when list view is stored", async () => {
    const { default: WorkoutList } = await import("@/components/workouts/WorkoutList");

    render(
      <WorkoutList
        initialWorkouts={[workout]}
        initialEnrolledIds={[]}
        dict={dict}
        categoryGroups={[
          {
            category: "Cardio",
            count: 1,
            minStudentPrice: 10,
            maxStudentPrice: 10,
          },
        ]}
        selectedCategory="Cardio"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("workout-list-header").textContent).toContain("mode:grid");
    });

    expect(screen.getByText("Campus Run")).toBeDefined();
    expect(screen.getByText("Cardio")).toBeDefined();
  });

  test("keeps fixed-height layout for list mode but lets grid mode grow naturally", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
    window.localStorage.setItem("workoutViewMode", "list");

    const { default: WorkoutList } = await import("@/components/workouts/WorkoutList");
    const listView = render(
      <WorkoutList
        initialWorkouts={[workout]}
        initialEnrolledIds={[]}
        dict={dict}
        categoryGroups={[
          {
            category: "Cardio",
            count: 1,
            minStudentPrice: 10,
            maxStudentPrice: 10,
          },
        ]}
        selectedCategory="Cardio"
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("workout-list-header").at(-1)?.textContent).toContain("mode:list");
    });

    const listRoot = listView.getByTestId("workout-list-root");
    const listContent = listView.getByTestId("workout-list-content");
    expect(listRoot.className).toContain("h-full");
    expect(listContent.className).toContain("min-h-0");
    expect(listContent.className).toContain("flex-1");

    cleanup();
    window.localStorage.setItem("workoutViewMode", "grid");
    const gridView = render(
      <WorkoutList
        initialWorkouts={[workout]}
        initialEnrolledIds={[]}
        dict={dict}
        categoryGroups={[
          {
            category: "Cardio",
            count: 1,
            minStudentPrice: 10,
            maxStudentPrice: 10,
          },
        ]}
        selectedCategory="Cardio"
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("workout-list-header").at(-1)?.textContent).toContain("mode:grid");
    });

    const gridRoot = gridView.getByTestId("workout-list-root");
    const gridContent = gridView.getByTestId("workout-list-content");
    expect(gridRoot.className).not.toContain("h-full");
    expect(gridContent.className).not.toContain("min-h-0");
    expect(gridContent.className).not.toContain("flex-1");
  });
});
