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

  test("keeps explicitly English XML rows and preserves their normalized types", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);
    const seminar = courses.find((entry) => entry.courseCode === "infSemDaSci-01a");
    const lecture = courses.find((entry) => entry.courseCode === "infAuLearn-01a");

    expect(seminar?.details).toEqual(
      expect.objectContaining({
        type: "S",
        normalizedType: "Seminar",
      }),
    );
    expect(seminar?.category).toBe("Seminar");

    expect(lecture?.details).toEqual(
      expect.objectContaining({
        type: "V",
        normalizedType: "Lecture",
      }),
    );
    expect(lecture?.category).toBe("Compulsory elective modules in Computer Science");
  });

  test("filters layout lectures and empty-short exercises from XML results", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);

    expect(courses.some((entry) => entry.title.includes("(Layout)"))).toBe(false);
    expect(courses.some((entry) => entry.courseCode === "")).toBe(false);
  });

  test("drops XML lectures without explicit englisch=ja", async () => {
    const xml = `<?xml version="1.0"?>
      <UnivIS version="1.6" semester="2026s" organisation="CAU Kiel">
        <Lecture key="Lecture.keep">
          <dozs></dozs>
          <englisch>ja</englisch>
          <id>1</id>
          <name>Inf-KEEP: Keep Me</name>
          <short>Inf-KEEP</short>
          <type>V</type>
        </Lecture>
        <Lecture key="Lecture.drop">
          <dozs></dozs>
          <id>2</id>
          <name>Inf-DROP: Drop Me</name>
          <short>Inf-DROP</short>
          <type>V</type>
        </Lecture>
      </UnivIS>`;
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);

    expect(courses.map((entry) => entry.courseCode)).toEqual(["Inf-KEEP"]);
  });

  test("merges auxiliary XML exercise rows into an explicit-English parent lecture even when the child row has no englisch flag", async () => {
    const xml = `<?xml version="1.0"?>
      <UnivIS version="1.6" semester="2025w" organisation="CAU Kiel">
        <Room key="Room.one">
          <short>CAP</short>
        </Room>
        <Room key="Room.two">
          <short>OS</short>
        </Room>
        <Lecture key="Lecture.parent">
          <classification><UnivISRef type="Title" key="Title.techn.infora.master.wahlpf" /></classification>
          <dozs></dozs>
          <englisch>ja</englisch>
          <id>1</id>
          <name>infIntCry-01a: Introduction to Cryptography</name>
          <short>infIntCry-01a</short>
          <startdate>2025-10-19</startdate>
          <enddate>2026-02-08</enddate>
          <sws>2</sws>
          <terms>
            <term>
              <repeat>w1 3</repeat>
              <starttime>8:15</starttime>
              <endtime>9:45</endtime>
              <room><UnivISRef type="Room" key="Room.one" /></room>
            </term>
          </terms>
          <type>V</type>
        </Lecture>
        <Lecture key="Lecture.child">
          <dozs></dozs>
          <id>2</id>
          <name>Exercise: Introduction to Cryptography</name>
          <parent-lv><UnivISRef type="Lecture" key="Lecture.parent" /></parent-lv>
          <startdate>2025-10-19</startdate>
          <enddate>2026-02-08</enddate>
          <sws>2</sws>
          <terms>
            <term>
              <repeat>w1 2</repeat>
              <starttime>12:15</starttime>
              <endtime>13:45</endtime>
              <room><UnivISRef type="Room" key="Room.two" /></room>
            </term>
          </terms>
          <type>UE</type>
        </Lecture>
      </UnivIS>`;
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);
    const course = courses.find((entry) => entry.courseCode === "infIntCry-01a");

    expect(course?.units).toBe("V 2 UE 2");
    expect(course?.details).toMatchObject({
      schedule: {
        Lecture: [expect.stringContaining("Wednesday 8:15-9:45")],
        Exercise: [expect.stringContaining("Tuesday 12:15-13:45")],
      },
    });
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
          endDate: "2026-07-12",
        }),
      ]),
    });
  });

  test("drops XML lectures without explicit englisch=ja even when they have recurring schedule data", async () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const courses = await scraper.parseXmlCoursesForTests(xml);

    expect(courses.some((entry) => entry.courseCode === "infTML-01a")).toBe(false);
  });
});
