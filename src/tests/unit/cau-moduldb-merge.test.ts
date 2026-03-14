import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { CAU } from "@/lib/scrapers/cau";

describe("CAU ModulDB merge", () => {
  test("enriches UnivIS courses with ModulDB metadata and provenance", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const modulDbXml = readFileSync("src/tests/fixtures/cau/moduldb-inf-enteinsys.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);
    const baseCourse = courses.find((entry) => entry.courseCode === "Inf-EntEinSys");
    const enriched = scraper.enrichCourseWithModulDbForTests(baseCourse!, modulDbXml);

    expect(baseCourse?.title).toBe("Embedded Real-Time Systems");
    expect(enriched.title).toBe("Embedded Real-Time Systems");
    expect(enriched.units).toBe("V 4 UE 2");
    expect(enriched.workload).toBe(6);
    expect(enriched.prerequisites).toBe("Mathematical knowledge, programming experience, firm knowledge in C and Java.");
    expect(enriched.description).toBeUndefined();
    expect(enriched.semesters).toEqual(
      expect.arrayContaining([
        { term: "Spring", year: 2026 },
        { term: "Winter", year: 2025 },
      ]),
    );
    expect(enriched.semesters?.[0]).toEqual({ term: "Winter", year: 2025 });
    expect(enriched.semesters?.[0]).not.toEqual({ term: "Spring", year: 2026 });
    expect(enriched.resources).toEqual(
      expect.arrayContaining([
        "https://moduldb.informatik.uni-kiel.de/show.cgi?mod=Inf-EntEinSys",
        "http://www.rtsys.informatik.uni-kiel.de/en/teaching/overview",
      ]),
    );
    expect(enriched.details).toEqual(
      expect.objectContaining({
        dataSources: [
          {
            id: "univis",
            label: "UnivIS",
            coverage: ["catalog", "schedule", "instructors"],
          },
          {
            id: "moduldb",
            label: "ModulDB",
            coverage: ["module", "prerequisites", "workload"],
          },
        ],
        modulDbWorkloadText: "60 h lectures, 30 h exercises, 150 h self studies",
        modulDbLearningGoals: "Students understand the fundamentals of embedded/real-time systems.",
        modulDbContents: "Model-based designConcurrency and scheduling",
        descriptionSections: expect.arrayContaining([
          expect.objectContaining({
            key: "summary",
            label: "Summary",
            sourceLabel: "ModulDB",
          }),
          expect.objectContaining({
            key: "learning_goals",
            label: "Learning goals",
            sourceLabel: "ModulDB",
          }),
        ]),
      }),
    );
  });
});
