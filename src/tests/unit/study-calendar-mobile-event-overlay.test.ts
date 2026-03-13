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

  test("uses semibold typography for today's routine event card titles", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/home/StudyCalendar.tsx"),
      "utf8",
    );

    expect(source).toContain('className="line-clamp-1 text-[13px] font-semibold text-foreground leading-tight"');
    expect(source).not.toContain('className="line-clamp-1 text-[13px] font-bold text-foreground leading-tight"');
  });

  test("highlights today in the week header instead of the full day column body", () => {
    const calendarSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/home/StudyCalendar.tsx"),
      "utf8",
    );
    const layoutSource = fs.readFileSync(
      path.join(process.cwd(), "src/lib/routine-layout.ts"),
      "utf8",
    );

    expect(layoutSource).toContain('headerClassName: isToday');
    expect(layoutSource).toContain('"bg-primary/10 ring-1 ring-inset ring-primary/20');
    expect(calendarSource).not.toContain('bg-primary/[0.02] pointer-events-none z-0');
  });
});
