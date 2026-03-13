# Week Calendar Today Header Highlight Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strengthen the week calendar’s today emphasis by highlighting only the header cell.

**Architecture:** Update the today styling in the week header render path and shared header class helper so the emphasis lives in the header container rather than the body column. Add a focused source-level regression test that asserts the today header styling exists and the old body overlay does not.

**Tech Stack:** Next.js, React, TypeScript, Vitest

---

### Task 1: Move today emphasis from body overlay to header cell

**Files:**
- Modify: `src/components/home/StudyCalendar.tsx`
- Modify: `src/lib/routine-layout.ts`
- Test: `src/tests/unit/study-calendar-mobile-event-overlay.test.ts`

**Step 1: Write the failing test**

Add a source-level assertion that the week header uses a dedicated today background class while the old today body overlay class is absent.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/study-calendar-mobile-event-overlay.test.ts`
Expected: FAIL because the today header highlight has not been updated yet.

**Step 3: Write minimal implementation**

Update the today header class helper and the week header markup in `src/components/home/StudyCalendar.tsx` so only the header cell gets the stronger background, and remove the current body overlay for today.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/tests/unit/study-calendar-mobile-event-overlay.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add docs/plans/2026-03-13-week-calendar-today-header-highlight-design.md docs/plans/2026-03-13-week-calendar-today-header-highlight-implementation-plan.md src/components/home/StudyCalendar.tsx src/lib/routine-layout.ts src/tests/unit/study-calendar-mobile-event-overlay.test.ts
git commit -m "feat: strengthen today week header highlight"
```
