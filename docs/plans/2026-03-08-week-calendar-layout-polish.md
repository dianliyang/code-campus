# Week Calendar Layout Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the week calendar current-time rail flush to the card edge and strengthen parent/child hierarchy spacing in Today’s Routine on both Calendar and Overview.

**Architecture:** Keep the existing calendar event positioning and routine grouping logic intact. Limit the change to layout primitives in the calendar timeline and shared routine indentation styles so the visual hierarchy improves without changing data flow or interaction behavior.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Add a failing test for routine child indentation classes

**Files:**
- Create: `src/lib/routine-layout.ts`
- Test: `src/tests/unit/routine-layout.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { getRoutineChildContainerClassName } from "@/lib/routine-layout";

describe("getRoutineChildContainerClassName", () => {
  test("returns the stronger child indentation used by routine views", () => {
    expect(getRoutineChildContainerClassName()).toContain("ml-5");
    expect(getRoutineChildContainerClassName()).toContain("pl-4");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/routine-layout.test.ts`
Expected: FAIL because `src/lib/routine-layout.ts` does not exist yet.

**Step 3: Write minimal implementation**

```ts
export function getRoutineChildContainerClassName() {
  return "ml-5 border-l border-border/60 pl-4 space-y-2";
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/tests/unit/routine-layout.test.ts`
Expected: PASS

### Task 2: Reuse the child indentation helper in Calendar and Overview

**Files:**
- Modify: `src/components/home/StudyCalendar.tsx`
- Modify: `src/components/dashboard/OverviewRoutineList.tsx`
- Modify: `src/lib/routine-layout.ts`

**Step 1: Update Calendar Today’s Routine child container**

Replace the inline child container classes with the shared helper so both views use the same stronger indent.

**Step 2: Update Overview Today’s Routine child container**

Replace the inline child container classes with the same shared helper.

**Step 3: Keep child row spacing aligned**

If needed, add a second helper for child row padding so the child rows read as clearly nested without changing parent layout.

**Step 4: Verify both files compile**

Run: `npm test -- --run src/tests/unit/routine-layout.test.ts`
Expected: PASS

### Task 3: Make the week-calendar current-time rail flush to the card edge

**Files:**
- Modify: `src/components/home/StudyCalendar.tsx`

**Step 1: Adjust the timeline wrapper layout**

Remove the extra left inset from the current-time indicator container so the rail starts at the card edge instead of after the time-column gutter.

**Step 2: Connect the badge and rail visually**

Restructure the badge/line wrapper so the badge sits on the same rail without a detached gap. Keep the hour column width unchanged.

**Step 3: Remove extra left padding from the scroll area**

Ensure the week timeline starts flush while preserving the sticky time column and grid alignment.

**Step 4: Verify behavior manually and with focused tests**

Run: `npm test -- --run src/tests/unit/routine-layout.test.ts src/tests/unit/week-calendar.test.ts`
Expected: PASS

### Task 4: Final verification

**Files:**
- Modify: none

**Step 1: Run focused tests**

Run: `npm test -- --run src/tests/unit/routine-layout.test.ts src/tests/unit/week-calendar.test.ts`
Expected: PASS

**Step 2: Summarize visual changes**

Confirm:
- current-time rail is flush to the card edge
- badge visually connects to the rail
- child items are more clearly nested in Calendar and Overview
