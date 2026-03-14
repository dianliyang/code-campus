import { afterEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { CAU } from "@/lib/scrapers/cau";

const encoder = new TextEncoder();

describe("CAU retrieve XML flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("discovers XML export and returns normalized courses", async () => {
    const scraper = new CAU();
    const exportPage = readFileSync("src/tests/fixtures/cau/xml-export-page.html", "utf8");
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(encoder.encode(exportPage), { status: 200 }))
      .mockResolvedValueOnce(new Response(encoder.encode(xml), { status: 200 }));

    const courses = await scraper.retrieve();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.some((course) => course.courseCode === "infEOR-01a")).toBe(true);
  });
});
