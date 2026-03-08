import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("StudyCalendar mobile event overlay", () => {
  test("uses a bottom drawer on mobile while preserving the desktop popover", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/home/StudyCalendar.tsx"),
      "utf8",
    );

    expect(source).toContain("<Drawer");
    expect(source).toContain('direction="bottom"');
    expect(source).toContain("isMobileViewport ? (");
    expect(source).toContain("<Popover");
    expect(source).toContain("DrawerContent");
    expect(source).toContain("PopoverContent");
  });
});
