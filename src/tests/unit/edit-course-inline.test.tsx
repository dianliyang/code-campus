import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EditCourseModal from "@/components/courses/EditCourseModal";
import type { Course } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/actions/courses", () => ({
  updateCourse: vi.fn(),
  deleteCourse: vi.fn(),
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

describe("EditCourseModal inline behavior", () => {
  test("renders edit form inline instead of fixed modal overlay", () => {
    const { container } = render(<EditCourseModal course={course} onClose={() => {}} />);

    expect(screen.getByText("Prerequisites")).toBeDefined();
    expect((container.firstElementChild as HTMLElement).className).not.toContain("fixed");
  });
});
