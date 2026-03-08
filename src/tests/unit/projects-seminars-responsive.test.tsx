import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("view=list"),
}));

vi.mock("@/components/projects-seminars/table/projects-seminars-data-table", () => ({
  default: () => <div data-testid="projects-seminars-data-table" />,
}));

describe("Projects seminars responsive behavior", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 640,
    });
  });

  test("adds bottom space under the toolbar and hides the layout switch on mobile", async () => {
    const { default: ProjectsSeminarsToolbar } = await import("@/components/projects-seminars/ProjectsSeminarsToolbar");

    const { container } = render(
      <ProjectsSeminarsToolbar categories={["Seminar"]} semesters={["Spring 2026"]} />,
    );

    await waitFor(() => {
      expect(screen.queryByText("List")).toBeNull();
    });

    expect((container.firstChild as HTMLElement).className).toContain("mb-4");
    expect(screen.queryByText("Grid")).toBeNull();
  });

  test("keeps the mobile toolbar on one row with persistent search and course-style sort trigger", async () => {
    const { default: ProjectsSeminarsToolbar } = await import("@/components/projects-seminars/ProjectsSeminarsToolbar");

    render(
      <ProjectsSeminarsToolbar categories={["Seminar"]} semesters={["Spring 2026"]} />,
    );

    await waitFor(() => {
      expect(screen.queryByText("List")).toBeNull();
    });

    const leading = screen.getAllByTestId("projects-toolbar-leading").at(-1)!;
    const trailing = screen.getAllByTestId("projects-toolbar-trailing").at(-1)!;
    const row = screen.getAllByTestId("projects-toolbar-row").at(-1)!;

    expect(row.className).toContain("flex-nowrap");
    const mobileSearch = within(leading).getByTestId("projects-mobile-search");
    expect(mobileSearch).toBeDefined();
    expect(within(mobileSearch).getByPlaceholderText(/search seminars/i)).toBeDefined();
    expect(within(leading).queryByLabelText(/search seminars/i)).toBeNull();
    expect(within(trailing).getByRole("button", { name: /sort/i })).toBeDefined();
    expect(within(trailing).queryByRole("combobox", { name: /sort/i })).toBeNull();
    expect(within(trailing).getByLabelText(/filter/i)).toBeDefined();
  });

  test("forces card layout on mobile even when list view is requested", async () => {
    const { default: ProjectsSeminarsInfiniteContent } = await import("@/components/projects-seminars/ProjectsSeminarsInfiniteContent");

    render(
      <ProjectsSeminarsInfiniteContent
        initialRows={[
          {
            id: 1,
            title: "Seminar A",
            courseCode: "SP101",
            university: "CMU",
            category: "Seminar",
            department: "CS",
            enrolled: false,
            credit: 6,
            semesterLabel: "Spring 2026",
            url: null,
          },
        ]}
        initialGridItems={[
          {
            id: 1,
            title: "Seminar A",
            course_code: "SP101",
            university: "CMU",
            category: "Seminar",
            credit: 6,
            url: null,
            latest_semester: { term: "Spring", year: 2026 },
            enrolled: false,
          },
        ]}
        initialPage={1}
        totalPages={1}
        perPage={20}
        view="list"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Seminar A")).toBeDefined();
    });

    expect(screen.queryByTestId("projects-seminars-data-table")).toBeNull();
  });
});
