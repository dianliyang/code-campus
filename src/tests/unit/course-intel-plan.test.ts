import { describe, expect, it } from "vitest";
import {
  buildAssignmentsFromDailyPlan,
  buildFallbackDailyPlan,
  buildPlanSeedTasks,
  buildCourseSchedulesFromDailyPlan,
  parseLooseDailyPlanText,
  sanitizeDailyPlan,
  toIsoDateUtc,
} from "@/lib/ai/course-intel-plan";

describe("course intel practical plan helpers", () => {
  it("builds curated seed tasks from schedule rows", () => {
    const rows = [
      {
        sequence: "W1",
        date: "2025-01-20",
        title: "Intro",
        readings: [{ label: "Read Ch1", url: "https://example.com/ch1" }],
        assignments: [{ label: "HW 1", due_date: "2025-01-22", url: "https://example.com/hw1" }],
        projects: [{ label: "Project proposal", due_date: "2025-01-25", url: "https://example.com/p1" }],
        labs: [{ label: "Lab 1", due_date: "2025-01-23", url: "https://example.com/lab1" }],
        exercises: [{ label: "Exercise Set 1", due_date: "2025-01-24", url: "https://example.com/ex1" }],
      },
      {
        sequence: "W2",
        date: "2025-01-27",
        title: "Advanced",
        assignments: [{ label: "hw 1", due_date: "2025-01-22", url: "https://example.com/hw1" }],
      },
    ] as Array<Record<string, unknown>>;

    const tasks = buildPlanSeedTasks(rows);
    expect(tasks.some((t) => t.kind === "reading" && t.title === "Read Ch1")).toBe(true);
    expect(tasks.some((t) => t.kind === "assignment" && t.title === "HW 1")).toBe(true);
    expect(tasks.some((t) => t.kind === "project" && t.title === "Project proposal")).toBe(true);
    expect(tasks.some((t) => t.kind === "lab" && t.title === "Lab 1")).toBe(true);
    expect(tasks.some((t) => t.kind === "exercise" && t.title === "Exercise Set 1")).toBe(true);
    expect(tasks.filter((t) => t.title.toLowerCase() === "hw 1").length).toBe(1);
  });

  it("sanitizes plan dates to today onward", () => {
    const today = "2026-03-02";
    const plan = sanitizeDailyPlan(
      {
        days: [
          { date: "2026-03-01", focus: "Catch up", tasks: [{ title: "Old task" }] },
          { date: "2026-03-02", focus: "Start", tasks: [{ title: "Task A" }] },
          { date: "2026-03-03", focus: "Continue", tasks: [{ title: "Task B" }] },
        ],
      },
      today
    );

    expect(plan.days.length).toBe(2);
    expect(plan.days[0].date).toBe("2026-03-02");
    expect(plan.days[1].date).toBe("2026-03-03");
  });

  it("builds fallback daily plan with forward dates only", () => {
    const today = "2026-03-02";
    const tasks = [
      { kind: "assignment", title: "HW 2", due_on: "2026-03-04", source_sequence: null, url: null, description: null },
      { kind: "reading", title: "Read paper", due_on: null, source_sequence: null, url: null, description: null },
    ];
    const plan = buildFallbackDailyPlan(tasks, today, 5);

    expect(plan.days.length).toBeGreaterThan(0);
    expect(plan.days.every((d) => d.date >= today)).toBe(true);
  });

  it("normalizes Date to ISO date", () => {
    expect(toIsoDateUtc(new Date("2026-03-02T17:01:01.000Z"))).toBe("2026-03-02");
  });

  it("parses loose plain-text day plan format", () => {
    const text = `
2026-03-02: Setup
- Read chapter 1
- Lab 1 implementation
2026-03-03: Progress
- Exercise set 2
`;
    const plan = parseLooseDailyPlanText(text, "2026-03-02");
    expect(plan.days.length).toBe(2);
    expect(plan.days[0].tasks.length).toBe(2);
    expect(plan.days[0].tasks[1].kind).toBe("lab");
    expect(plan.days[1].tasks[0].kind).toBe("exercise");
  });

  it("builds assignment rows and schedule rows from practical plan", () => {
    const plan = {
      days: [
        {
          date: "2026-03-05",
          focus: "Labs",
          tasks: [
            { title: "Lab 2", kind: "lab", minutes: 90 },
            { title: "Exercise 3", kind: "exercise", minutes: 45 },
          ],
        },
      ],
    };
    const assignments = buildAssignmentsFromDailyPlan({
      courseId: 9,
      syllabusId: 2,
      plan,
      nowIso: "2026-03-02T00:00:00.000Z",
    });
    const schedules = buildCourseSchedulesFromDailyPlan({
      courseId: 9,
      syllabusId: 2,
      plan,
      nowIso: "2026-03-02T00:00:00.000Z",
    });

    expect(assignments.length).toBe(2);
    expect(assignments[0].kind).toBe("lab");
    expect(assignments[1].kind).toBe("assignment");
    expect(schedules.length).toBe(2);
    expect(schedules[0].schedule_date).toBe("2026-03-05");
  });
});
