import { describe, expect, test } from "vitest";
import { CAU } from "@/lib/scrapers/cau";

describe("CAU XML parent-child merging", () => {
  test("attaches exercise meetings to the parent lecture instead of emitting a standalone course", async () => {
    const scraper = new CAU();

    const courses = await scraper.mergeLectureChildrenForTests([
      {
        key: "Lecture.parent",
        id: "lecture-1",
        importParentId: null,
        parentLectureKey: null,
        name: "INF-101: Intro",
        short: "INF-101",
        titleEn: null,
        type: "V",
        orgname: "Department",
        summary: null,
        timeDescription: null,
        literature: null,
        organizational: null,
        ectsCred: "5",
        sws: "2",
        resourceUrls: [],
        classificationKeys: [],
        personKeys: ["Person.parent"],
        roomKeys: ["Room.parent"],
        terms: [{ startdate: "2026-04-10", enddate: null, starttime: "10:00", endtime: "12:00", repeat: null, exclude: null, roomKeys: ["Room.parent"] }],
      },
      {
        key: "Lecture.child",
        id: "exercise-1",
        importParentId: null,
        parentLectureKey: "Lecture.parent",
        name: "UE INF-101",
        short: "UE-INF-101",
        titleEn: null,
        type: "UE",
        orgname: "Department",
        summary: null,
        timeDescription: "Exercises start in week 2",
        literature: null,
        organizational: null,
        ectsCred: null,
        sws: "1",
        resourceUrls: [],
        classificationKeys: [],
        personKeys: ["Person.child"],
        roomKeys: ["Room.child"],
        terms: [{ startdate: "2026-04-11", enddate: null, starttime: "08:00", endtime: "09:00", repeat: null, exclude: null, roomKeys: ["Room.child"] }],
      },
    ]);

    expect(courses).toHaveLength(1);
    expect(courses[0].courseCode).toBe("INF-101");
    expect(courses[0].units).toBe("V 2 UE 1");
    expect(courses[0].workload).toBe(3);
    expect(courses[0].details).toEqual(
      expect.objectContaining({
        type: "V",
        normalizedType: "Lecture",
      }),
    );
    expect(courses[0].details).not.toHaveProperty("schedule");
    expect(courses[0].details).not.toHaveProperty("auxiliarySchedules");
    expect(courses[0].details).not.toHaveProperty("locations");
  });
});
