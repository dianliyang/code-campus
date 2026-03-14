import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("dashboard list alignment", () => {
  test("centers course list identity cells vertically", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/home/course-table/columns.tsx"),
      "utf8",
    );

    expect(source).toContain('className="min-w-0 flex items-center gap-3"');
  });

  test("centers seminar and project title cells vertically", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/projects-seminars/table/columns.tsx"),
      "utf8",
    );

    expect(source).toContain('className="flex min-h-10 flex-col justify-center"');
  });
});
