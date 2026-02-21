import { describe, expect, test } from "vitest";
import { getCourseCodeBreakdown } from "@/lib/course-code-breakdown";

describe("getCourseCodeBreakdown", () => {
  test("parses CMU code 15-445", () => {
    const items = getCourseCodeBreakdown("cmu", "15-445");
    expect(items.length).toBeGreaterThan(0);
    expect(items.find((x) => x.label === "Department")?.value).toBe("15");
    expect(items.find((x) => x.label === "Level Digit")?.detail).toContain("Senior");
    expect(items.find((x) => x.label === "Topic Family")?.detail).toContain("Systems");
  });

  test("parses Stanford code CS 224N", () => {
    const items = getCourseCodeBreakdown("stanford", "CS 224N");
    expect(items.length).toBe(4);
    expect(items.find((x) => x.label === "Subject Prefix")?.value).toBe("CS");
    expect(items.find((x) => x.label === "Course Number")?.detail).toContain("200-299");
    expect(items.find((x) => x.label === "Suffix")?.detail).toContain("Seminar");
  });

  test("returns empty for unsupported universities", () => {
    expect(getCourseCodeBreakdown("unknown", "6.5830")).toEqual([]);
  });

  test("parses MIT code 6.5831", () => {
    const items = getCourseCodeBreakdown("mit", "6.5831");
    expect(items.length).toBeGreaterThan(0);
    expect(items.find((x) => x.label === "Before Decimal (Department)")?.value).toBe("6");
    expect(items.find((x) => x.label === "First Digit After Decimal")?.value).toBe("5");
    expect(items.find((x) => x.label === "Second Digit After Decimal")?.detail).toContain("Systems");
    expect(items.find((x) => x.label === "Fourth Digit / Suffix")?.detail).toContain("Undergraduate");
  });

  test("parses MIT special subject prefix like 6.S974", () => {
    const items = getCourseCodeBreakdown("mit", "6.S974");
    expect(items.find((x) => x.label === "Special Subject Prefix")?.value).toBe("S");
    expect(items.find((x) => x.label === "First Digit After Decimal")?.value).toBe("9");
  });

  test("parses UCB code ELENG W242B", () => {
    const items = getCourseCodeBreakdown("ucb", "ELENG W242B");
    expect(items.length).toBeGreaterThan(0);
    expect(items.find((x) => x.label === "Subject Prefix")?.value).toBe("ELENG");
    expect(items.find((x) => x.label === "Level Digit")?.detail).toContain("Graduate");
    expect(items.find((x) => x.label === "Prefix Modifier")?.value).toBe("W");
    expect(items.find((x) => x.label === "Suffix")?.value).toBe("B");
  });

  test("parses UCB breakdown when university is UC Berkeley", () => {
    const items = getCourseCodeBreakdown("UC Berkeley", "ELENG W242B");
    expect(items.length).toBeGreaterThan(0);
    expect(items.find((x) => x.label === "Subject Prefix")?.value).toBe("ELENG");
  });
});
