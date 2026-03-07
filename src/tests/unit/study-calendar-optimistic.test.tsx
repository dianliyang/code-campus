import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StudyCalendar from "@/components/home/StudyCalendar";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const makeProps = () => ({
  courses: [
    { id: 1, course_code: "A101", university: "CCU", title: "Course A" },
    { id: 2, course_code: "B102", university: "CCU", title: "Course B" },
  ],
  plans: [
    {
      id: 10,
      course_id: 1,
      start_time: "10:00",
      end_time: "11:00",
      location: "Room 101",
      kind: "lecture",
      courses: { id: 1, title: "Course A", course_code: "A101", university: "CCU" },
    },
  ],
  workouts: [
    {
      id: 77,
      title: "Campus Run",
      category: "Cardio",
      source: "Uni Sport",
      start_time: "08:00",
      end_time: "09:00",
      location: "Track",
    },
  ],
  logs: [{ plan_id: 10, log_date: "2026-02-03", is_completed: true }],
  workoutLogs: [{ workout_id: 77, log_date: "2026-02-03", is_attended: false }],
  dict: {
    calendar_weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    calendar_months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  initialDate: new Date(2026, 1, 3, 10, 0, 0),
});

describe("StudyCalendar", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      value: 1200,
    });
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  test("renders today routine shell with current controls", () => {
    render(<StudyCalendar {...makeProps()} />);

    expect(screen.getByText("Today's Routine")).toBeDefined();
    expect(screen.getByRole("button", { name: "Previous week" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Next week" })).toBeDefined();
    expect(screen.getAllByText("Today").length).toBeGreaterThan(0);
  });

  test("renders workout item in today list from legacy props", () => {
    render(<StudyCalendar {...makeProps()} />);

    expect(screen.getAllByText("Campus Run").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/items/).length).toBeGreaterThan(0);
  });

  test("navigates mini calendar month controls", () => {
    render(<StudyCalendar {...makeProps()} />);

    expect(screen.getAllByText("Feb 2026").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Next month" })[0]);
    expect(screen.getAllByText("Mar 2026").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Previous month" })[0]);
    expect(screen.getAllByText("Feb 2026").length).toBeGreaterThan(0);
  });
});
