import { describe, expect, test } from "vitest";
import {
  getCalendarPageShellClassName,
  getCalendarRootCardClassName,
  getCalendarRoutineListClassName,
  getCalendarTimelineScrollerClassName,
} from "@/lib/routine-layout";

describe("routine layout helpers", () => {
  test("uses page scrolling on mobile and reserves nested overflow for desktop", () => {
    expect(getCalendarPageShellClassName()).toBe(
      "w-full lg:flex lg:flex-1 lg:min-h-0 lg:overflow-hidden",
    );
    const rootTokens = getCalendarRootCardClassName().split(/\s+/);
    expect(rootTokens).toContain("overflow-clip");
    expect(rootTokens).toContain("lg:h-full");
    expect(rootTokens).not.toContain("h-full");
  });

  test("keeps timeline and routine internal scrolling desktop-only", () => {
    expect(getCalendarRoutineListClassName()).toBe(
      "space-y-2 pr-1 pb-4 lg:min-h-0 lg:flex-1 lg:overflow-auto lg:no-scrollbar",
    );
    expect(getCalendarTimelineScrollerClassName()).toBe(
      "relative overflow-x-auto bg-background lg:flex-1 lg:overflow-auto lg:no-scrollbar",
    );
  });
});
