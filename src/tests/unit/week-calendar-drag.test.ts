import { describe, expect, test } from "vitest";
import {
  buildDraggedStudyPlanUpdate,
  buildResizedStudyPlanUpdate,
  getDraggedStudyPlanDrop,
  getResizedStudyPlanTimes,
} from "@/lib/week-calendar-drag";

describe("getDraggedStudyPlanDrop", () => {
  test("maps pointer position to dropped weekday and snapped start time", () => {
    expect(
      getDraggedStudyPlanDrop({
        clientX: 360,
        clientY: 220,
        gridLeft: 48,
        gridTop: 44,
        gridWidth: 700,
        pixelsPerHour: 44,
      }),
    ).toEqual({ dayOfWeek: 3, startMinutes: 240 });
  });
});

describe("buildDraggedStudyPlanUpdate", () => {
  test("preserves duration while updating weekday and start/end times", () => {
    expect(
      buildDraggedStudyPlanUpdate({
        planId: 5,
        courseId: 2,
        startDate: "2026-03-01",
        endDate: "2026-04-30",
        daysOfWeek: [1],
        startTime: "12:00:00",
        endTime: "13:30:00",
        location: "Room 12",
        kind: "reading",
        timezone: "UTC",
        droppedDayOfWeek: 3,
        droppedStartMinutes: 15 * 60 + 15,
      }),
    ).toEqual({
      planId: 5,
      courseId: 2,
      startDate: "2026-03-01",
      endDate: "2026-04-30",
      daysOfWeek: [3],
      startTime: "15:15:00",
      endTime: "16:45:00",
      location: "Room 12",
      kind: "reading",
      timezone: "UTC",
    });
  });
});

describe("getResizedStudyPlanTimes", () => {
  test("top-edge resize updates only the start time", () => {
    expect(
      getResizedStudyPlanTimes({
        startMinutes: 12 * 60,
        endMinutes: 14 * 60,
        edge: "top",
        snappedMinutes: 11 * 60 + 30,
      }),
    ).toEqual({
      startMinutes: 11 * 60 + 30,
      endMinutes: 14 * 60,
    });
  });

  test("bottom-edge resize updates only the end time", () => {
    expect(
      getResizedStudyPlanTimes({
        startMinutes: 12 * 60,
        endMinutes: 14 * 60,
        edge: "bottom",
        snappedMinutes: 15 * 60,
      }),
    ).toEqual({
      startMinutes: 12 * 60,
      endMinutes: 15 * 60,
    });
  });

  test("keeps a minimum 30 minute duration", () => {
    expect(
      getResizedStudyPlanTimes({
        startMinutes: 12 * 60,
        endMinutes: 13 * 60,
        edge: "top",
        snappedMinutes: 12 * 60 + 50,
      }),
    ).toEqual({
      startMinutes: 12 * 60 + 30,
      endMinutes: 13 * 60,
    });
  });
});

describe("buildResizedStudyPlanUpdate", () => {
  test("preserves weekday while updating resized start and end times", () => {
    expect(
      buildResizedStudyPlanUpdate({
        planId: 5,
        courseId: 2,
        startDate: "2026-03-01",
        endDate: "2026-04-30",
        daysOfWeek: [3],
        location: "Room 12",
        kind: "reading",
        timezone: "UTC",
        startMinutes: 11 * 60 + 30,
        endMinutes: 15 * 60,
      }),
    ).toEqual({
      planId: 5,
      courseId: 2,
      startDate: "2026-03-01",
      endDate: "2026-04-30",
      daysOfWeek: [3],
      startTime: "11:30:00",
      endTime: "15:00:00",
      location: "Room 12",
      kind: "reading",
      timezone: "UTC",
    });
  });
});
