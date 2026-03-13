import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Workout } from "@/types";

const replaceMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();
let searchParamsValue = "";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workouts",
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock, push: pushMock }),
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

vi.mock("@/actions/courses", () => ({
  toggleWorkoutEnrollmentAction: vi.fn(),
  toggleWorkoutReminderAction: vi.fn(),
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
    replaceMock.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
    searchParamsValue = "category=Cardio";
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
        initialWorkoutTracking={{}}
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
        initialWorkoutTracking={{}}
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
        initialWorkoutTracking={{}}
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

  test("switches categories locally and shows provider badges beside the choices title", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });

    const replaceStateMock = vi.fn();
    window.history.replaceState = replaceStateMock;

    const { default: WorkoutList } = await import("@/components/workouts/WorkoutList");
    const boxingWorkout: Workout = {
      ...workout,
      id: 2,
      source: "Urban Apes",
      category: "Boxing",
      categoryEn: "Boxing",
      title: "Evening Boxing",
      titleEn: "Evening Boxing",
    };

    render(
      <WorkoutList
        initialWorkouts={[workout, boxingWorkout]}
        initialWorkoutTracking={{}}
        dict={dict}
        categoryGroups={[
          {
            category: "Boxing",
            count: 1,
            minStudentPrice: 10,
            maxStudentPrice: 10,
          },
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

    fireEvent.click(screen.getByRole("button", { name: /boxing/i }));

    expect(screen.getByText("Boxing choices")).toBeDefined();
    expect(screen.getByText("Urban Apes")).toBeDefined();
    expect(screen.getAllByText("Evening Boxing").length).toBeGreaterThan(0);
    expect(screen.queryByText("Campus Run")).toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(replaceStateMock).toHaveBeenCalled();
  });

  test("shows reminder instead of enroll for scheduled workouts and displays booking open time", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });

    const { default: WorkoutList } = await import("@/components/workouts/WorkoutList");
    const scheduledWorkout: Workout = {
      ...workout,
      id: 3,
      bookingStatus: "scheduled",
      details: {
        bookingOpensOn: "2026-03-29",
        bookingOpensAt: "2026-03-29T18:00:00",
        durationUrl: "https://example.com/schedule/3",
      },
    };

    render(
      <WorkoutList
        initialWorkouts={[scheduledWorkout]}
        initialWorkoutTracking={{}}
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

    expect(screen.getAllByText("Opens Mar 29, 18:00").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Reminder" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Enroll" })).toBeNull();
    expect(screen.getByTestId("workout-schedule-link-3").querySelector("svg")).not.toBeNull();
  });
});
