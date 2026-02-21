import { describe, expect, test } from "vitest";
import { getUniversityUnitInfo } from "@/lib/university-units";

describe("getUniversityUnitInfo", () => {
  test("maps CMU units to direct weekly workload", () => {
    const info = getUniversityUnitInfo("cmu", "12");
    expect(info.label).toBe("Units");
    expect(info.help.toLowerCase()).toContain("cmu units");
    expect(info.estimate?.weeklyHours).toBe(12);
  });

  test("maps UCB units by 3-hour rule", () => {
    const info = getUniversityUnitInfo("ucb", "4");
    expect(info.estimate?.weeklyHours).toBe(12);
    expect(info.estimate?.details).toContain("3 h per unit");
  });

  test("maps Stanford variable range units", () => {
    const info = getUniversityUnitInfo("stanford", "3-5");
    expect(info.estimate?.weeklyHours).toBe(12);
    expect(info.estimate?.details).toContain("to");
  });

  test("maps MIT triple units by sum", () => {
    const info = getUniversityUnitInfo("mit", "3-2-7");
    expect(info.label).toBe("Units (L-Lab-P)");
    expect(info.estimate?.weeklyHours).toBe(12);
  });

  test("keeps CAU format label and no estimate", () => {
    const info = getUniversityUnitInfo("cau", "2-0-2-0");
    expect(info.label).toBe("Units (L-S-E-P)");
    expect(info.estimate).toBeNull();
  });
});
