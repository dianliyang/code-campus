import { describe, expect, test } from "vitest";
import {
  getWeekCalendarCardContentLayout,
  getCalendarPageShellClassName,
  getCalendarRootCardClassName,
  getWeekCalendarCardDetailLevel,
  getCurrentTimeIndicatorLayout,
  getRoutineChildContainerClassName,
  getWeekCalendarDayHeaderClassNames,
  getWeekCalendarHeaderTypography,
} from "@/lib/routine-layout";

describe("getRoutineChildContainerClassName", () => {
  test("returns the stronger child indentation used by routine views", () => {
    expect(getRoutineChildContainerClassName()).toContain("ml-5");
    expect(getRoutineChildContainerClassName()).toContain("pl-4");
  });
});

describe("getCurrentTimeIndicatorLayout", () => {
  test("does not render a left rail segment before the badge", () => {
    expect(getCurrentTimeIndicatorLayout().showLeftRail).toBe(false);
  });

  test("offsets the badge slightly right so it connects to the rail", () => {
    expect(getCurrentTimeIndicatorLayout().badgeOffsetClassName).toContain("pl-1");
  });

  test("right-aligns the badge inside the time column", () => {
    expect(getCurrentTimeIndicatorLayout().containerClassName).toContain("justify-end");
  });
});

describe("getCalendarRootCardClassName", () => {
  test("removes the shared card gap from the week calendar root card", () => {
    expect(getCalendarRootCardClassName()).toContain("gap-0");
    expect(getCalendarRootCardClassName()).not.toContain("py-0");
  });
});

describe("getCalendarPageShellClassName", () => {
  test("constrains the calendar content to the remaining viewport height", () => {
    expect(getCalendarPageShellClassName()).toContain("min-h-0");
    expect(getCalendarPageShellClassName()).toContain("flex-1");
  });
});

describe("getWeekCalendarHeaderTypography", () => {
  test("keeps the date range as the primary title and the week label non-uppercase", () => {
    const typography = getWeekCalendarHeaderTypography();
    expect(typography.titleClassName).toContain("text-xl");
    expect(typography.subtitleClassName).not.toContain("uppercase");
    expect(typography.getWeekLabel(10)).toBe("Week 10");
  });
});

describe("getWeekCalendarDayHeaderClassNames", () => {
  test("styles today with stronger text only and no filled number background", () => {
    const classes = getWeekCalendarDayHeaderClassNames(true);
    expect(classes.weekdayClassName).toContain("text-foreground");
    expect(classes.dateNumberClassName).toContain("text-foreground");
    expect(classes.weekdayClassName).toContain("font-bold");
    expect(classes.dateNumberClassName).toContain("font-bold");
    expect(classes.dateNumberClassName).not.toContain("bg-primary");
  });
});

describe("getWeekCalendarCardDetailLevel", () => {
  test("reveals more details only when card height allows", () => {
    expect(getWeekCalendarCardDetailLevel({ visualHeightPx: 24, showVerticalTitle: false })).toBe("compact");
    expect(getWeekCalendarCardDetailLevel({ visualHeightPx: 34, showVerticalTitle: false })).toBe("time");
    expect(getWeekCalendarCardDetailLevel({ visualHeightPx: 56, showVerticalTitle: false })).toBe("course");
    expect(getWeekCalendarCardDetailLevel({ visualHeightPx: 76, showVerticalTitle: false })).toBe("full");
  });

  test("keeps narrow vertical cards title-only", () => {
    expect(getWeekCalendarCardDetailLevel({ visualHeightPx: 120, showVerticalTitle: true })).toBe("compact");
  });
});

describe("getWeekCalendarCardContentLayout", () => {
  test("keeps course code and school together above the title", () => {
    expect(getWeekCalendarCardContentLayout("time")).toEqual({
      showMetaAboveTitle: true,
      showTimeRow: true,
      showLocationRow: false,
      showKindRow: false,
    });
  });

  test("uses only icon rows for lower details", () => {
    expect(getWeekCalendarCardContentLayout("full")).toEqual({
      showMetaAboveTitle: true,
      showTimeRow: true,
      showLocationRow: true,
      showKindRow: true,
    });
  });
});
