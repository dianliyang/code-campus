import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import WorkoutListHeader from "@/components/workouts/WorkoutListHeader";

const searchParamsState = {
  value: "",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

describe("WorkoutListHeader responsive behavior", () => {
  beforeEach(() => {
    searchParamsState.value = "";
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 640,
    });
  });

  test("hides the layout switch on mobile", async () => {
    render(
      <WorkoutListHeader
        viewMode="list"
        setViewMode={vi.fn()}
        dict={{} as never}
        isRefreshing={false}
        refreshingCategory={undefined}
        refreshList={vi.fn(async () => {})}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/list view/i)).toBeNull();
    });

    expect(screen.queryByLabelText(/grid view/i)).toBeNull();
  });

  test("shows a persistent mobile search input and uses the same sort trigger treatment as courses", async () => {
    const refreshList = vi.fn(async () => {});

    render(
      <WorkoutListHeader
        viewMode="list"
        setViewMode={vi.fn()}
        dict={{} as never}
        isRefreshing={false}
        refreshingCategory={undefined}
        refreshList={refreshList}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/list view/i)).toBeNull();
    });

    const leading = screen.getAllByTestId("workout-toolbar-leading").at(-1)!;
    const trailing = screen.getAllByTestId("workout-toolbar-trailing").at(-1)!;

    const mobileSearch = within(leading).getByTestId("workout-mobile-search");
    expect(mobileSearch).toBeDefined();
    expect(within(mobileSearch).getByPlaceholderText(/search workouts/i)).toBeDefined();
    expect(within(leading).queryByLabelText(/search workouts/i)).toBeNull();
    expect(within(trailing).getByRole("button", { name: /sort/i })).toBeDefined();
    expect(within(trailing).queryByRole("combobox", { name: /sort/i })).toBeNull();
    expect(within(trailing).getByLabelText(/filter/i)).toBeDefined();

    fireEvent.click(within(trailing).getByLabelText(/refresh all workout categories/i));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /urban apes/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /refresh selected/i }));

    expect(refreshList).toHaveBeenCalledWith({ sources: ["cau-sport", "urban-apes"] });
  });

  test("shows the active filter count on the filter button", async () => {
    searchParamsState.value = "provider=Urban+Apes&days=Mon,Tue&status=available";

    render(
      <WorkoutListHeader
        viewMode="list"
        setViewMode={vi.fn()}
        dict={{} as never}
        isRefreshing={false}
        refreshingCategory={undefined}
        refreshList={vi.fn(async () => {})}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/list view/i)).toBeNull();
    });

    const trailing = screen.getAllByTestId("workout-toolbar-trailing").at(-1)!;
    expect(within(trailing).getByLabelText("Filter").textContent).toContain("4");
  });

  test("uses the same compact clear icon sizing as courses", async () => {
    render(
      <WorkoutListHeader
        viewMode="list"
        setViewMode={vi.fn()}
        dict={{} as never}
        isRefreshing={false}
        refreshingCategory={undefined}
        refreshList={vi.fn(async () => {})}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/list view/i)).toBeNull();
    });

    const mobileSearch = screen.getAllByTestId("workout-mobile-search").at(-1)!;
    const input = within(mobileSearch).getByPlaceholderText(/search workouts/i);
    fireEvent.change(input, { target: { value: "spin" } });

    const clearButton = within(mobileSearch).getByRole("button", { name: /clear search/i });
    const icon = clearButton.querySelector("svg");

    expect(icon?.getAttribute("class")).toContain("size-4");
  });
});
