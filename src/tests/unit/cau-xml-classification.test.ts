import { describe, expect, test } from "vitest";
import { CAU } from "@/lib/scrapers/cau";

describe("CAU XML classification", () => {
  test("maps title reference keys to course categories", () => {
    const scraper = new CAU();

    expect(scraper.deriveCategoryForTests(["Title.techn.infora.master.theore"])).toBe(
      "Theoretical Computer Science",
    );
    expect(scraper.deriveCategoryForTests(["Title.techn.infora.master.wahlpf"])).toBe(
      "Compulsory elective modules in Computer Science",
    );
    expect(
      scraper.deriveCategoryForTests(
        ["Title.techn.infora.master.master_2"],
        new Map([["Title.techn.infora.master.master_2", "Advanced Project"]]),
      ),
    ).toBe("Advanced Project");
  });

  test("classifies auxiliary exercise-like records", () => {
    const scraper = new CAU();

    expect(scraper.isAuxiliaryTypeForTests("UE")).toBe(true);
    expect(scraper.isAuxiliaryTypeForTests("V")).toBe(false);
    expect(scraper.isAuxiliaryTypeForTests("S")).toBe(false);
  });
});
