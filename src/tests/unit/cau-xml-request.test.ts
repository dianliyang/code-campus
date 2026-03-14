import { describe, expect, test } from "vitest";
import { CAU } from "@/lib/scrapers/cau";

describe("CAU XML request builder", () => {
  test("builds a level=3 orgname XML export request", () => {
    const scraper = new CAU();

    const result = scraper.buildXmlExportRequestForTests({
      token: "526",
      db: "Lecture",
      keys: "techn/infor/example",
      ref: "tlecture",
      sem: "2026s",
      tdir: "techn/infora/master",
    });

    expect(result.url).toContain("https://univis.uni-kiel.de/form");
    expect(result.body.get("dsc")).toBe("anew/unihd");
    expect(result.body.get("donedef")).toBe("1");
    expect(result.body.get("setsem_jump")).toBe("anew/xml");
    expect(result.body.get("level")).toBe("3");
    expect(result.body.get("option")).toBe("orgname");
    expect(result.body.get("done-anew/xml:doit")).toBe("to XML");
    expect(result.body.get("anonymous")).toBe("1");
    expect(result.body.get("db")).toBe("Lecture");
  });
});
