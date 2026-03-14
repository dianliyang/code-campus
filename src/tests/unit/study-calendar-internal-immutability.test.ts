import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("StudyCalendar internal course immutability", () => {
  test("does not allow dragging internal study plan events", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/home/StudyCalendar.tsx"),
      "utf8",
    );

    expect(source).toContain("!courseMap.get(event.courseId || -1)?.isInternal");
  });
});
