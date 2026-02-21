import { describe, expect, test } from "vitest";
import { UCB } from "../../lib/scrapers/ucb";
import { Course } from "../../lib/scrapers/types";

describe("UCB scraper dedupe", () => {
  test("keeps higher-level course when subject/pattern/title collide", () => {
    const scraper = new UCB();
    const input: Course[] = [
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
      {
        university: "ucb",
        courseCode: "COMPSCI 310",
        title: "Foundations of Computing",
        url: "https://example.com/310",
        level: "graduate",
      },
    ];

    const deduped = (scraper as unknown as { dedupeCoursesByTitleAndPattern: (courses: Course[]) => Course[] })
      .dedupeCoursesByTitleAndPattern(input);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].courseCode).toBe("COMPSCI 310");
    expect(deduped[0].level).toBe("graduate");

    const links = deduped[0].details.variant_code_links as Array<{ id: string; link: string }>;
    expect(Array.isArray(links)).toBe(true);
    expect(links.map((l) => l.id)).toEqual(expect.arrayContaining(["COMPSCI 110", "COMPSCI 210", "COMPSCI 310"]));
  });

  test("does not merge when numeric length differs", () => {
    const scraper = new UCB();
    const input: Course[] = [
      {
        university: "ucb",
        courseCode: "COMPSCI 10",
        title: "Foundations of Computing",
      },
      {
        university: "ucb",
        courseCode: "COMPSCI 110",
        title: "Foundations of Computing",
      },
    ];

    const deduped = (scraper as unknown as { dedupeCoursesByTitleAndPattern: (courses: Course[]) => Course[] })
      .dedupeCoursesByTitleAndPattern(input);
    expect(deduped).toHaveLength(2);
  });

  test("merges ELENG web variant codes like 242B and W242B", () => {
    const scraper = new UCB();
    const input: Course[] = [
      {
        university: "ucb",
        courseCode: "ELENG 242B",
        title: "Advanced Integrated Circuits for Communications",
      },
      {
        university: "ucb",
        courseCode: "ELENG W242B",
        title: "Advanced Integrated Circuits for Communications",
      },
    ];

    const deduped = (scraper as unknown as { dedupeCoursesByTitleAndPattern: (courses: Course[]) => Course[] })
      .dedupeCoursesByTitleAndPattern(input);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].courseCode).toBe("ELENG W242B");
  });
});
