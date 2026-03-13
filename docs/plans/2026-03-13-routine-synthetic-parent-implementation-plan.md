# Routine Synthetic Parent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Synthesize routine parent groups for same-course items when an explicit study-plan parent row is missing.

**Architecture:** Extend `buildTodayRoutineGroups` in `week-calendar.ts` so it first honors explicit parent study-plan rows, then falls back to creating a synthetic parent for grouped same-course same-day items that would otherwise render flat. Add focused grouping tests for the missing-parent case.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Add synthetic-parent fallback for routine grouping

**Files:**
- Modify: `src/lib/week-calendar.ts`
- Modify: `src/tests/unit/week-calendar.test.ts`

**Step 1: Write the failing test**

Add a case showing multiple same-course same-day child items without an explicit parent row and assert they group under one synthesized parent.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/week-calendar.test.ts`
Expected: FAIL because the current implementation leaves those items flat.

**Step 3: Write minimal implementation**

Update `buildTodayRoutineGroups` so it creates a synthetic course/day parent only when explicit parent lookup fails and multiple related items should still be grouped.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/tests/unit/week-calendar.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add docs/plans/2026-03-13-routine-synthetic-parent-design.md docs/plans/2026-03-13-routine-synthetic-parent-implementation-plan.md src/lib/week-calendar.ts src/tests/unit/week-calendar.test.ts
git commit -m "fix: synthesize routine parents for grouped course items"
```
