import { describe, expect, test, vi } from "vitest";

const fetchMock = vi.fn(async () => undefined as any);

vi.mock("undici", () => {
  class MockAgent {
    constructor(_opts?: unknown) {}
  }

  return {
    fetch: fetchMock,
    Agent: MockAgent,
  };
});

describe("CMU scraper fetch guard", () => {
  test("fetchPage returns empty string when fetch yields undefined response", async () => {
    const { CMU } = await import("../../lib/scrapers/cmu");
    const scraper = new CMU();

    const html = await scraper.fetchPage("https://example.com/test", 1);
    expect(html).toBe("");
  });
});
