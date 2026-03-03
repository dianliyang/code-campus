---
name: external-course-sync-runner
description: Use when an external agent (without this codebase) must build and submit a practical course study plan using only external retrieve/push APIs plus its own internet retrieval when data is insufficient.
---

# External Course Sync Runner

## Retrieve APIs
Use only these API endpoints from `https://course.oili.dev`:

1. `GET /api/external/courses/:course_code/plan-input`
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

## Required Inputs
- `base_url` (default `https://course.oili.dev`)
- `api_key`
- `course_code`
- Optional `user_id` (server auto-resolves if omitted)

## Agent Workflow (No Codebase Dependency)
1. Call `GET /api/external/courses/:course_code/plan-input`.
2. Check if data is sufficient:
   - At least one source URL (`primaryUrl` or `resources`)
   - Non-empty signals (`lectures` or `tasks`)
   - Reasonable planning window (`startDate/endDate` or inferable duration)
3. If insufficient, retrieve from internet directly:
   - Crawl official course pages from known URLs.
   - Search web for syllabus/assignments/calendar pages.
   - Extract: lecture timeline, readings, labs, assignments, projects, quizzes, exams.
4. Normalize tasks:
   - Kinds: `reading|lecture|lab|assignment|project|quiz|exam|task`
   - Remove duplicates by `(kind,title,due date)`
   - Keep only actionable items.
5. Generate practical schedule:
   - Start from today or study-plan start date (whichever is later).
   - Spread workload across days/weeks.
   - Max 3-4 tasks/day.
   - Avoid overloading a single week.
   - Preserve sequence for numbered series (Project 1 before Project 2).
6. Validate JSON payload (strict checks below).
7. Call `POST /api/external/courses/:course_code/plan-submit`.

## Validation Rules Before Submit
- `plan.days` exists and non-empty.
- Every day has:
  - `date` in `YYYY-MM-DD`
  - `tasks` array with non-empty `title`
- No date before today unless explicitly required by user.
- No task explosion:
  - Prefer <=4 tasks/day
  - Weekly load balanced (no single week containing majority of heavy tasks)
- `scheduleRows` and `assignments` (if provided) must be consistent with `plan`.

## Submit Payload Template
```json
{
  "userId": "optional-user-id",
  "replaceExisting": true,
  "course": {
    "description": "only if missing",
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
