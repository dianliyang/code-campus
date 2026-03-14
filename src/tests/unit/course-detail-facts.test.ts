import { describe, expect, test } from "vitest";
import { formatCourseTermLabels } from "@/lib/course-detail-facts";

describe("formatCourseTermLabels", () => {
  test("returns related semester labels when join rows exist", () => {
    expect(
      formatCourseTermLabels(
        [
          { semesters: { term: "Winter", year: 2025 } },
          { semesters: { term: "Spring", year: 2026 } },
        ],
        { term: "Winter", year: 2025 },
      ),
    ).toEqual(["Winter 2025", "Spring 2026"]);
  });

  test("falls back to latest_semester when no related semester rows exist", () => {
    expect(formatCourseTermLabels([], { term: "Spring", year: 2026 })).toEqual(["Spring 2026"]);
  });

  test("infers the term from schedule entry dates when joins and latest_semester are missing", () => {
    expect(
      formatCourseTermLabels(
        [],
        null,
        {
          scheduleEntries: [
            { startDate: "2025-10-19" },
            { startDate: "2025-10-20" },
          ],
        },
      ),
    ).toEqual(["Winter 2025"]);
  });

  test("returns an empty list when no semester data is available", () => {
    expect(formatCourseTermLabels([], null)).toEqual([]);
  });
});
