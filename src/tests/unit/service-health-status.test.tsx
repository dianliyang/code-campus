import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const healthResponse = {
  healthy: false,
  providers: [
    {
      provider: "openai",
      healthy: false,
      missing: [],
      checks: {},
      probe: {
        ok: false,
        status: 401,
        reason: "API key rejected (Unauthorized/Forbidden)",
      },
    },
    {
      provider: "gemini",
      healthy: true,
      missing: [],
      checks: {},
      probe: {
        ok: true,
        status: 200,
      },
    },
    {
      provider: "perplexity",
      healthy: false,
      missing: [],
      checks: {},
      probe: {
        ok: false,
        status: 401,
        reason: "API key rejected (Unauthorized/Forbidden)",
      },
    },
  ],
  checked_at: "2026-03-08T21:44:55.000Z",
};

describe("ServiceHealthStatus", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => healthResponse,
      }),
    );
  });

  test("renders provider display names and page-consistent non-uppercase section copy", async () => {
    const { default: ServiceHealthStatus } = await import("@/components/identity/ServiceHealthStatus");

    render(<ServiceHealthStatus />);

    await waitFor(() => {
      expect(screen.getByText("OpenAI")).toBeDefined();
    });

    const openAiLabel = screen.getByText("OpenAI");
    const geminiLabel = screen.getByText("Gemini");
    const perplexityLabel = screen.getByText("Perplexity");
    const statusLabel = screen.getByText("Configuration Needed");
    const attentionLabel = screen.getAllByText("Attention")[0];
    const verifiedLabel = screen.getByText(/Verified:/);
    const probeMessage = screen.getAllByText(/API key rejected/)[0];
    const verifiedMessage = screen.getByText("Connection verified");

    expect(openAiLabel.className).not.toContain("uppercase");
    expect(geminiLabel.className).not.toContain("uppercase");
    expect(perplexityLabel.className).not.toContain("uppercase");
    expect(statusLabel.className).not.toContain("uppercase");
    expect(attentionLabel.className).not.toContain("uppercase");
    expect(verifiedLabel.className).not.toContain("uppercase");
    expect(probeMessage.className).toContain("text-[11px]");
    expect(verifiedMessage.className).toContain("text-[11px]");
  });
});
