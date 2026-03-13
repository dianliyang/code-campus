import React from "react";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import LearningProfileChart from "@/components/identity/LearningProfileChart";

describe("LearningProfileChart", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders a calmer chart-first summary with dominant field and ranked rows", () => {
    render(
      <LearningProfileChart
        data={[
          { name: "Systems", count: 18 },
          { name: "Machine Learning", count: 12 },
          { name: "Math", count: 6 },
        ]}
        unitLabel="units"
        emptyText="No data"
      />
    );

    expect(screen.getByTestId("learning-profile-chart")).toBeDefined();
    expect(screen.getByTestId("learning-profile-total").textContent).toContain("36");
    expect(screen.getByText("Dominant field")).toBeDefined();
    expect(screen.getAllByText("Systems").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("learning-profile-row")).toHaveLength(3);
  });

  test("uses a flexible summary layout instead of a fixed two-column medium grid", () => {
    render(
      <LearningProfileChart
        data={[
          { name: "Systems", count: 18 },
          { name: "Machine Learning", count: 12 },
          { name: "Math", count: 6 },
        ]}
        unitLabel="units"
        emptyText="No data"
      />
    );

    const chart = screen.getByTestId("learning-profile-chart");
    const summaryGrid = chart.querySelector('[data-testid="learning-profile-summary"]');

    expect(summaryGrid?.className).not.toContain("md:grid-cols-[minmax(0,1fr)_220px]");
    expect(summaryGrid?.className).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(220px,auto)]");
  });
});
