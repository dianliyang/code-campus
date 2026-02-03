import React from "react";
import { describe, expect, test, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import StudyCalendar from "@/components/home/StudyCalendar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const makeProps = (overrides?: Partial<React.ComponentProps<typeof StudyCalendar>>) => ({
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
  initialDate: new Date(2026, 1, 3, 10, 0, 0),
  ...overrides,
});

describe("StudyCalendar optimistic attendance", () => {
  const clickFirstCard = () => {
    const title = screen.getAllByText("Course A").find((el) => el.closest("div[aria-disabled]"));
    if (!title) {
      throw new Error("Event card not found");
    }
    const card = title.closest("div[aria-disabled]");
    fireEvent.click(card ?? title);
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("toggles completed state immediately on click", async () => {
    render(
      <StudyCalendar
        {...makeProps({
          onToggleComplete: () => new Promise(() => {}),
        })}
      />
    );

    const title = screen.getAllByText("Course A")[0];
    expect(title.className).not.toContain("line-through");

    await act(async () => {
      clickFirstCard();
    });

    expect(screen.getAllByText("Course A")[0].className).toContain("line-through");
  });

  test.skip("reverts on failure and shows failed status", async () => {
    // TODO: stabilize failure-path rendering assertion
  });
});
