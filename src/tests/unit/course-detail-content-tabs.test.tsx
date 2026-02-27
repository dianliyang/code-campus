import React from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CourseDetailContent from "@/components/courses/CourseDetailContent";
import type { Course } from "@/types";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/actions/courses", () => ({
  confirmGeneratedStudyPlans: vi.fn(),
  previewStudyPlansFromCourseSchedule: vi.fn(),
  toggleCourseEnrollmentAction: vi.fn(),
  updateCourseResources: vi.fn(),
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
  test("renders main tabs", () => {
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

    expect(screen.getByRole("button", { name: "Overview" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Schedule" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Assignments" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Grades" })).toBeDefined();
  });

  test("switches schedule view between list and calendar", () => {
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

    const listButton = screen.getByRole("button", { name: "List" });
    const calendarButton = screen.getByRole("button", { name: "Calendar" });

    fireEvent.click(calendarButton);
    expect(calendarButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(listButton);
    expect(listButton.getAttribute("aria-pressed")).toBe("true");
  });

  test("query tab overrides non-enrolled default", () => {
    mockSearchParams = new URLSearchParams("tab=schedule");
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

    const scheduleButtons = screen.getAllByRole("button", { name: "Schedule" });
    expect(scheduleButtons.some((button) => button.getAttribute("aria-pressed") === "true")).toBe(true);
  });
});
