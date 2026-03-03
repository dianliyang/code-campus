---
name: external-course-sync-runner
description: Use when given a course code and API key to run end-to-end course sync locally: retrieve data, enrich via internet search when needed, scrape important items, generate a valid schedule JSON, verify it, and write results to DB.
---

# External Course Sync Runner

## Inputs
- `course_code` (required)
- `api_key` (optional, used to resolve `user_id`)
- `user_id` (optional override)
- `source_mode` (`auto|fresh|existing`, optional)

## Workflow
1. Retrieve course by code from DB.
2. If source data is not enough, expand context from public internet sources (Brave-enabled logic in pipeline).
3. Scrape and normalize key items: lectures, assignments, labs, projects, exams, readings.
4. Generate schedule in deterministic JSON form.
5. Verify generated schedule structure before persistence.
6. Submit/write to DB: `course_syllabi`, `course_schedule`, `course_assignments`.

## Retrieve APIs
- External read APIs:
  - `GET /api/external/courses/:course_code` (primary course payload: details, resources, syllabus, assignments, study plans)
  - `GET /api/external/courses/:course_code/sync` (current sync snapshot/summary)
  - `GET /api/external/courses` (fallback discovery/list endpoint)
- Web retrieval (when source data is not enough):
  - direct fetch from URLs present in course payload (`url`, `resources`)
  - Brave Search API: `https://api.search.brave.com/res/v1/web/search` for additional public context

## Submit APIs
- External submit APIs:
  - `POST /api/external/courses/:course_code/sync` (run full sync: scrape/normalize/generate/write)
  - `PATCH /api/external/courses/:course_code` (optional metadata/resource patch after validation)
- Payload expectation for sync submit:
  - `userId` (optional, if not inferable)
  - `fastMode` (optional)
  - `executionMode` (`deterministic` for non-LLM pipeline)

## Run
```bash
npx tsx -r dotenv/config scripts/skill-sync-course.ts \
  --course-code <COURSE_CODE> \
  --api-key <API_KEY> \
  --source-mode auto
```

## Notes
- Uses local pipeline directly, not `/api/external/.../sync`.
- Prints progress stage-by-stage and final write summary.
