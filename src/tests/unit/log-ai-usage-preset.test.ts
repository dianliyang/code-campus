import { describe, expect, test, vi, beforeEach } from "vitest";

const insertMock = vi.fn(() => Promise.resolve({ error: null }));
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

vi.mock("@/lib/ai/runtime-config", () => ({
  getAiRuntimeConfig: vi.fn(async () => ({
    pricing: {
      sonar: { input: 0.000001, output: 0.000002 },
    },
  })),
}));

describe("logAiUsage preset handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("writes a non-null preset for non-planner features", async () => {
    const { logAiUsage } = await import("@/lib/ai/log-usage");

    logAiUsage({
      userId: "u1",
      provider: "perplexity",
      model: "sonar",
      feature: "course-update",
      tokensInput: 100,
      tokensOutput: 50,
      prompt: "p",
      responseText: "r",
      requestPayload: { courseId: "c1" },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(fromMock).toHaveBeenCalledWith("ai_responses");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: "course-update",
      })
    );
  });
});
