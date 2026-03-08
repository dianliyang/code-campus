# Study Plan Resize Calendar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow recurring study-plan cards in the week calendar to be resized vertically from both top and bottom edges to update start and end times.

**Architecture:** Extend the existing week-calendar study-plan drag interaction with a separate resize mode driven by top/bottom edge handles. Keep the persistence path unified through `/api/study-plans/update`, with pure helpers for snap math and payload generation.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Add failing tests for resize helper math

**Files:**
- Modify: `src/tests/unit/week-calendar-drag.test.ts`
- Modify: `src/lib/week-calendar-drag.ts`

**Step 1: Write failing tests**
- top-edge resize updates only start time
- bottom-edge resize updates only end time
- minimum duration stays enforced

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts`
Expected: FAIL because resize helpers do not exist yet.

**Step 3: Implement minimal helper**

Add:
- `getResizedStudyPlanTimes`
- `buildResizedStudyPlanUpdate`

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts`
Expected: PASS

### Task 2: Add resize interaction to the week calendar

**Files:**
- Modify: `src/components/home/StudyCalendar.tsx`

**Step 1: Add a failing interaction test**

Extend calendar tests with one resize interaction covering at least bottom-edge resize posting updated end time.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/study-calendar-optimistic.test.tsx`
Expected: FAIL because resize handles do not exist.

**Step 3: Implement minimal resize UI**

Add:
- top/bottom edge handles for draggable recurring `study_plan` cards
- resize state distinct from move-drag state
- live preview during resize
- popover suppression while resizing

**Step 4: Persist resized plan**

On resize end:
- resolve raw study plan
- build update payload
- POST to `/api/study-plans/update`
- refresh on success

**Step 5: Run focused tests**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts src/tests/unit/study-calendar-optimistic.test.tsx`
Expected: PASS

### Task 3: Final verification

**Files:**
- Modify: none

**Step 1: Run focused suite**

Run: `npm test -- --run src/tests/unit/week-calendar-drag.test.ts src/tests/unit/week-calendar-layout.test.ts src/tests/unit/week-calendar.test.ts src/tests/unit/routine-layout.test.ts`
Expected: PASS
