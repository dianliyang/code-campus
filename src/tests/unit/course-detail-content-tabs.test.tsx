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
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...props} />,
}));

vi.mock("@/actions/courses", () => ({
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
  test("does not render the removed study plan generation controls", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
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

    expect(screen.queryByTitle("Generate study plan preview")).toBeNull();
    expect(screen.queryByText("Study Plan Preview")).toBeNull();
    expect(screen.queryByText("AI Generated Plans")).toBeNull();
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

  test("prefers the top-level category in Course Facts", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams();

    render(
      <CourseDetailContent
        course={{
          ...baseCourse,
          category: "Compulsory elective modules in Computer Science",
          details: {
            ...baseCourse.details,
          },
        }}
        isEnrolled={false}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[]}
      />,
    );

    expect(screen.getByText("Compulsory elective")).toBeDefined();
    expect(screen.queryByText("Workload")).toBeNull();
    expect(screen.queryByText("Level")).toBeNull();
  });

  test("renders prerequisites with the same readable body styling as description text", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams();

    render(
      <CourseDetailContent
        course={{
          ...baseCourse,
          prerequisites: "Linear algebra\nProbability basics",
        }}
        isEnrolled={false}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[]}
      />,
    );

    const text = screen.getByText((content) => content.includes("Linear algebra") && content.includes("Probability basics"));
    expect(text.className).toContain("text-[#555]");
    expect(text.className).toContain("whitespace-pre-wrap");
  });

  test("renders structured description sections with source badges", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams();

    render(
      <CourseDetailContent
        course={{
          ...baseCourse,
          description: "",
          details: {
            descriptionSections: [
              {
                key: "summary",
                label: "Summary",
                text: "Module summary from ModulDB.",
                sourceId: "moduldb",
                sourceLabel: "ModulDB",
              },
              {
                key: "assessment",
                label: "Assessment",
                text: "Final written exam.",
                sourceId: "moduldb",
                sourceLabel: "ModulDB",
              },
            ],
          },
        }}
        isEnrolled={false}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[]}
      />,
    );

    expect(screen.getByText("Summary")).toBeDefined();
    expect(screen.getByText("Module summary from ModulDB.")).toBeDefined();
    expect(screen.getByText("Assessment")).toBeDefined();
    expect(screen.getByText("Final written exam.")).toBeDefined();
    expect(screen.getAllByText("ModulDB").length).toBeGreaterThan(0);
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

  test("renders the schedule calendar for saved study plans alone", async () => {
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

    expect(screen.getAllByText("Schedule Calendar").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-03-03 - 2026-03-31")).toBeDefined();
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

    expect(screen.getAllByText("Schedule Calendar").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-03-10 - 2026-03-10")).toBeDefined();
    expect(screen.getAllByText("Day Details").length).toBeGreaterThan(0);
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

  test("groups study plans with the same slot onto one card and combines day dots", async () => {
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
            daysOfWeek: [1],
            startTime: "09:00:00",
            endTime: "11:00:00",
            location: "Library",
            kind: "Lecture",
            startDate: "2026-03-01",
            endDate: "2026-03-31",
            timezone: "UTC",
          },
          {
            id: 12,
            daysOfWeek: [3],
            startTime: "09:00:00",
            endTime: "11:00:00",
            location: "Library",
            kind: "Lecture",
            startDate: "2026-03-01",
            endDate: "2026-03-31",
            timezone: "UTC",
          },
          {
            id: 13,
            daysOfWeek: [5],
            startTime: "13:00:00",
            endTime: "14:00:00",
            location: "Studio",
            kind: "Lab",
            startDate: "2026-03-01",
            endDate: "2026-03-31",
            timezone: "UTC",
          },
        ]}
      />,
    );

    expect(screen.getAllByLabelText("Study days Mon, Wed").length).toBeGreaterThan(0);
    expect(screen.getByText("2 days")).toBeDefined();
    expect(screen.getAllByTitle("Edit plan").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByTitle("Delete plan").length).toBeGreaterThanOrEqual(3);
  });

  test("does not expose study plan edit or delete controls for internal courses", async () => {
    const { default: CourseDetailContent } = await import("@/components/courses/CourseDetailContent");
    mockSearchParams = new URLSearchParams();

    const { container } = render(
      <CourseDetailContent
        course={{
          ...baseCourse,
          isInternal: true,
        }}
        isEnrolled={true}
        descriptionEmptyText="No description"
        availableTopics={[]}
        availableSemesters={[]}
        studyPlans={[
          {
            id: 1,
            daysOfWeek: [1],
            startTime: "10:00:00",
            endTime: "11:00:00",
            location: "Library",
            kind: "Study",
            startDate: "2026-03-01",
            endDate: "2026-03-31",
            timezone: "UTC",
          },
        ]}
      />,
    );

    expect(container.querySelector('[title="Edit plan"]')).toBeNull();
    expect(container.querySelector('[title="Delete plan"]')).toBeNull();
  });
});
