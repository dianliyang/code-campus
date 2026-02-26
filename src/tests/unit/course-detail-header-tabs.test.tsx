import React from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CourseDetailHeader from "@/components/courses/CourseDetailHeader";
import type { Course } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/actions/courses", () => ({
  deleteCourse: vi.fn(),
}));

vi.mock("@/lib/ai/usage", () => ({
  trackAiUsage: vi.fn(),
}));

const course: Course = {
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
};

describe("CourseDetailHeader tabs", () => {
  test("renders tab buttons and calls onTabChange", () => {
    const onTabChange = vi.fn();

    render(
      <CourseDetailHeader
        course={course}
        activeTab="schedule"
        onTabChange={onTabChange}
      />,
    );

    const overviewBtn = screen.getByRole("button", { name: "Overview" });
    const scheduleBtn = screen.getByRole("button", { name: "Schedule" });
    expect(overviewBtn).toBeDefined();
    expect(scheduleBtn).toBeDefined();

    fireEvent.click(overviewBtn);
    expect(onTabChange).toHaveBeenCalledWith("overview");
  });
});
