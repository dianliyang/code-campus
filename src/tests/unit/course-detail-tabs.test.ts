import { describe, expect, test } from "vitest";
import { resolveInitialCourseDetailTab } from "@/lib/course-detail-tabs";

describe("resolveInitialCourseDetailTab", () => {
  test("defaults to schedule when enrolled", () => {
    expect(resolveInitialCourseDetailTab({ isEnrolled: true })).toBe("schedule");
  });

  test("defaults to overview when not enrolled", () => {
    expect(resolveInitialCourseDetailTab({ isEnrolled: false })).toBe("overview");
  });

  test("uses valid query tab override", () => {
    expect(resolveInitialCourseDetailTab({ isEnrolled: false, queryTab: "grades" })).toBe("grades");
  });

  test("falls back when query tab is invalid", () => {
    expect(resolveInitialCourseDetailTab({ isEnrolled: true, queryTab: "unknown" })).toBe("schedule");
  });
});
