# Study Plan Drag Calendar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make week-calendar study-plan cards draggable so dropping a card updates the whole recurring study plan's weekday and time.

**Architecture:** Fetch raw `study_plans` alongside the existing schedule rows so the calendar can build a complete update payload for dragged recurring plans. Implement drag behavior only for top-level recurring `study_plan` cards in the week timeline, with pure helpers for overlap layout, drag snapping, and request payload generation, then persist through `/api/study-plans/update`.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Add failing tests for drag snap and update payload helpers

**Files:**
- Create: `src/tests/unit/week-calendar-drag.test.ts`
- Create: `src/lib/week-calendar-drag.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { buildDraggedStudyPlanUpdate, getDraggedStudyPlanDrop } from "@/lib/week-calendar-drag";

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
    ).toMatchObject({
      planId: 5,
      courseId: 2,
      daysOfWeek: [3],
      startTime: "15:15:00",
      endTime: "16:45:00",
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts`
Expected: FAIL because `src/lib/week-calendar-drag.ts` does not exist yet.

**Step 3: Write minimal implementation**

Create the helper with:
- drag drop snapping to week column + 15-minute increments
- update payload builder that preserves duration and rewrites `daysOfWeek`

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts`
Expected: PASS

### Task 2: Expose raw study-plan metadata to the calendar page

**Files:**
- Modify: `src/app/(dashboard)/calendar/page.tsx`
- Modify: `src/components/home/StudyCalendar.tsx`

**Step 1: Define the plan metadata shape**

Add a prop type for the raw study plans the calendar needs:

```ts
type CalendarStudyPlanRecord = {
  id: number;
  course_id: number;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  kind: string | null;
  timezone: string | null;
};
```

**Step 2: Fetch study plans in the calendar page**

Add a `study_plans` query in `src/app/(dashboard)/calendar/page.tsx` scoped to the current user and pass the records to `StudyCalendar`.

**Step 3: Build a plan lookup map in `StudyCalendar`**

Create `Map<number, CalendarStudyPlanRecord>` by `plan.id` so dragged cards can resolve their full recurring plan definition.

**Step 4: Run focused tests**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts`
Expected: PASS

### Task 3: Implement draggable study-plan cards in the week timeline

**Files:**
- Modify: `src/components/home/StudyCalendar.tsx`
- Modify: `src/lib/week-calendar-drag.ts`

**Step 1: Write the failing interaction test**

Extend `src/tests/unit/study-calendar-optimistic.test.tsx` with one test that:
- renders a recurring study-plan event
- simulates drag start + drop onto another weekday/time slot
- expects `fetch("/api/study-plans/update", ...)` with updated `daysOfWeek`, `startTime`, and `endTime`

**Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/tests/unit/study-calendar-optimistic.test.tsx`
Expected: FAIL because no drag behavior exists yet.

**Step 3: Implement minimal drag state**

In `StudyCalendar`:
- allow dragging only when:
  - `event.sourceType === "study_plan"`
  - `event.planId != null`
  - `event.scheduleId == null`
  - `event.assignmentId == null`
- store active drag state with:
  - pointer id
  - event key / plan id
  - original event
  - preview day / preview times
- suppress popover opening while dragging

**Step 4: Implement drop persistence**

On pointer release:
- resolve the underlying raw study plan
- build the update payload with `buildDraggedStudyPlanUpdate`
- POST to `/api/study-plans/update`
- optimistically update local event state or refresh after success
- revert on failure

**Step 5: Keep visual behavior minimal**

Apply:
- grab/grabbing cursor on draggable cards
- lifted style while dragging
- preview card position from snapped day/time while dragging

**Step 6: Run focused tests**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts src/tests/unit/study-calendar-optimistic.test.tsx`
Expected: PASS

### Task 4: Revalidate the calendar after study-plan updates

**Files:**
- Modify: `src/app/api/study-plans/update/route.ts`

**Step 1: Add calendar revalidation**

Revalidate:
- `/calendar`
- `/overview`
- existing study-plan views remain unchanged

**Step 2: Run focused tests**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts src/tests/unit/study-calendar-optimistic.test.tsx src/tests/unit/week-calendar-layout.test.ts src/tests/unit/week-calendar.test.ts src/tests/unit/routine-layout.test.ts`
Expected: PASS

### Task 5: Final verification

**Files:**
- Modify: none

**Step 1: Run the final focused suite**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts src/tests/unit/study-calendar-optimistic.test.tsx src/tests/unit/week-calendar-layout.test.ts src/tests/unit/week-calendar.test.ts src/tests/unit/routine-layout.test.ts`
Expected: PASS

**Step 2: Manual sanity checklist**

Confirm:
- dragging a recurring study-plan card changes day and time
- duration is preserved
- workouts are not draggable
- child `course_schedule` items are not draggable
- calendar scroll/popovers still behave normally
