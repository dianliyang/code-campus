import { describe, expect, test } from "vitest";
import { getDashboardPageHeaderClassName } from "@/lib/dashboard-layout";

describe("getDashboardPageHeaderClassName", () => {
  test("uses non-sticky mobile headers while preserving desktop sticky behavior", () => {
    const className = getDashboardPageHeaderClassName();

    expect(className.split(/\s+/)).not.toContain("sticky");
    expect(className.split(/\s+/)).not.toContain("top-0");
    expect(className).toContain("md:sticky");
    expect(className).toContain("md:top-0");
  });
});
