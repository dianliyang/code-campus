import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ActiveCourseTrack from "@/components/home/ActiveCourseTrack";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => (
    <a
      href={typeof href === "string" ? href : "#"}
      data-prefetch={prefetch == null ? "default" : String(prefetch)}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/home/AddPlanModal", () => ({
  default: () => null,
}));

vi.mock("@/components/common/AppToastProvider", () => ({
  useAppToast: () => ({
    showToast: vi.fn(),
  }),
}));

const course = {
  id: 42,
  title: "Algorithms in Practice",
  courseCode: "CS-420",
  university: "Code Campus University",
  url: "https://example.com/course",
  description: "Course description",
  popularity: 10,
  isHidden: false,
  fields: [],
  semesters: ["Spring 2026"],
};

const courseWithCredit = {
  ...course,
  credit: 8,
};

describe("ActiveCourseTrack", () => {
  afterEach(() => {
    cleanup();
    refreshMock.mockReset();
    vi.unstubAllGlobals();
  });

  test("shows schedule times, date range, day count, and credits in separate footer columns", () => {
    render(
      <ActiveCourseTrack
        course={courseWithCredit}
        initialProgress={0}
        plan={{
          id: 9,
          start_date: "2026-03-05",
          end_date: "2026-06-05",
          days_of_week: [4],
          start_time: "09:00:00",
          end_time: "11:00:00",
          location: "Library",
        }}
      />
    );

    expect(screen.queryByText("Next Focus")).toBeNull();
    expect(screen.queryByText("Next Date")).toBeNull();
    expect(screen.getByText("Spring 2026")).toBeDefined();
    expect(screen.queryByText("Start time")).toBeNull();
    expect(screen.queryByText("End time")).toBeNull();
    expect(screen.queryByText("Start date")).toBeNull();
    expect(screen.queryByText("End date")).toBeNull();
    const leading = screen.getByTestId("roadmap-plan-leading");
    const trailing = screen.getByTestId("roadmap-plan-trailing");

    expect(within(leading).getByText("9:00 AM - 11:00 AM")).toBeDefined();
    expect(within(leading).getByText("Mar 5, 2026 - Jun 5, 2026")).toBeDefined();

    const dayCount = within(trailing).getByTestId("roadmap-plan-days");
    expect(dayCount.textContent).toBe("93 days");
    expect(within(dayCount).getByText("93").tagName).toBe("STRONG");

    const creditSummary = within(trailing).getByTestId("roadmap-plan-credits");
    expect(creditSummary.textContent).toBe("8 credits");
    expect(within(creditSummary).getByText("8").tagName).toBe("STRONG");

    expect(within(trailing).getByLabelText("Study days")).toBeDefined();
    expect(trailing.textContent).toContain("8 credits");
    expect(trailing.textContent).toContain("93 days");
  });

  test("keeps the day count on the left even when the course has no credit", () => {
    render(
      <ActiveCourseTrack
        course={course}
        initialProgress={0}
        plan={{
          id: 10,
          start_date: "2026-03-05",
          end_date: "2026-03-14",
          days_of_week: [4],
          start_time: "09:00:00",
          end_time: "11:00:00",
          location: "Library",
        }}
      />
    );

    const leading = screen.getByTestId("roadmap-plan-leading");
    const trailing = screen.getByTestId("roadmap-plan-trailing");
    const dayCount = within(trailing).getByTestId("roadmap-plan-days");
    const creditSummary = within(trailing).getByTestId("roadmap-plan-credits");

    expect(within(leading).getByText("9:00 AM - 11:00 AM")).toBeDefined();
    expect(within(leading).getByText("Mar 5, 2026 - Mar 14, 2026")).toBeDefined();
    expect(within(trailing).getByLabelText("Study days")).toBeDefined();
    expect(dayCount.textContent).toBe("10 days");
    expect(within(dayCount).getByText("10").tagName).toBe("STRONG");
    expect(creditSummary.textContent).toBe("No credit");
  });

  test("disables detail prefetch for the title link and exposes a mark-completed action", () => {
    render(
      <ActiveCourseTrack
        course={course}
        initialProgress={0}
        plan={null}
      />
    );

    const titleLink = screen.getByRole("link", { name: "Algorithms in Practice" });
    expect(titleLink.getAttribute("data-prefetch")).toBe("false");
    expect(screen.getByRole("button", { name: "Mark completed" })).toBeDefined();
  });

  test("marks the roadmap course completed through the enrollment API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ActiveCourseTrack
        course={course}
        initialProgress={0}
        plan={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/courses/enroll",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/courses/enroll",
      expect.objectContaining({
        body: JSON.stringify({
          courseId: 42,
          action: "update_progress",
          progress: 100,
          gpa: 0,
          score: 0,
        }),
      }),
    );
    expect(refreshMock).toHaveBeenCalled();
  });
});
