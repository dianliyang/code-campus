# Learning Identity Flex Grid Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the `Learning identity` card’s summary grid flexible so it grows naturally instead of forcing one rigid row.

**Architecture:** Update the top summary container classes in `LearningProfileChart` to use a more flexible responsive layout while leaving the chart rows unchanged. Add a focused source-level or unit assertion to lock in the new responsive class contract.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library

---

### Task 1: Relax the identity summary grid

**Files:**
- Modify: `src/components/identity/LearningProfileChart.tsx`
- Modify: `src/tests/unit/learning-profile-chart.test.tsx`

**Step 1: Write the failing test**

Add an assertion that the chart no longer uses `md:grid-cols-[minmax(0,1fr)_220px]` and instead uses the new flexible responsive class.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/learning-profile-chart.test.tsx`
Expected: FAIL because the old fixed grid class is still present.

**Step 3: Write minimal implementation**

Update `src/components/identity/LearningProfileChart.tsx` to use a flexible responsive summary layout that can stack or grow naturally rather than forcing a fixed two-column row.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/tests/unit/learning-profile-chart.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add docs/plans/2026-03-13-learning-identity-flex-grid-design.md docs/plans/2026-03-13-learning-identity-flex-grid-implementation-plan.md src/components/identity/LearningProfileChart.tsx src/tests/unit/learning-profile-chart.test.tsx
git commit -m "refactor: relax learning identity summary grid"
```
