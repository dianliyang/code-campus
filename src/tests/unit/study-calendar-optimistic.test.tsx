import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import StudyCalendar from "@/components/home/StudyCalendar";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const makeProps = () => ({
  courses: [
    { id: 1, title: "Course A", status: "in_progress", progress: 0, updated_at: "2026-02-03" },
    { id: 2, title: "Course B", status: "in_progress", progress: 0, updated_at: "2026-02-03" },
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
      kind: "lecture",
      courses: { id: 1, title: "Course A", course_code: "A101", university: "CCU" },
    },
    {
      id: 20,
      course_id: 2,
      start_date: "2026-02-01",
      end_date: "2026-02-28",
      days_of_week: [3],
      start_time: "14:00",
      end_time: "15:00",
      location: "Room 202",
      kind: "lab",
      courses: { id: 2, title: "Course B", course_code: "B102", university: "CCU" },
    },
  ],
  workouts: [],
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
});

describe("StudyCalendar redesign", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      value: 1200,
    });
    HTMLElement.prototype.scrollTo = vi.fn(function scrollTo(this: HTMLElement, options?: number | ScrollToOptions, y?: number) {
      if (typeof options === "number") {
        this.scrollTop = y ?? 0;
        return;
      }
      this.scrollTop = options?.top ?? 0;
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("toggles an event between not completed and completed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<StudyCalendar {...makeProps()} />);

    const todayRow = screen.getByRole("button", { name: /toggle completion for course a/i });
    const weekEvent = screen.getByTestId("week-event-10:2026-02-03");
    expect(screen.queryByText("Not completed")).toBeNull();

    fireEvent.click(todayRow);

    await waitFor(() => {
      expect(screen.getAllByTestId("week-event-complete-icon").length).toBeGreaterThan(0);
    });

    expect(weekEvent.getAttribute("data-selected")).toBe("false");
    expect(screen.queryByText("Completed")).toBeNull();

    expect(fetchMock).toHaveBeenCalledWith("/api/schedule", expect.objectContaining({
      method: "POST",
    }));
    expect(refreshMock).toHaveBeenCalled();
  });

  test("shows only today's events in the left today list", () => {
    render(<StudyCalendar {...makeProps()} />);

    const todayList = screen.getAllByTestId("today-events-list")[0];
    expect(todayList.textContent).toContain("Course A");
    expect(todayList.textContent).not.toContain("Course B");
    expect(screen.getAllByText("A101 · CCU").length).toBeGreaterThan(0);
  });

  test("stretches the left sidebar to full height and spaces today event cards", () => {
    render(<StudyCalendar {...makeProps()} />);

    const leftColumn = screen.getAllByTestId("calendar-left-column")[0];
    const todayHeader = screen.getAllByTestId("today-heading")[0];
    const todayList = screen.getAllByTestId("today-events-list")[0];
    const eventCards = screen.getAllByTestId("today-event-card");

    expect(leftColumn.className).toContain("h-full");
    expect(todayHeader.className).toContain("items-center");
    expect(todayHeader.className).toContain("px-2");
    expect(todayList.className).toContain("flex-1");
    expect(todayList.className).toContain("space-y-2");
    expect(todayList.className).toContain("pb-4");
    expect(eventCards.length).toBeGreaterThan(0);
  });

  test("renders a designed empty state when today has no activities", () => {
    render(
      <StudyCalendar
        {...makeProps()}
        initialDate={new Date(2026, 2, 5, 10, 0, 0)}
      />
    );

    const todayList = screen.getAllByTestId("today-events-list")[0];
    const emptyState = screen.getByTestId("today-empty-state");
    const timelineScroller = screen.getAllByTestId("calendar-timeline-scroll")[0];

    expect(emptyState).toBeDefined();
    expect(emptyState.textContent).toContain("Rest Day");
    expect(emptyState.textContent).toContain("Rest today, study tomorrow");
    expect(emptyState.className).not.toContain("border");
    expect(emptyState.className).not.toContain("bg-[");
    expect(emptyState.className).toContain("justify-center");
    expect(screen.getByTestId("today-empty-state-icon")).toBeDefined();
    expect(todayList.className).toContain("pb-4");
    expect(timelineScroller.className).toContain("pb-4");
    expect(todayList.textContent).toContain("Rest Day");
    expect(screen.queryByTestId("today-event-card")).toBeNull();
  });

  test("renders mirrored workout events as read-only calendar items", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StudyCalendar
        {...makeProps()}
        workouts={[
          {
            id: 77,
            title: "Campus Run",
            category: "Cardio",
            source: "Uni Sport",
            day_of_week: "Tuesday",
            start_date: "2026-02-01",
            end_date: "2026-02-28",
            start_time: "08:00",
            end_time: "09:00",
            location: "Track",
          },
        ]}
      />
    );

    expect(screen.getAllByText("Campus Run").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cardio · Uni Sport").length).toBeGreaterThan(0);

    const todayRow = screen.getByRole("button", { name: /view event campus run/i });
    fireEvent.click(todayRow);

    await waitFor(() => {
      expect(screen.getByText("workout")).toBeDefined();
    });

    expect(screen.queryByRole("button", { name: /mark complete campus run/i })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("shows a current time line and auto-scrolls the timeline when today is visible", async () => {
    render(<StudyCalendar {...makeProps()} />);

    const timelineScroller = screen.getAllByTestId("calendar-timeline-scroll")[0];
    const currentTimeLine = screen.getAllByTestId("current-time-line")[0];
    const currentTimeLabelSlot = screen.getAllByTestId("current-time-label-slot")[0];
    const currentTimeLineSegment = screen.getAllByTestId("current-time-line-segment")[0];

    expect(currentTimeLine).toBeDefined();
    expect(currentTimeLine.textContent).toContain("10:00");
    expect(currentTimeLine.className).toContain("left-0");
    expect(currentTimeLabelSlot.className).toContain("justify-end");
    expect(currentTimeLabelSlot.className).not.toContain("justify-center");
    expect(currentTimeLabelSlot.className).not.toContain("pr-1");
    expect(currentTimeLineSegment.className).toContain("bg-[#ef4444]");

    await waitFor(() => {
      expect((timelineScroller as HTMLElement).scrollTop).toBeGreaterThan(0);
    });
  });

  test("separates the week header labels and removes the mini calendar bottom padding", () => {
    render(<StudyCalendar {...makeProps()} />);

    const weekHeader = screen.getAllByTestId("week-header")[0];
    const miniCalendarSection = screen.getAllByTestId("mini-calendar-section")[0];
    const todayHeading = screen.getAllByTestId("today-heading")[0];
    const todayHeaderTitle = screen.getAllByTestId("today-header-title")[0];
    const weekHeaderTitle = screen.getAllByTestId("week-header-title")[0];

    expect(todayHeaderTitle.textContent).toBe("Today");
    expect(weekHeaderTitle.textContent).toBe("Week 5 Feb 1 - Feb 7, 2026");
    expect(todayHeaderTitle.className).toContain("text-xl");
    expect(weekHeaderTitle.className).toContain("text-xl");
    expect(weekHeader.className).toContain("items-center");
    expect(weekHeader.className).toContain("h-12");
    expect(todayHeading.className).toContain("h-12");
    expect(miniCalendarSection.className).not.toContain("pb-4");
    expect(within(weekHeader).getAllByText("Today")).toHaveLength(1);
  });

  test("navigates weeks by prev/next controls", { timeout: 10000 }, () => {
    render(<StudyCalendar {...makeProps()} />);

    expect(screen.getAllByText("Week 5 Feb 1 - Feb 7, 2026").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Next week" })[0]);
    expect(screen.getAllByText("Week 6 Feb 8 - Feb 14, 2026").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Previous week" })[0]);
    expect(screen.getAllByText("Week 5 Feb 1 - Feb 7, 2026").length).toBeGreaterThan(0);
  });

  test("mini calendar today button resets month and week to today", () => {
    render(<StudyCalendar {...makeProps()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Next month" })[0]);
    expect(screen.getByText("Mar 2026")).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: "Mini calendar today" })[0]);

    expect(screen.getAllByText("Feb 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Week 5 Feb 1 - Feb 7, 2026").length).toBeGreaterThan(0);
  });

  test("mini calendar places today button between previous and next month controls", () => {
    render(<StudyCalendar {...makeProps()} />);

    const controls = screen.getAllByTestId("mini-calendar-controls")[0];
    const buttons = controls.querySelectorAll("button");

    expect(buttons).toHaveLength(3);
    expect(buttons[0].getAttribute("aria-label")).toBe("Previous month");
    expect(buttons[1].getAttribute("aria-label")).toBe("Mini calendar today");
    expect(buttons[2].getAttribute("aria-label")).toBe("Next month");
  });

  test("clicking another event focuses a different course event", { timeout: 10000 }, () => {
    render(<StudyCalendar {...makeProps()} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Course A/i })[0]);
    expect(screen.getAllByText("A101 · CCU").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: /Course B/i })[0]);
    expect(screen.getAllByText("B102 · CCU").length).toBeGreaterThan(0);
  });

});
