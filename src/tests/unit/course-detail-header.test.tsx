import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CourseDetailHeader from "@/components/courses/CourseDetailHeader";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/common/AppToastProvider", () => ({
  useAppToast: () => ({
    showToast: vi.fn(),
  }),
}));

const baseCourse = {
  id: 1,
  title: "Advanced Systems",
  university: "MIT",
  courseCode: "6.9995",
  url: "https://example.com",
  description: "",
  popularity: 0,
  isHidden: false,
  isInternal: false,
  fields: [],
  semesters: [],
};

describe("CourseDetailHeader", () => {
  test("renders university and course code with the same plain meta style", () => {
    render(<CourseDetailHeader course={baseCourse} />);

    const meta = screen.getByTestId("course-detail-meta");
    expect(meta.textContent).toContain("MIT");
    expect(meta.textContent).toContain("6.9995");
    expect(meta.querySelector("[data-slot='badge']")).toBeNull();
  });
});
