import { describe, expect, test } from "vitest";
import {
  formatWorkoutBookingOpensLabel,
  formatWorkoutBookingOpensTime,
  getWorkoutReminderAtUtc,
  parseBerlinLocalDateTimeToUtc,
} from "@/lib/workout-reminders";

describe("workout reminder helpers", () => {
  test("parses Europe/Berlin local booking times into UTC", () => {
    const parsed = parseBerlinLocalDateTimeToUtc("2026-03-29T18:00:00");

    expect(parsed?.toISOString()).toBe("2026-03-29T16:00:00.000Z");
  });

  test("computes reminder time 15 minutes before booking opens", () => {
    const reminderAt = getWorkoutReminderAtUtc({
      bookingOpensAt: "2026-03-29T18:00:00",
    });

    expect(reminderAt?.toISOString()).toBe("2026-03-29T15:45:00.000Z");
  });

  test("formats booking open time for the workout UI", () => {
    expect(
      formatWorkoutBookingOpensTime({
        bookingOpensAt: "2026-03-29T18:00:00",
      }),
    ).toBe("18:00");
  });

  test("formats booking open date and time for scheduled workout labels", () => {
    expect(
      formatWorkoutBookingOpensLabel({
        bookingOpensOn: "2026-03-29",
        bookingOpensAt: "2026-03-29T18:00:00",
      }),
    ).toBe("Opens Mar 29, 18:00");
  });
});
