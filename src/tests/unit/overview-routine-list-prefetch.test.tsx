import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import OverviewRoutineList from "@/components/dashboard/OverviewRoutineList";

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

describe("OverviewRoutineList course links", () => {
  afterEach(() => {
    cleanup();
  });

  test("disables course detail prefetch for routine items", () => {
    render(
      <OverviewRoutineList
        initialItems={[
          {
            key: "course-42",
            title: "Algorithms in Practice",
            timeLabel: "09:00",
            startsAtSort: "09:00",
            kind: "Study",
            statusLabel: "Mark complete",
            isDone: false,
            courseId: 42,
            courseCode: "CS-420",
            sourceType: "plan",
            action: {
              type: "toggle_complete",
              date: "2026-03-13",
              planId: 1,
              scheduleId: null,
              assignmentId: null,
            },
          },
        ]}
      />
    );

    const courseLink = screen.getByRole("link", { name: /Algorithms in Practice/i });
    expect(courseLink.getAttribute("data-prefetch")).toBe("false");
  });
});
