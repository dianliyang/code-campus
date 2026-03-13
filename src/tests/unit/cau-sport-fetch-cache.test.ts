import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CAUSport } from "@/lib/scrapers/cau-sport";

describe("CAUSport fetchPage cache behavior", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    CAUSport.clearPageCacheForTests();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("reuses cached HTML while max-age is still valid", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("first body", {
        status: 200,
        headers: {
          "cache-control": "public, max-age=5",
          etag: '"etag-1"',
          "last-modified": "Fri, 13 Mar 2026 14:00:01 GMT",
        },
      }),
    );

    const scraper = new CAUSport();
    const first = await scraper.fetchPage("https://example.com/page");
    const second = await scraper.fetchPage("https://example.com/page");

    expect(first).toBe("first body");
    expect(second).toBe("first body");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("revalidates stale cache entries with conditional headers and reuses cached HTML on 304", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T14:07:58Z"));

    fetchMock.mockResolvedValueOnce(
      new Response("cached body", {
        status: 200,
        headers: {
          "cache-control": "public, max-age=5",
          etag: '"etag-2"',
          "last-modified": "Fri, 13 Mar 2026 14:00:01 GMT",
        },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 304,
        headers: {
          "cache-control": "public, max-age=5",
          etag: '"etag-2"',
          "last-modified": "Fri, 13 Mar 2026 14:00:01 GMT",
        },
      }),
    );

    const scraper = new CAUSport();
    expect(await scraper.fetchPage("https://example.com/page")).toBe("cached body");

    vi.advanceTimersByTime(6000);

    expect(await scraper.fetchPage("https://example.com/page")).toBe("cached body");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      "If-None-Match": '"etag-2"',
      "If-Modified-Since": "Fri, 13 Mar 2026 14:00:01 GMT",
    });

    vi.useRealTimers();
  });
});
