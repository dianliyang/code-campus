import React from "react";
import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CourseMomentumCard from "@/components/dashboard/CourseMomentumCard";

describe("CourseMomentumCard", () => {
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
});
