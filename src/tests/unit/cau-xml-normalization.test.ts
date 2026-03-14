import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { CAU } from "@/lib/scrapers/cau";

describe("CAU XML normalization", () => {
  test("maps XML lectures to Course records", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);
    const course = courses.find((entry) => entry.courseCode === "Inf-EntEinSys");

    expect(courses.length).toBeGreaterThan(0);
    expect(course).toEqual(
      expect.objectContaining({
        university: "CAU Kiel",
        courseCode: "Inf-EntEinSys",
        title: "Embedded Real-Time Systems",
        units: "V 4 UE 2",
        credit: 8,
        workload: 6,
        department: "Real-Time Systems / Embedded Systems",
        category: "Compulsory elective modules in Computer Science",
        description: undefined,
        instructors: ["Prof. Dr. Reinhard von Hanxleden"],
        prerequisites: expect.stringContaining("Please register for the course in the StudiDB."),
      }),
    );

    expect(course?.details).toEqual(
      expect.objectContaining({
        type: "V",
        normalizedType: "Lecture",
        internalId: "21176528",
        internalNumber: "080011",
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
    expect(course?.details).toEqual(
      expect.objectContaining({
        schedule: {
          Lecture: [
            expect.stringContaining("Monday 14:15-15:45"),
            expect.stringContaining("Wednesday 10:15-11:45"),
          ],
          Exercise: [expect.stringContaining("12:15-13:45")],
        },
      }),
    );
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

  test("drops courses when merged ModulDB language is German", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const modulDbXml = readFileSync("src/tests/fixtures/cau/moduldb-inf-enteinsys.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);
    const englishCourse = courses.find((entry) => entry.courseCode === "Inf-EntEinSys");

    const englishEnriched = scraper.enrichCourseWithModulDbForTests(englishCourse!, modulDbXml);
    const germanMerged = {
      ...englishEnriched,
      details: {
        ...(englishEnriched.details || {}),
        modulDbTeachingLanguage: "Deutsch",
      },
    };

    expect(scraper.shouldKeepAfterLanguageMergeForTests(englishEnriched)).toBe(true);
    expect(scraper.shouldKeepAfterLanguageMergeForTests(germanMerged)).toBe(false);
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

  test("projects XML term data into course schedule details for downstream plan sync", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);
    const course = courses.find((entry) => entry.courseCode === "Inf-EntEinSys");

    expect(course?.details).toMatchObject({
      schedule: {
        Lecture: expect.arrayContaining([
          expect.stringContaining("Monday 14:15-15:45"),
          expect.stringContaining("Wednesday 10:15-11:45"),
        ]),
      },
      scheduleEntries: expect.arrayContaining([
        expect.objectContaining({
          kind: "Lecture",
          dayOfWeek: 1,
          startTime: "14:15",
          endTime: "15:45",
          startDate: "2026-04-12",
          endDate: "2026-04-12",
        }),
      ]),
    });
  });
});
