import React from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Course } from "@/types";
import { previewStudyPlansFromCourseSchedule } from "@/actions/courses";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...props} />,
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
  test("renders study plan preview headings in title case and uses plain muted cards for generated plans", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    vi.mocked(previewStudyPlansFromCourseSchedule).mockResolvedValue({
      originalSchedule: [{ type: "Lecture", line: "Mon 10:00-11:30" }],
      generatedPlans: [
        {
          daysOfWeek: [1, 3],
          startTime: "10:00:00",
          endTime: "11:30:00",
          location: "Room 101",
          kind: "Session",
          startDate: "2026-03-01",
          endDate: "2026-03-31",
          alreadyExists: false,
        },
      ],
    });
    mockSearchParams = new URLSearchParams();

    render(
      <CourseDetailContent
        course={baseCourse}
        isEnrolled={true}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[]}
      />,
    );

    fireEvent.click(screen.getByTitle("Generate study plan preview"));

    const weeklyScheduleHeading = screen.getByText("Weekly Schedule");
    const previewTitle = await screen.findByText("Study Plan Preview");
    const originalHeading = await screen.findByText("Original Schedule");
    const generatedHeading = screen.getByText("AI Generated Plans");
    const generatedCard = screen.getByTestId("generated-plan-card-0");

    expect(
      weeklyScheduleHeading.compareDocumentPosition(previewTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      previewTitle.compareDocumentPosition(generatedCard) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(originalHeading.className).not.toContain("uppercase");
    expect(generatedHeading.className).not.toContain("uppercase");
    expect(generatedCard.className).toContain("bg-muted/30");
    expect(generatedCard.className).not.toContain("bg-primary/10");
    expect(generatedCard.className).not.toContain("hover:border-primary/30");
  });

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

    expect(screen.getAllByText("Description").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Logistics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resources").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Course Facts").length).toBeGreaterThan(0);
  });

  test("uses page-level scrolling on mobile instead of independent column scroll regions", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams();

    const { container } = render(
      <CourseDetailContent
        course={baseCourse}
        isEnrolled={false}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[]}
      />,
    );

    const mainColumn = screen.getAllByTestId("course-detail-main-column").at(-1)!;
    const sideColumn = screen.getAllByTestId("course-detail-side-column").at(-1)!;
    const root = container.firstElementChild as HTMLElement;
    const layout = screen.getAllByTestId("course-detail-layout").at(-1)!;

    const rootTokens = root.className.split(/\s+/);
    const layoutTokens = layout.className.split(/\s+/);
    const mainTokens = mainColumn.className.split(/\s+/);
    const sideTokens = sideColumn.className.split(/\s+/);

    expect(rootTokens).not.toContain("h-full");
    expect(rootTokens).not.toContain("overflow-hidden");
    expect(rootTokens).toContain("lg:h-full");
    expect(layoutTokens).not.toContain("h-full");
    expect(layoutTokens).not.toContain("overflow-hidden");
    expect(layoutTokens).toContain("lg:h-full");
    expect(layoutTokens).toContain("lg:overflow-hidden");
    expect(mainTokens).not.toContain("overflow-y-auto");
    expect(sideTokens).not.toContain("overflow-y-auto");
    expect(mainTokens).toContain("lg:overflow-y-auto");
    expect(sideTokens).toContain("lg:overflow-y-auto");
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
