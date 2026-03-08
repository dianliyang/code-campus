# Study Plan Single-Day Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist every study plan as one weekday per row while preserving the existing multi-select weekday UI.

**Architecture:** Normalize all write paths through a shared helper that fans `daysOfWeek` arrays into one-row-per-day records. Add a migration that expands existing multi-day `study_plans` rows into single-day rows and reassigns `study_logs` by matching each log date to the correct weekday row.

**Tech Stack:** Next.js, TypeScript, Supabase/Postgres, Vitest

---

### Task 1: Add failing tests for single-day plan expansion

**Files:**
- Create: `src/tests/unit/study-plan-persistence.test.ts`
- Create: `src/lib/study-plan-persistence.ts`

**Step 1: Write failing tests**

Cover:
- expanding `[1,3,5]` into three rows
- deduping repeated days
- preserving all non-day plan fields on each expanded row

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/tests/unit/study-plan-persistence.test.ts`
Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

Create helper(s):
- normalize weekday arrays
- expand one multi-day input into multiple single-day rows

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/tests/unit/study-plan-persistence.test.ts`
Expected: PASS

### Task 2: Normalize API write paths

**Files:**
- Modify: `src/app/api/study-plans/create/route.ts`
- Modify: `src/app/api/study-plans/update/route.ts`
- Modify: `src/app/api/schedule/route.ts`

**Step 1: Create path**

Fan multi-select `daysOfWeek` into multiple inserts.

**Step 2: Update path**

For an existing row:
- keep one row for one selected weekday
- insert extra rows for added weekdays
- delete rows for removed weekdays when editing from a grouped plan payload

For drag/resize calendar updates:
- since dragged row will already be single-day, update only that row

**Step 3: Generated/default schedule path**

Fan generated weekday arrays into multiple rows before insert.

**Step 4: Run focused tests**

Run: `npm test -- --run src/tests/unit/study-plan-persistence.test.ts`
Expected: PASS

### Task 3: Normalize action/service write paths

**Files:**
- Modify: `src/actions/courses.ts`
- Modify: `src/lib/ai/course-intel.ts`
- Modify: `src/app/api/external/courses/[course_code]/plan-submit/route.ts`

**Step 1: Course actions**

Update generated-plan confirmation and course-study-plan save paths to insert single-day rows.

**Step 2: AI/external ingestion**

Fan any multi-day arrays into one-row-per-day inserts.

**Step 3: Run focused tests**

Run: `npm test -- --run src/tests/unit/study-plan-persistence.test.ts`
Expected: PASS

### Task 4: Backfill existing DB rows

**Files:**
- Create: `supabase/migrations/20260308193000_normalize_study_plans_to_single_day_rows.sql`

**Step 1: Expand existing multi-day rows**

For each `study_plans` row with multiple `days_of_week` values:
- create one replacement row per weekday

**Step 2: Reassign study logs**

Move `study_logs.plan_id` to the correct replacement row based on `log_date` weekday.

**Step 3: Remove original multi-day rows**

Delete only after replacement rows and logs are safely mapped.

**Step 4: Add a DB check**

Enforce `cardinality(days_of_week) = 1`.

### Task 5: Final verification

**Files:**
- Modify: none

**Step 1: Run focused suite**

Run: `npm test -- --run src/tests/unit/study-plan-persistence.test.ts src/tests/unit/week-calendar-drag.test.ts src/tests/unit/week-calendar-layout.test.ts src/tests/unit/week-calendar.test.ts src/tests/unit/routine-layout.test.ts`
Expected: PASS
