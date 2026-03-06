import React from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Course } from "@/types";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("@/actions/courses", () => ({
  confirmGeneratedStudyPlans: vi.fn(),
  previewStudyPlansFromCourseSchedule: vi.fn(),
  toggleCourseEnrollmentAction: vi.fn(),
  updateCourseResources: vi.fn(),
}));

vi.mock("@/components/common/AppToastProvider", () => ({
  useAppToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock("@/components/courses/CourseDetailTopSection", () => ({
  default: () => <div data-testid="course-detail-top-section" />,
}));

vi.mock("@/components/courses/CourseDetailHeader", () => ({
  default: () => <div data-testid="course-detail-header" />,
}));

vi.mock("@/components/courses/WeeklyScheduleCard", () => ({
  default: ({
    title,
    headerRight,
    children,
    footer,
  }: {
    title?: React.ReactNode;
    headerRight?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div data-testid="weekly-schedule-card">
      <div>{title}</div>
      <div>{headerRight}</div>
      <div>{children}</div>
      <div>{footer}</div>
    </div>
  ),
}));

vi.mock("@/components/home/AddPlanModal", () => ({
  default: () => <div data-testid="add-plan-modal" />,
}));

const baseCourse: Course = {
  id: 1,
  university: "CMU",
  courseCode: "15-112",
  title: "Fundamentals of Programming",
  url: "https://example.edu/course",
  description: "Intro course",
  popularity: 5,
  workload: "medium",
  isHidden: false,
  isInternal: false,
  fields: [],
  semesters: [],
  details: {
    schedule: {
      Lecture: ["Mon/Wed 10:00-11:30"],
    },
  },
};

describe("CourseDetailContent tabs", () => {
  test("renders the current course detail sections", { timeout: 10000 }, async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams();
    render(
      <CourseDetailContent
        course={baseCourse}
        isEnrolled={false}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[]}
      />,
    );

    expect(screen.getByText("Description")).toBeDefined();
    expect(screen.getByText("Logistics")).toBeDefined();
    expect(screen.getByText("Resources")).toBeDefined();
    expect(screen.getByText("Course Facts")).toBeDefined();
  });

  test("does not render the schedule calendar for generated study plans alone", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams();
    render(
      <CourseDetailContent
        course={baseCourse}
        isEnrolled={true}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[
          {
            id: 1,
            daysOfWeek: [2],
            startTime: "19:00:00",
            endTime: "21:00:00",
            location: "Library",
            kind: "Generated",
            startDate: "2026-03-01",
            endDate: "2026-03-31",
            timezone: "UTC",
          },
        ]}
      />,
    );

    expect(screen.queryByText("Schedule Calendar")).toBeNull();
  });

  test("renders the schedule calendar when scheduled tasks exist", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams("tab=schedule");
    render(
      <CourseDetailContent
        course={baseCourse}
        isEnrolled={true}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[]}
        scheduleItems={[
          {
            date: "2026-03-10",
            title: "Read cache notes",
            kind: null,
            focus: "Caching",
            durationMinutes: 45,
          },
        ]}
      />,
    );

    expect(screen.getByText("Schedule Calendar")).toBeDefined();
    expect(screen.getByText("2026-03-10 - 2026-03-10")).toBeDefined();
    expect(screen.getByText("Day Details")).toBeDefined();
  });

  test("course detail calendar day details show task duration and inferred kind badge", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams("tab=schedule");
    render(
      <CourseDetailContent
        course={baseCourse}
        isEnrolled={true}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[]}
        scheduleItems={[
          {
            date: "2026-03-10",
            title: "Read cache notes",
            kind: null,
            focus: "Caching",
            durationMinutes: 45,
          },
        ]}
      />,
    );

    expect(screen.getAllByText("Read cache notes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("45m").length).toBeGreaterThan(0);
    expect(screen.getAllByText("reading").length).toBeGreaterThan(0);
  });

  test("course detail calendar month cell bars reflect preview task kinds", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams("tab=schedule");
    render(
      <CourseDetailContent
        course={baseCourse}
        isEnrolled={true}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[]}
        scheduleItems={[
          {
            date: "2026-03-10",
            title: "Lecture recap",
            kind: "lecture",
            focus: "Week 1",
            durationMinutes: 45,
          },
          {
            date: "2026-03-10",
            title: "Assignment 1",
            kind: "assignment",
            focus: "Week 1",
            durationMinutes: 60,
          },
          {
            date: "2026-03-10",
            title: "Quiz prep",
            kind: "quiz",
            focus: "Week 1",
            durationMinutes: 30,
          },
        ]}
      />,
    );

    expect(
      screen
        .getAllByTestId("calendar-bar-2026-03-10-0")
        .some((element) => element.getAttribute("data-kind") === "lecture"),
    ).toBe(true);
    expect(
      screen
        .getAllByTestId("calendar-bar-2026-03-10-1")
        .some((element) => element.getAttribute("data-kind") === "assignment"),
    ).toBe(true);
    expect(
      screen
        .getAllByTestId("calendar-bar-2026-03-10-2")
        .some((element) => element.getAttribute("data-kind") === "quiz"),
    ).toBe(true);
  });

  test("course detail calendar does not mark past tasks completed without a study log", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));

    try {
      const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
      mockSearchParams = new URLSearchParams("tab=schedule");
      render(
        <CourseDetailContent
          course={baseCourse}
          isEnrolled={true}
          descriptionEmptyText="No description"
          availableTopics={[]}
          availableSemesters={[]}
          studyPlans={[]}
          scheduleItems={[
            {
              date: "2026-03-10",
              title: "Review lecture notes",
              kind: "review",
              focus: "Week 2",
              durationMinutes: 30,
            },
          ]}
        />,
      );

      expect(screen.getAllByText("Not completed").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Completed")).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("course detail calendar marks tasks completed when a study log exists for that date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));

    try {
      const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
      mockSearchParams = new URLSearchParams("tab=schedule");
      render(
        <CourseDetailContent
          course={baseCourse}
          isEnrolled={true}
          descriptionEmptyText="No description"
          availableTopics={[]}
          availableSemesters={[]}
          studyPlans={[]}
          studyLogs={[
            {
              planId: 99,
              logDate: "2026-03-10",
              isCompleted: true,
            },
          ]}
          scheduleItems={[
            {
              date: "2026-03-10",
              title: "Review lecture notes",
              kind: "review",
              focus: "Week 2",
              durationMinutes: 30,
            },
          ]}
        />,
      );

      expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("weekly schedule edit saves through the study plans update endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams();
    render(
      <CourseDetailContent
        course={baseCourse}
        isEnrolled={true}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[
          {
            id: 11,
            daysOfWeek: [1, 3],
            startTime: "09:00:00",
            endTime: "11:00:00",
            location: "Library",
            kind: "Lecture",
            startDate: "2026-03-01",
            endDate: "2026-03-31",
            timezone: "UTC",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getAllByTitle("Edit plan")[0]);
    fireEvent.click(screen.getAllByTitle("Confirm")[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/study-plans/update",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });
});
