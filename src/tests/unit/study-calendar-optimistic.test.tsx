import React from "react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StudyCalendar from "@/components/home/StudyCalendar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const makeProps = () => ({
  courses: [
    { id: 1, title: "Course A", status: "in_progress", progress: 0, updated_at: "2026-02-03" },
  ],
  plans: [
    {
      id: 10,
      course_id: 1,
      start_date: "2026-02-01",
      end_date: "2026-02-28",
      days_of_week: [2],
      start_time: "10:00",
      end_time: "11:00",
      location: "Room 101",
      type: "lecture",
      courses: { id: 1, title: "Course A", course_code: "A101", university: "CCU" },
    },
  ],
  logs: [],
  dict: {
    calendar_title: "Study Schedule",
    calendar_today: "Today",
    calendar_no_events: "No activities",
    calendar_events: "Select a day",
    calendar_study: "Study",
    calendar_rest: "Rest",
    calendar_study_day: "Study Day",
    calendar_rest_day: "Rest Day",
    calendar_rest_message: "Rest today, study tomorrow",
    calendar_generating: "Generating...",
    calendar_generate_plan: "Generate Plan",
    calendar_courses_scheduled: "scheduled",
    calendar_weekdays: ["S", "M", "T", "W", "T", "F", "S"],
    calendar_months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
});

describe("StudyCalendar optimistic attendance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 3, 10, 0, 0));
    // keep fetch pending
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("toggles completed state immediately on click", () => {
    render(<StudyCalendar {...makeProps()} />);

    const title = screen.getByText("Course A");
    expect(title.className).not.toContain("line-through");

    fireEvent.click(title);

    expect(screen.getByText("Course A").className).toContain("line-through");
  });
});
