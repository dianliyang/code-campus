import { describe, expect, test } from "vitest";
import { positionWeekCalendarEvents } from "@/lib/week-calendar-layout";

describe("positionWeekCalendarEvents", () => {
  test("lets a later non-overlapping event reclaim full width", () => {
    const positioned = positionWeekCalendarEvents([
      {
        key: "event-1",
        startMinutes: 12 * 60,
        endMinutes: 13 * 60,
      },
      {
        key: "event-2",
        startMinutes: 12 * 60 + 10,
        endMinutes: 14 * 60,
      },
      {
        key: "event-3",
        startMinutes: 14 * 60,
        endMinutes: 15 * 60,
      },
    ]);

    expect(positioned.map((event) => ({
      key: event.key,
      column: event.column,
      totalColumns: event.totalColumns,
    }))).toEqual([
      { key: "event-1", column: 0, totalColumns: 2 },
      { key: "event-2", column: 1, totalColumns: 2 },
      { key: "event-3", column: 0, totalColumns: 1 },
    ]);
  });
});
