import { describe, expect, test } from "vitest";
import { Stanford } from "../../lib/scrapers/stanford";
import { Course } from "../../lib/scrapers/types";

describe("Stanford scraper dedupe", () => {
  test("keeps higher-level course for same subject/pattern/title", () => {
    const scraper = new Stanford();
    const input: Course[] = [
      {
        university: "stanford",
        courseCode: "CS 101A",
        title: "Systems Foundations",
        url: "https://example.com/101a",
        level: "undergraduate",
      },
      {
        university: "stanford",
        courseCode: "CS 201A",
        title: "Systems Foundations",
        url: "https://example.com/201a",
        level: "graduate",
      },
      {
        university: "stanford",
        courseCode: "CS 301A",
        title: "Systems Foundations",
        url: "https://example.com/301a",
        level: "graduate",
      },
    ];

    const deduped = (scraper as unknown as { dedupeCoursesByTitleAndPattern: (courses: Course[]) => Course[] })
      .dedupeCoursesByTitleAndPattern(input);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].courseCode).toBe("CS 301A");
    expect(deduped[0].level).toBe("graduate");

    const links = (deduped[0].details as Record<string, unknown>).variant_code_links as Array<{ id: string; link: string }>;
    expect(Array.isArray(links)).toBe(true);
    expect(links.map((l) => l.id)).toEqual(expect.arrayContaining(["CS 101A", "CS 201A", "CS 301A"]));
  });

  test("parser assigns Mathematics department to MATH courses", async () => {
    const scraper = new Stanford();
    const html = `
      <html><body>
        <div class="searchResult">
          <div class="courseInfo">
            <span class="courseNumber">MATH 51:</span>
            <span class="courseTitle">Linear Algebra, Multivariable Calculus, and Modern Applications</span>
            <div class="courseDescription">Study of linear algebra and multivariable calculus.</div>
          </div>
        </div>
      </body></html>
    `;
    const courses = await scraper.parser(html, new Set(), { term: "Spring", year: 2026 });
    expect(courses).toHaveLength(1);
    expect(courses[0].department).toBe("Mathematics");
  });
});
