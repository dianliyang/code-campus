import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("SettingsContainer layout contract", () => {
  test("uses the shared dashboard content wrapper spacing contract", () => {
    const sharedSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/settings/_shared.tsx"),
      "utf8",
    );
    const containerSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/identity/SettingsContainer.tsx"),
      "utf8",
    );

    expect(sharedSource).toContain("h-full flex flex-col gap-4 px-4");
    expect(containerSource).toContain('getDashboardPageHeaderClassName("shrink-0")');
    expect(containerSource).toContain('className="flex-1 min-h-0"');
  });
});
