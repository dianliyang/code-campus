# Workout Provider Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the workout filter drawer with a provider-only dropdown in the workouts toolbar.

**Architecture:** Provide provider option data from `WorkoutList`, render a single provider dropdown in `WorkoutListHeader`, and stop mounting the old sidebar drawer from the page entry. Add focused toolbar tests for the new provider control and URL behavior.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library

---

### Task 1: Replace workouts filter drawer with provider dropdown

**Files:**
- Modify: `src/components/workouts/WorkoutListHeader.tsx`
- Modify: `src/components/workouts/WorkoutList.tsx`
- Modify: `src/app/(dashboard)/workouts/page.tsx`
- Modify: `src/tests/unit/workout-list-header-responsive.test.tsx`

**Step 1: Write the failing test**

Add toolbar assertions that:
- the old filter button is gone
- a provider dropdown exists
- selecting a provider writes the `provider` query param
- selecting `All providers` clears the param

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/workout-list-header-responsive.test.tsx`
Expected: FAIL because the header still renders the old filter button flow.

**Step 3: Write minimal implementation**

Update `WorkoutListHeader` to render a provider-only dropdown driven by the `provider` URL param, feed provider options from `WorkoutList`, and remove the sidebar mount from the workouts page.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/tests/unit/workout-list-header-responsive.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add docs/plans/2026-03-13-workout-provider-dropdown-design.md docs/plans/2026-03-13-workout-provider-dropdown-implementation-plan.md src/components/workouts/WorkoutListHeader.tsx src/components/workouts/WorkoutList.tsx src/app/(dashboard)/workouts/page.tsx src/tests/unit/workout-list-header-responsive.test.tsx
git commit -m "feat: replace workout filters with provider dropdown"
```
