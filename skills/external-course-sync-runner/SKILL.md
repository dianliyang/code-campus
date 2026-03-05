---
name: external-course-sync-runner
description: Use when an external agent (without this codebase) must build and submit a practical course study plan using only external retrieve/push APIs plus its own internet retrieval when data is insufficient.
---

# External Course Sync Runner

## Retrieve APIs
Use only these API endpoints from `https://course.oili.dev`:

1. `GET /api/external/courses/:course_code/plan-input?mode=:mode`
Purpose: primary generation input.

2. `GET /api/external/courses/:course_code`
Purpose: full external course fallback data (resources, syllabus, assignments, schedules).

## Submit APIs
Use only:

1. `POST /api/external/courses/:course_code/plan-submit`
Purpose: push final validated result.
Writes: `courses`, `study_plans`, `course_syllabi`, `course_schedules`, `course_assignments`.

## Authentication
- Header: `x-api-key: <API_KEY>`
- Content-Type for submit: `application/json`
- Default from env: `CM_API_KEY`

## Required Inputs
- `base_url` (default `https://course.oili.dev`)
- `api_key` (default from env `CM_API_KEY`)
- `course_code`
- Optional `user_id` (default from env `CM_USER_ID`; server auto-resolves if omitted)
- `mode` (required user choice before retrieval): `fresh|existing|hybrid`

## Agent Workflow (No Codebase Dependency)
1. Ask user to choose planning mode: `fresh`, `existing`, or `hybrid`.
   - `fresh`: ignore prior generated plan shape and rebuild from current source-of-truth. Always call `plan-input?mode=fresh`, set `replaceExisting=true` on submit, and regenerate schedule/task rows from newly retrieved sources.
   - `existing`: retrieve and use existing plan/signal payload as-is.
   - `hybrid`: retrieve existing payload and merge with new retrieval/internet findings.
2. Call `GET /api/external/courses/:course_code/plan-input?mode=:mode` using the selected mode.
3. Show retrieved data summary to user before planning:
   - Course metadata found/missing.
   - Number of lectures/tasks/assignments and detected date window.
   - Existing plan/schedule presence (if any).
4. For `fresh` mode, do a source-grounded pass before planning:
   - Fetch official course pages (home, syllabus, schedule, assignments/projects pages) from `primaryUrl/resources`.
   - Build a structured list of real items from sources: lecture sequence, assignment/project milestones, labs/quizzes/exams, and known policies/deadlines.
   - Prefer latest term/semester pages; if incomplete, fallback to older archived term pages.
5. Check if data is sufficient:
   - At least one source URL (`primaryUrl` or `resources`)
   - Non-empty actionable items (lectures/tasks/assignments extracted from source)
   - Reasonable planning window (`startDate/endDate` or inferable duration)
6. If insufficient, retrieve from internet directly:
   - Crawl official course pages from known URLs.
   - Search web for syllabus/assignments/calendar pages.
   - Extract: lecture timeline, readings, labs, assignments, projects, quizzes, exams.
6. Normalize tasks:
   - Kinds: `reading|lecture|lab|assignment|project|quiz|exam|task`
   - Remove duplicates by `(kind,title,due date)`
   - Keep only actionable items.
   - Semester rule: use latest semester data/pages first; if insufficient, fallback to older archived semester pages.
7. Complete missing course fields only (do not overwrite existing values):
   - `description`
   - `units`
   - `workload`
   - `level`
   - `category`
8. Generate practical schedule according to selected mode:
   - Start from today or study-plan start date (whichever is later).
   - Spread workload across days/weeks.
   - Max 2-3 tasks/day for normal days.
   - Avoid overloading a single week.
   - Preserve sequence for numbered series (Project 1 before Project 2).
   - Add break capacity: at least 1 light/rest day per 7-day window.
   - Avoid consecutive heavy days when possible.
   - Use a rolling horizon: detailed day-level tasks for the next 21 days; beyond that, keep at most 1 lighter placeholder/planning task per week until closer to due dates.
   - Compute weekly capacity from `daysOfWeek`, `startTime`, and `endTime`; target about 60-85% of that capacity, not 100%.
   - If required work cannot fit without cramming, extend schedule range or mark carry-over tasks instead of increasing daily load.
   - In `fresh` mode, do not use generic/template-only task lists when source pages provide explicit lecture/assignment items; include source-grounded items in the plan.
   - In `fresh` mode, distribute task kinds across the plan (reading/lecture/lab/assignment/project where available), not a single-kind cluster.
9. Validate JSON payload (strict checks below).
10. Call `POST /api/external/courses/:course_code/plan-submit`.
11. After reporting submit result, ask the user to clear any exported env vars used for this run (for example `unset CM_API_KEY CM_USER_ID API_KEY`).

## Validation Rules Before Submit
- `plan.days` exists and non-empty.
- Every day has:
  - `date` in `YYYY-MM-DD`
  - `tasks` array with non-empty `title`
- No date before today unless explicitly required by user.
- `studyPlan.startDate` must be today or later; if source dates are in the past, convert to catch-up priorities instead of backdating plan days.
- Must include explicit `mode` choice (`fresh|existing|hybrid`) before generation.
- If mode is `fresh`:
  - submit with `replaceExisting: true`.
  - include source-backed lecture/assignment/project items when available (not only generic placeholders).
  - keep a mixed task-kind distribution (reading/lecture/lab/assignment/project where available).
- No task explosion:
  - Prefer <=3 tasks/day (<=2 for most days)
  - Weekly load balanced (no single week containing majority of heavy tasks)
  - Keep at least 2 light/rest days per 7-day window when planning range is 3+ weeks
- `scheduleRows` and `assignments` (if provided) must be consistent with `plan`.
- Course patch fields should only be sent when currently missing.
- Semester source rule:
  - prefer latest semester records/pages;
  - if latest semester lacks required tasks/schedule details, fallback to older archive.
- Schedule intensity rule:
  - no more than 2 heavy days in any rolling 7-day window,
  - include at least 1 light/rest day in any rolling 7-day window.
  - for plans longer than 6 weeks, keep far-future weeks sparse and avoid fully packing every week.

## Submit Payload Template
```json
{
  "userId": "optional-user-id",
  "replaceExisting": true,
  "course": {
    "description": "only if missing",
    "units": "only if missing",
    "workload": 3,
    "level": "only if missing",
    "category": "only if missing",
    "subdomain": "only if missing",
    "url": "https://...",
    "resources": ["https://..."]
  },
  "studyPlan": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "daysOfWeek": [1,2,3,4,5],
    "startTime": "19:00:00",
    "endTime": "21:00:00",
    "timezone": "UTC",
    "kind": "generated"
  },
  "syllabus": {
    "sourceUrl": "https://...",
    "rawText": "optional condensed text",
    "content": { "raw_data": { "tasks": [] } },
    "schedule": []
  },
  "plan": {
    "days": [
      {
        "date": "YYYY-MM-DD",
        "focus": "Course Work",
        "tasks": [
          { "title": "Lecture 1 review", "kind": "lecture", "minutes": 60 },
          { "title": "Problem Set 1", "kind": "assignment", "minutes": 90 }
        ]
      }
    ]
  }
}
```

## Server Defaults (plan-submit)
- If `userId` is omitted: server resolves from API key owner, then enrolled user fallback.
- If `studyPlan.startTime` missing: defaults to `19:00:00`.
- If `studyPlan.endTime` missing: defaults to `21:00:00`.
- If `studyPlan.timezone` missing: defaults to `UTC`.
- If `studyPlan.kind` missing: defaults to `generated`.

## Error Handling
- If retrieve API returns insufficient data and web retrieval fails, stop and report missing fields explicitly.
- If submit returns 400, fix payload shape and retry once.
- If submit returns 500, report server error and keep generated payload for retry.
