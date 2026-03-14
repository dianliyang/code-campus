import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

describe("CAU XML fixtures", () => {
  test("contains lecture records and XML export options", () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const exportPage = readFileSync("src/tests/fixtures/cau/xml-export-page.html", "utf8");

    expect(xml).toContain("<Lecture ");
    expect(exportPage).toContain('name="level"');
    expect(exportPage).toContain('value="orgname"');
  });
});
