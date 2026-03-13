import React from "react";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import CourseMomentumCard from "@/components/dashboard/CourseMomentumCard";

describe("CourseMomentumCard", () => {
  afterEach(() => {
    cleanup();
  });

  test("anchors metric labels above values in the momentum bento cards", () => {
    render(
      <CourseMomentumCard
        routineItems={[
          {
            key: "study:1",
            title: "Algorithms review",
            meta: "CS 101 · Self-Study",
            timeLabel: "09:00 - 10:00",
            startsAtSort: "09:00",
            sourceType: "study_plan",
            isDone: false,
            action: null,
          },
        ]}
        inProgressCount={2}
        studyDoneToday={1}
        attendedToday={1}
      />,
    );

    const routineMetric = screen.getByTestId("momentum-metric-routine");
    expect(routineMetric.className).toContain("justify-between");
    expect(within(routineMetric).getByText("Routine")).toBeDefined();
    expect(within(routineMetric).getByText("1")).toBeDefined();
  });

  test("lights the exact number of routine rectangles up to the 10-slot cap", () => {
    render(
      <CourseMomentumCard
        routineItems={Array.from({ length: 6 }, (_, index) => ({
          key: `study:${index + 1}`,
          title: `Routine ${index + 1}`,
          meta: "CS 101 · Self-Study",
          timeLabel: "09:00 - 10:00",
          startsAtSort: `0${index}:00`,
          sourceType: "study_plan",
          isDone: false,
          action: null,
        }))}
        inProgressCount={2}
        studyDoneToday={3}
        attendedToday={1}
      />,
    );

    const routineMetric = screen.getByTestId("momentum-metric-routine");
    const bars = routineMetric.querySelectorAll('[data-testid="momentum-bar-segment"], [data-testid="momentum-bar-segment-active"]');
    const activeBars = routineMetric.querySelectorAll('[data-testid="momentum-bar-segment-active"]');

    expect(bars).toHaveLength(10);
    expect(activeBars).toHaveLength(6);
  });
});
