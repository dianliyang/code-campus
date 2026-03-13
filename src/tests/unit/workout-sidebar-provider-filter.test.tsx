import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WorkoutSidebar from "@/components/workouts/WorkoutSidebar";

const pushMock = vi.fn();
const searchParamsState = {
  value: "filters=open&provider=CAU%20Kiel%20Sportzentrum",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

describe("WorkoutSidebar provider filter", () => {
  beforeEach(() => {
    pushMock.mockReset();
    searchParamsState.value = "filters=open&provider=CAU%20Kiel%20Sportzentrum";
  });

  test("does not render a category filter section", () => {
    render(
      <WorkoutSidebar
        providers={[
          { name: "CAU Kiel Sportzentrum", count: 12 },
          { name: "Urban Apes", count: 2 },
        ]}
        statuses={[{ name: "available", count: 14 }]}
        dict={{ sidebar_categories: "Categories" } as never}
      />,
    );

    expect(screen.queryByText("Categories")).toBeNull();
    expect(screen.queryByText("Bouldering")).toBeNull();
  });

  test("writes the selected provider into the shareable URL", () => {
    render(
      <WorkoutSidebar
        providers={[
          { name: "CAU Kiel Sportzentrum", count: 12 },
          { name: "Urban Apes", count: 2 },
        ]}
        statuses={[{ name: "available", count: 14 }]}
        dict={{} as never}
      />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[1]);

    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("provider=Urban+Apes"),
      { scroll: false },
    );
  });

  test("filter count only reflects provider, day, and status filters", () => {
    searchParamsState.value =
      "filters=open&provider=CAU%20Kiel%20Sportzentrum&categories=Boxing&days=Mon,Tue&status=available";

    render(
      <WorkoutSidebar
        providers={[
          { name: "CAU Kiel Sportzentrum", count: 12 },
          { name: "Urban Apes", count: 2 },
        ]}
        statuses={[{ name: "available", count: 14 }]}
        dict={{} as never}
      />,
    );

    expect(screen.getByText("4")).toBeDefined();
    expect(screen.queryByText("Boxing")).toBeNull();

    searchParamsState.value = "filters=open&provider=CAU%20Kiel%20Sportzentrum";
  });
});
