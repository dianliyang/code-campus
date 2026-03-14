import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { CAU } from "@/lib/scrapers/cau";

describe("CAU XML export discovery", () => {
  test("extracts __e, keys, and xml export params from the export page", () => {
    const html = readFileSync("src/tests/fixtures/cau/xml-export-page.html", "utf8");
    const scraper = new CAU();

    const result = scraper.extractXmlExportParamsForTests(html);

    expect(result.token).toBe("526");
    expect(result.keys).toContain("techn/infor");
    expect(result.db).toBe("Lecture");
    expect(result.ref).toBe("tlecture");
    expect(result.sem).toBe("2026s");
    expect(result.tdir).toBe("techn/infora/master");
  });
});
