import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Workout } from "@/types";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/workouts",
  useRouter: () => ({ replace: replaceMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("category=Semester Fee"),
}));

vi.mock("@/actions/courses", () => ({
  toggleWorkoutEnrollmentAction: vi.fn(),
}));

vi.mock("@/components/common/AppToastProvider", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/components/workouts/WorkoutListHeader", () => ({
  default: () => <div data-testid="workout-list-header" />,
}));

vi.mock("@/components/workouts/WorkoutCard", () => ({
  default: () => <div data-testid="workout-card" />,
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
  courseCode: "SF-1",
  category: "Semester Fee",
  categoryEn: "Semester Fee",
  title: "Semester Access",
  titleEn: "Semester Access",
  dayOfWeek: "Mon",
  startTime: "09:00:00",
  endTime: "10:00:00",
  location: "Main Hall",
  locationEn: "Main Hall",
  instructor: null,
  startDate: "2026-03-01",
  endDate: "2026-07-01",
  priceStudent: 25,
  priceStaff: 40,
  priceExternal: null,
  priceExternalReduced: null,
  bookingStatus: "available",
  bookingUrl: "https://example.com/book",
  url: "https://example.com",
  semester: "SS 2026",
  details: {},
};

describe("WorkoutList Semester Fee layout", () => {
  test("uses a two-line grid at tighter widths so price and actions do not overlap", async () => {
    const { default: WorkoutList } = await import("@/components/workouts/WorkoutList");

    render(
      <WorkoutList
        initialWorkouts={[workout]}
        initialEnrolledIds={[]}
        dict={dict}
        categoryGroups={[
          {
            category: "Semester Fee",
            count: 1,
            minStudentPrice: 25,
            maxStudentPrice: 25,
          },
        ]}
        selectedCategory="Semester Fee"
      />,
    );

    const row = screen.getByTestId("workout-row-1");

    expect(row.className).toContain("lg:grid-cols-2");
    expect(row.className).toContain("xl:grid-cols-[minmax(0,1fr)_200px_120px_100px_auto]");
  });
});
