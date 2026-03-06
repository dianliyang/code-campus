import React from "react";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import LearningProfileChart from "@/components/identity/LearningProfileChart";

describe("LearningProfileChart", () => {
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
});
