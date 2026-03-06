import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CourseListHeader from "@/components/home/CourseListHeader";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("CourseListHeader", () => {
  test("renders toolbar controls without embedding the page title block", () => {
    render(
      <CourseListHeader
        viewMode="list"
        setViewMode={vi.fn()}
        dict={{} as never}
        filterUniversities={[]}
        filterSemesters={[]}
      />,
    );

    const leading = screen.getByTestId("course-toolbar-leading");
    const trailing = screen.getByTestId("course-toolbar-trailing");

    expect(screen.queryByText("Explore the catalog and enroll in courses.")).toBeNull();
    expect(within(leading).getByLabelText(/list view/i)).toBeDefined();
    expect(within(leading).getByPlaceholderText(/search courses/i)).toBeDefined();
    expect(within(trailing).getByRole("link", { name: /new course/i })).toBeDefined();
    expect(within(trailing).getByRole("button", { name: /filter/i })).toBeDefined();
  });
});
