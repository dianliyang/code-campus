# Status Card Rectangle Count Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the overview status card highlight an exact number of rectangles equal to each metric count, capped at 10.

**Architecture:** Update the `MomentumBar` helper in `CourseMomentumCard` so active rectangle count is derived directly from `count` rather than from proportional scaling. Add a focused unit test that verifies the exact active rectangle count for a representative metric value.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library

---

### Task 1: Make metric bars use direct rectangle counts

**Files:**
- Modify: `src/components/dashboard/CourseMomentumCard.tsx`
- Modify: `src/tests/unit/course-momentum-card.test.tsx`

**Step 1: Write the failing test**

Extend `src/tests/unit/course-momentum-card.test.tsx` with an assertion that a metric count of `6` produces exactly `6` active rectangles and `10` total rectangles.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/course-momentum-card.test.tsx`
Expected: FAIL because the bar currently scales active rectangles proportionally.

**Step 3: Write minimal implementation**

In `src/components/dashboard/CourseMomentumCard.tsx`, change `MomentumBar` so it lights `Math.min(count, 10)` rectangles directly while keeping the 10-slot stack.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/tests/unit/course-momentum-card.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add docs/plans/2026-03-13-status-card-rectangle-count-design.md docs/plans/2026-03-13-status-card-rectangle-count-implementation-plan.md src/components/dashboard/CourseMomentumCard.tsx src/tests/unit/course-momentum-card.test.tsx
git commit -m "fix: use exact counts in overview status bars"
```
