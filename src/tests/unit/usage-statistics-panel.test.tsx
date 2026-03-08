import React from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import UsageStatisticsPanel from "@/app/(dashboard)/settings/usage/UsageStatisticsPanel";

const statsPayload = {
  totals: { requests: 12, tokens_input: 1000, tokens_output: 2000, cost_usd: 1.23 },
  byFeature: { chat: { requests: 8, cost_usd: 0.7 } },
  byModel: { "gpt-test": { requests: 8, cost_usd: 0.7 } },
  recentTotals: { requests: 4, cost_usd: 0.2 },
  recentResponses: [],
  daily: { "2026-03-01": { requests: 2, cost_usd: 0.1 } },
};

const zeroRecentStatsPayload = {
  ...statsPayload,
  recentTotals: { requests: 0, cost_usd: 0 },
};

describe("UsageStatisticsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => statsPayload,
      }),
    );
  });

  test("does not add extra horizontal page padding at the panel root", async () => {
    const { container } = render(<UsageStatisticsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Usage Statistics")).toBeDefined();
    });

    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toContain("space-y-3");
    expect(root.className).not.toContain("px-4");
  });

  test("uses a scrollable summary row with icons and avoids redundant zero-value recent text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => zeroRecentStatsPayload,
    }));

    render(<UsageStatisticsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Usage Statistics")).toBeDefined();
    });

    expect(screen.getAllByTestId("usage-summary-row").at(-1)?.className).toContain("overflow-x-auto");
    expect(screen.getAllByTestId("usage-summary-row").at(-1)?.className).toContain("gap-4");
    expect(screen.getAllByTestId("usage-summary-row").at(-1)?.textContent).toContain("Requests");
    const summaryCards = screen.getAllByTestId("usage-summary-row").at(-1)?.querySelectorAll(":scope > div") || [];
    expect(Array.from(summaryCards).every((card) => card.className.includes("shrink-0"))).toBe(true);
    expect(screen.getAllByTestId("usage-stat-requests-icon").at(-1)).toBeDefined();
    expect(screen.getAllByTestId("usage-stat-input-tokens-icon").at(-1)).toBeDefined();
    expect(screen.getAllByText("in last 7 days").at(-1)).toBeDefined();
    expect(screen.queryByText("0 in last 7 days")).toBeNull();
    expect(screen.queryByText("$0.0000 in last 7 days")).toBeNull();
  });
});
