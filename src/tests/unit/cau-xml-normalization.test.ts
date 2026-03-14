import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { CAU } from "@/lib/scrapers/cau";

describe("CAU XML normalization", () => {
  test("maps XML lectures to Course records", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);
    const course = courses.find((entry) => entry.courseCode === "infEOR-01a");

    expect(courses.length).toBeGreaterThan(0);
    expect(course).toEqual(
      expect.objectContaining({
        university: "CAU Kiel",
        courseCode: "infEOR-01a",
        title: "Einf\u00fchrung in Operations Research",
        units: "V 2 UE 2",
        credit: 6,
        workload: 4,
        department: "Algorithmic Optimal Control - Ocean CO2 Uptake",
        category: "Compulsory elective modules in Computer Science",
        description: expect.stringContaining("Weitere Informationen"),
        instructors: ["Prof. Dr. Thomas Slawig"],
        prerequisites: undefined,
      }),
    );

    expect(course?.details).toEqual(
      expect.objectContaining({
        type: "V",
        normalizedType: "Lecture",
        internalId: "22632461",
        internalNumber: "080034",
        dataSources: [
          {
            id: "univis",
            label: "UnivIS",
            coverage: ["catalog", "schedule", "instructors"],
          },
        ],
      }),
    );
    expect(course?.details).not.toHaveProperty("locations");
    expect(course?.details).not.toHaveProperty("schedule");
    expect(course?.details).not.toHaveProperty("auxiliarySchedules");
  });

  test("normalizes seminar, advanced seminar, and language course types from XML", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);
    const advancedSeminar = courses.find((entry) => entry.courseCode === "AlgOptSteu-Meeresforsch");
    const seminar = courses.find((entry) => entry.courseCode === "infSemDaSci-01a");
    const languageCourse = courses.find((entry) => entry.courseCode === "infFPInS");

    expect(advancedSeminar?.details).toEqual(
      expect.objectContaining({
        type: "OS",
        normalizedType: "Advanced Seminar",
      }),
    );
    expect(advancedSeminar?.category).toBe("Master Thesis Supervision Seminar");

    expect(seminar?.details).toEqual(
      expect.objectContaining({
        type: "S",
        normalizedType: "Seminar",
      }),
    );
    expect(seminar?.category).toBe("Seminar");

    expect(languageCourse?.details).toEqual(
      expect.objectContaining({
        type: "SPR",
        normalizedType: "Language Course",
      }),
    );
  });

  test("filters layout lectures and empty-short exercises from XML results", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);

    expect(courses.some((entry) => entry.title.includes("(Layout)"))).toBe(false);
    expect(courses.some((entry) => entry.courseCode === "")).toBe(false);
  });

  test("keeps XML resource links at the top level", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);
    const course = courses.find((entry) => entry.courseCode === "Inf-EntEinSys");

    expect(course?.resources).toContain("https://elearn.informatik.uni-kiel.de/course/view.php?id=256");
    expect(course?.resources).toContain(
      "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=techn/infor/inform/echtze/infent&anonymous=1&lang=en&sem=2025w&tdir=techn/infora/master",
    );
  });
});
