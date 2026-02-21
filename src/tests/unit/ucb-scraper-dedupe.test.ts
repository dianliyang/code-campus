import { describe, expect, test } from "vitest";
import { UCB } from "../../lib/scrapers/ucb";
import { Course } from "../../lib/scrapers/types";

describe("UCB scraper dedupe", () => {
  test("keeps higher-level course when subject/pattern/title collide", () => {
    const scraper = new UCB();
    const input: Course[] = [
      {
        university: "ucb",
        courseCode: "COMPSCI 10",
        title: "Foundations of Computing",
        url: "https://example.com/10",
        level: "undergraduate",
      },
      {
        university: "ucb",
        courseCode: "COMPSCI 110",
        title: "Foundations of Computing",
        url: "https://example.com/110",
        level: "undergraduate",
      },
      {
        university: "ucb",
        courseCode: "COMPSCI 210",
        title: "Foundations of Computing",
        url: "https://example.com/210",
        level: "graduate",
      },
    ];

    const deduped = (scraper as unknown as { dedupeCoursesByTitleAndPattern: (courses: Course[]) => Course[] })
      .dedupeCoursesByTitleAndPattern(input);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].courseCode).toBe("COMPSCI 210");
    expect(deduped[0].level).toBe("graduate");

    const links = deduped[0].details.variant_code_links as Array<{ id: string; link: string }>;
    expect(Array.isArray(links)).toBe(true);
    expect(links.map((l) => l.id)).toEqual(expect.arrayContaining(["COMPSCI 10", "COMPSCI 110", "COMPSCI 210"]));
  });
});
