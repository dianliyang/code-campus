import { beforeEach, describe, expect, test, vi } from "vitest";
import { MIT } from "../../lib/scrapers/mit";
import { Course } from "../../lib/scrapers/types";

vi.mock("../../lib/scrapers/utils/semester", () => ({
  parseSemesterCode: vi.fn(() => ({ term: "Fall", year: 2025 })),
}));

describe("MIT scraper dedupe", () => {
  let scraper: MIT;

  beforeEach(() => {
    scraper = new MIT();
  });

  test("keeps higher-level course when title and pattern collide", async () => {
    const html = `
      <html><body>
        <h3>6.102 Intro to Algorithms</h3>
        <img alt="Undergrad" />
        <img alt="______" />
        <p>Units: 3-0-9</p>
        <h3>6.602 Intro to Algorithms</h3>
        <img alt="Graduate" />
        <img alt="______" />
        <p>Units: 3-0-9</p>
      </body></html>
    `;

    const courses = await scraper.parser(html);
    expect(courses).toHaveLength(1);
    expect(courses[0].courseCode).toBe("6.602");
    expect(courses[0].level).toBe("graduate");

    const mitLinks = (courses[0].details as Record<string, unknown>)?.variant_code_links as Array<{ id: string; link: string }>;
    expect(Array.isArray(mitLinks)).toBe(true);
    expect(mitLinks.map((x) => x.id)).toContain("6.102");
    expect(mitLinks.map((x) => x.id)).toContain("6.602");
  });

  test("does not merge when subject numeric length differs", () => {
    const scraper = new MIT();
    const input: Course[] = [
      {
        university: "mit",
        courseCode: "6.10",
        title: "Signals and Systems",
      },
      {
        university: "mit",
        courseCode: "6.610",
        title: "Signals and Systems",
      },
    ];

    const deduped = (scraper as unknown as { dedupeCoursesByTitleAndPattern: (courses: Course[]) => Course[] })
      .dedupeCoursesByTitleAndPattern(input);
    expect(deduped).toHaveLength(2);
  });

  test("merges MIT undergrad/grad paired numbering like 3950/3952", () => {
    const scraper = new MIT();
    const input: Course[] = [
      {
        university: "mit",
        courseCode: "6.3950",
        title: "AI, Decision Making, and Society",
        level: "undergraduate",
      },
      {
        university: "mit",
        courseCode: "6.3952",
        title: "AI, Decision Making, and Society",
        level: "graduate",
      },
    ];

    const deduped = (scraper as unknown as { dedupeCoursesByTitleAndPattern: (courses: Course[]) => Course[] })
      .dedupeCoursesByTitleAndPattern(input);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].courseCode).toBe("6.3952");
  });

  test("uses last digit to pick graduate over undergraduate for 4-digit pairs", () => {
    const scraper = new MIT();
    const input: Course[] = [
      {
        university: "mit",
        courseCode: "6.5830",
        title: "Database Systems",
      },
      {
        university: "mit",
        courseCode: "6.5831",
        title: "Database Systems",
      },
    ];

    const deduped = (scraper as unknown as { dedupeCoursesByTitleAndPattern: (courses: Course[]) => Course[] })
      .dedupeCoursesByTitleAndPattern(input);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].courseCode).toBe("6.5830");
    expect(deduped[0].level).toBe("graduate");
  });

  test("uses first digit after decimal as baseline level for non-4-digit codes", () => {
    const scraper = new MIT();
    const infer = (code: string) =>
      (scraper as unknown as { inferLevelFromCourseCode: (code: string) => string }).inferLevelFromCourseCode(code);
    expect(infer("6.121")).toBe("undergraduate");
    expect(infer("6.821")).toBe("graduate");
  });
});
