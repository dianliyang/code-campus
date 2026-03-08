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
});
