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
    let callIndex = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      callIndex += 1;

      if (callIndex === 1) {
        return new Response(encoder.encode(exportPage), { status: 200 });
      }

      if (callIndex === 2) {
        return new Response(encoder.encode(xml), { status: 200 });
      }

      if (url.includes("moduldb.informatik.uni-kiel.de/show.cgi?xml=")) {
        return new Response("", { status: 404 });
      }

      return new Response("", { status: 404 });
    });

    const courses = await scraper.retrieve();

    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(
      fetchMock.mock.calls.some(([input]) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        return url.includes("moduldb.informatik.uni-kiel.de/show.cgi?xml=");
      }),
    ).toBe(true);
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.some((course) => course.courseCode === "Inf-EntEinSys")).toBe(true);
  });
});
