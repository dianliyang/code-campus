import React from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import CourseListHeader from "@/components/home/CourseListHeader";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

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

    const leading = screen.getAllByTestId("course-toolbar-leading").at(-1)!;
    const trailing = screen.getAllByTestId("course-toolbar-trailing").at(-1)!;

    expect(screen.queryByText("Explore the catalog and enroll in courses.")).toBeNull();
    expect(within(leading).getByLabelText(/list view/i)).toBeDefined();
    expect(within(leading).getByPlaceholderText(/search courses/i)).toBeDefined();
    expect(within(trailing).queryByRole("link", { name: /new course/i })).toBeNull();
    expect(within(trailing).getAllByRole("combobox").length).toBeGreaterThan(0);
  });

  test("shows a persistent mobile search input and removes the extra new-course action", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 640,
    });

    render(
      <CourseListHeader
        viewMode="list"
        setViewMode={vi.fn()}
        dict={{} as never}
        filterUniversities={[]}
        filterSemesters={[]}
      />,
    );

    const leading = screen.getAllByTestId("course-toolbar-leading").at(-1)!;
    const trailing = screen.getAllByTestId("course-toolbar-trailing").at(-1)!;

    await waitFor(() => {
      expect(within(leading).queryByLabelText(/list view/i)).toBeNull();
    });

    const mobileSearch = within(leading).getByTestId("course-mobile-search");
    expect(mobileSearch).toBeDefined();
    expect(within(mobileSearch).getByPlaceholderText(/search courses/i)).toBeDefined();
    expect(within(trailing).getAllByRole("combobox").length).toBeGreaterThan(0);
    expect(within(leading).queryByLabelText(/search courses/i)).toBeNull();
    expect(within(trailing).queryByRole("link", { name: /new course/i })).toBeNull();
    expect(within(trailing).queryByRole("button", { name: /filter/i })).toBeNull();
  });

  test("does not render the old mobile filter drawer trigger", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 640,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <CourseListHeader
        viewMode="list"
        setViewMode={vi.fn()}
        dict={{} as never}
        filterUniversities={["CMU"]}
        filterSemesters={["Spring 2026"]}
      />,
    );

    const trailing = screen.getAllByTestId("course-toolbar-trailing").at(-1)!;
    expect(within(trailing).queryByRole("button", { name: /filter/i })).toBeNull();
    expect(document.querySelector('[data-slot="drawer-content"]')).toBeNull();
  });

  test("keeps the desktop sort trigger text-only apart from the select chevron", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });

    render(
      <CourseListHeader
        viewMode="list"
        setViewMode={vi.fn()}
        dict={{} as never}
        filterUniversities={[]}
        filterSemesters={[]}
      />,
    );

    const trailing = screen.getAllByTestId("course-toolbar-trailing").at(-1)!;
    const desktopSortTrigger = within(trailing).getAllByRole("combobox").at(-1)!;

    expect(desktopSortTrigger.querySelectorAll("svg")).toHaveLength(1);
  });

  test("offers credit and semester sorting, without popularity", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });

    render(
      <CourseListHeader
        viewMode="list"
        setViewMode={vi.fn()}
        dict={{} as never}
        filterUniversities={[]}
        filterSemesters={[]}
      />,
    );

    const trailing = screen.getAllByTestId("course-toolbar-trailing").at(-1)!;
    fireEvent.click(within(trailing).getAllByRole("combobox").at(-1)!);

    expect(screen.getByText("Credit")).toBeDefined();
    expect(screen.getByText("Latest Semester")).toBeDefined();
    expect(screen.queryByText("Popularity")).toBeNull();
  });
});
