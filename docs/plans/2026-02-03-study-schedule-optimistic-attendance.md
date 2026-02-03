# Study Schedule Optimistic Attendance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make day-detail attendance toggles update immediately in the UI with optimistic state, then async API; on failure, show failed status and revert.

**Architecture:** Add a local optimistic overlay map in `StudyCalendar` keyed by `planId:date`. Render from an effective completion value that prefers optimistic state while pending, and reverts on failure while surfacing per-item and global failure UI. Keep server truth via `router.refresh()` on success.

**Tech Stack:** Next.js (app router), React, TypeScript, Vitest, Testing Library.

### Task 1: Add optimistic-pending UI test

**Files:**
- Create: `src/tests/unit/study-calendar-optimistic.test.tsx`

**Step 1: Write the failing test**

```tsx
import React from "react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StudyCalendar from "@/components/home/StudyCalendar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const makeProps = () => ({
  courses: [
    { id: 1, title: "Course A", status: "in_progress", progress: 0, updated_at: "2026-02-03" },
  ],
  plans: [
    {
      id: 10,
      course_id: 1,
      start_date: "2026-02-01",
      end_date: "2026-02-28",
      days_of_week: [2],
      start_time: "10:00",
      end_time: "11:00",
      location: "Room 101",
      type: "lecture",
      courses: { id: 1, title: "Course A", course_code: "A101", university: "CCU" },
    },
  ],
  logs: [],
  dict: {
    calendar_title: "Study Schedule",
    calendar_today: "Today",
    calendar_no_events: "No activities",
    calendar_events: "Select a day",
    calendar_study: "Study",
    calendar_rest: "Rest",
    calendar_study_day: "Study Day",
    calendar_rest_day: "Rest Day",
    calendar_rest_message: "Rest today, study tomorrow",
    calendar_generating: "Generating...",
    calendar_generate_plan: "Generate Plan",
    calendar_courses_scheduled: "scheduled",
    calendar_weekdays: ["S", "M", "T", "W", "T", "F", "S"],
    calendar_months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
});

describe("StudyCalendar optimistic attendance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 3, 10, 0, 0));
    // keep fetch pending
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("toggles completed state immediately on click", () => {
    render(<StudyCalendar {...makeProps()} />);

    const title = screen.getByText("Course A");
    expect(title.className).not.toContain("line-through");

    fireEvent.click(title);

    expect(screen.getByText("Course A").className).toContain("line-through");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/tests/unit/study-calendar-optimistic.test.tsx`  
Expected: FAIL because the UI doesn’t change until the request completes.

**Step 3: Commit**

```bash
git add src/tests/unit/study-calendar-optimistic.test.tsx
git commit -m "test: add optimistic pending toggle test"
```

### Task 2: Add failure rollback + status UI test

**Files:**
- Modify: `src/tests/unit/study-calendar-optimistic.test.tsx`

**Step 1: Write the failing test**

```tsx
test("reverts on failure and shows failed status", async () => {
  const fetchMock = vi.fn(() => Promise.reject(new Error("fail")));
  global.fetch = fetchMock as unknown as typeof fetch;

  render(<StudyCalendar {...makeProps()} />);

  fireEvent.click(screen.getByText("Course A"));

  // optimistic first
  expect(screen.getByText("Course A").className).toContain("line-through");

  // failure rolls back + shows failed status
  await screen.findByText(/failed/i);
  expect(screen.getByText("Course A").className).not.toContain("line-through");
  expect(screen.getByText(/update failed/i)).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/tests/unit/study-calendar-optimistic.test.tsx`  
Expected: FAIL because failure UI + rollback isn’t implemented.

**Step 3: Commit**

```bash
git add src/tests/unit/study-calendar-optimistic.test.tsx
git commit -m "test: add failure rollback/status test"
```

### Task 3: Implement optimistic UI + async toggle

**Files:**
- Modify: `src/components/home/StudyCalendar.tsx`

**Step 1: Add local optimistic state + helpers**

Add state near other `useState` declarations:

```tsx
type OptimisticEntry = {
  isCompleted: boolean;
  status: "pending" | "failed";
};

const [optimisticByKey, setOptimisticByKey] = useState<Record<string, OptimisticEntry>>({});
const [globalError, setGlobalError] = useState<string | null>(null);

const eventKey = (planId: number, date: string) => `${planId}:${date}`;
```

**Step 2: Use effective completion + pending/failed flags when rendering**

Inside the `map` for `selectedDayEvents`:

```tsx
const key = eventKey(event.planId, event.date);
const optimistic = optimisticByKey[key];
const isPending = optimistic?.status === "pending";
const isFailed = optimistic?.status === "failed";
const effectiveCompleted = optimistic?.status === "pending"
  ? optimistic.isCompleted
  : event.isCompleted;
```

Then replace `event.isCompleted` checks with `effectiveCompleted`, and add a small failed badge in the card header, e.g.:

```tsx
{isFailed && (
  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
    Failed
  </span>
)}
```

Add a global banner near the top of the right panel:

```tsx
{globalError && (
  <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">
    {globalError}
  </div>
)}
```

**Step 3: Update toggle handler for optimistic + rollback**

Replace `toggleComplete` with:

```tsx
const toggleComplete = async (planId: number, date: string, currentCompleted: boolean) => {
  const key = eventKey(planId, date);
  const nextCompleted = !currentCompleted;

  setGlobalError(null);
  setOptimisticByKey(prev => ({
    ...prev,
    [key]: { isCompleted: nextCompleted, status: "pending" },
  }));

  try {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_complete", planId, date }),
    });
    if (!res.ok) {
      throw new Error("Request failed");
    }
    setOptimisticByKey(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    router.refresh();
  } catch (e) {
    setOptimisticByKey(prev => ({
      ...prev,
      [key]: { isCompleted: currentCompleted, status: "failed" },
    }));
    setGlobalError("Update failed. Please try again.");
  }
};
```

**Step 4: Update click handler to use effective state + disable while pending**

```tsx
onClick={() => {
  if (isPending) return;
  toggleComplete(event.planId, event.date, effectiveCompleted);
}}
```

Optionally add `aria-disabled={isPending}` to the card container.

**Step 5: Run tests**

Run: `npm test -- src/tests/unit/study-calendar-optimistic.test.tsx`  
Expected: PASS.

**Step 6: Commit**

```bash
git add src/components/home/StudyCalendar.tsx
git commit -m "feat: optimistic attendance toggle with failure rollback"
```

### Task 4: Optional refactor cleanup (keep green)

**Files:**
- Modify: `src/components/home/StudyCalendar.tsx`

**Step 1: Small cleanup**
- Extract tiny helpers for banner text or status pill if duplication appears.

**Step 2: Run tests**

Run: `npm test -- src/tests/unit/study-calendar-optimistic.test.tsx`  
Expected: PASS.

**Step 3: Commit**

```bash
git add src/components/home/StudyCalendar.tsx
git commit -m "refactor: tidy optimistic attendance UI"
```
