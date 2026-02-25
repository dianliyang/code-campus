import React from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/actions/profile", () => ({
  updateAiPreferences: vi.fn(async () => undefined),
  updateAiPromptTemplates: vi.fn(async () => undefined),
}));

vi.mock("@/lib/ai/models-client", () => ({
  AI_PROVIDERS: ["perplexity", "gemini"],
}));

describe("AI settings usage chart", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("renders usage chart and totals from usage stats endpoint", async () => {
    const mockStats = {
      totals: { requests: 12, tokens_input: 3456, tokens_output: 7890, cost_usd: 0.0456 },
      byFeature: { planner: { requests: 8, cost_usd: 0.03 } },
      byModel: { "perplexity/sonar": { requests: 8, cost_usd: 0.03 } },
      recentTotals: { requests: 5, cost_usd: 0.0123 },
      recentResponses: [
        {
          id: 101,
          feature: "planner",
          preset: "AI Infra",
          provider: "perplexity",
          model: "sonar",
          tokens_input: 1000,
          tokens_output: 600,
          cost_usd: 0.01,
          created_at: "2026-02-25T09:00:00.000Z",
        },
      ],
      daily: {
        "2026-02-19": { requests: 0, cost_usd: 0 },
        "2026-02-20": { requests: 1, cost_usd: 0.002 },
        "2026-02-21": { requests: 2, cost_usd: 0.004 },
        "2026-02-22": { requests: 1, cost_usd: 0.003 },
        "2026-02-23": { requests: 3, cost_usd: 0.006 },
        "2026-02-24": { requests: 2, cost_usd: 0.005 },
        "2026-02-25": { requests: 3, cost_usd: 0.007 },
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => mockStats,
      })) as unknown as typeof fetch
    );

    const { default: AISettingsCard } = await import("@/components/profile/AISettingsCard");

    render(
      <AISettingsCard
        section="usage"
        initialProvider="perplexity"
        initialModel="sonar"
        initialWebSearchEnabled={false}
        initialPromptTemplate=""
        initialStudyPlanPromptTemplate=""
        initialPlannerPromptTemplate=""
        initialTopicsPromptTemplate=""
        initialCourseUpdatePromptTemplate=""
        modelCatalog={{ perplexity: ["sonar"], gemini: ["gemini-2.5-flash"] }}
        defaultPrompts={{
          description: "desc",
          studyPlan: "plan",
          planner: "planner",
          topics: "topics",
          courseUpdate: "update",
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Last 7 Days")).toBeDefined();
    });

    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("$0.0456")).toBeDefined();
    expect(screen.getByText("Recent AI Responses (10)")).toBeDefined();
    expect(screen.getByText("AI Planner · AI Infra")).toBeDefined();
    expect(screen.getByText("By Feature")).toBeDefined();
    expect(screen.getByText("By Model")).toBeDefined();
  });
});
