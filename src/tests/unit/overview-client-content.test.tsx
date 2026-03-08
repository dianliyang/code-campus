import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import OverviewClientContent from "@/components/dashboard/OverviewClientContent";

const statsPayload = {
  routine: [],
  momentum: {
    statusCounts: {},
    recentUpdates30: 0,
    stalledCount: 0,
    avgProgress: 0,
    weeklyActivity: [],
    studyDoneToday: 0,
    attendedToday: 0,
    inProgressCount: 0,
  },
  execution: {
    studyLogs: [],
    workoutLogs: [],
  },
  identity: {
    fieldStats: [],
    primaryFocus: "Systems",
  },
};

vi.mock("@/components/identity/LearningProfileChart", () => ({
  default: () => <div data-testid="learning-profile-chart" />,
}));

vi.mock("@/components/identity/CourseStatusChart", () => ({
  default: () => <div data-testid="course-status-chart" />,
}));

vi.mock("@/components/dashboard/AttendanceLearningChart", () => ({
  default: () => <div data-testid="attendance-learning-chart" />,
}));

vi.mock("@/components/dashboard/OverviewRoutineList", () => ({
  default: () => <div data-testid="overview-routine-list" />,
}));

describe("OverviewClientContent", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => statsPayload,
      }),
    );
  });

  test("adds extra mobile bottom padding so content clears the bottom tab bar", async () => {
    const { container } = render(<OverviewClientContent />);

    await waitFor(() => {
      expect(screen.getByTestId("overview-routine-list")).toBeDefined();
    });

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("pb-24");
  });
});
