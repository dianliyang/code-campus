import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("SettingsContainer sync labels", () => {
  test("uses Synchronization instead of Data Synchronization", () => {
    const filePath = path.join(process.cwd(), "src/components/identity/SettingsContainer.tsx");
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain('label: "Synchronization"');
    expect(source).toContain('title: "Synchronization"');
    expect(source).not.toContain('label: "Data Synchronization"');
    expect(source).not.toContain('title: "Data Synchronization"');
  });
});
