import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("settings shared wrapper", () => {
  test("uses extra mobile bottom padding so sections clear the bottom bar", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/settings/_shared.tsx"),
      "utf8",
    );

    expect(source).toContain('pb-[calc(132px+env(safe-area-inset-bottom,0px))]');
  });

  test("uses the same compact shell contract as other dashboard pages", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/identity/SettingsContainer.tsx"),
      "utf8",
    );

    expect(source).toContain('className="h-full flex flex-col gap-4 px-4"');
    expect(source).toContain('getDashboardPageHeaderClassName("shrink-0")');
    expect(source).toContain('className="flex-1 min-h-0"');
  });
});
