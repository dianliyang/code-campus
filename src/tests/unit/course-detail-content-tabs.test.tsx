import React from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
  default: ({ title, children }: { title?: React.ReactNode; children?: React.ReactNode }) => (
    <div data-testid="weekly-schedule-card">
      <div>{title}</div>
      <div>{children}</div>
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
});
