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
1. Retrieve course/plan input by external APIs.
2. If source data is not enough, expand context from public internet sources (Brave-enabled logic in pipeline).
3. Scrape and normalize key items: lectures, assignments, labs, projects, exams, readings.
4. Generate schedule in deterministic JSON form.
5. Verify generated schedule structure before persistence.
6. Submit via plan API; backend writes `courses`, `study_plans`, `course_syllabi`, `course_schedules`, `course_assignments`.

## Retrieve APIs
- External read APIs:
  - `GET /api/external/courses/:course_code/plan-input` (primary payload for schedule generation)
  - `GET /api/external/courses/:course_code` (full external course payload)
  - `GET /api/external/courses/:course_code/sync` (sync snapshot/summary)
  - `GET /api/external/courses` (fallback discovery/list endpoint)
- Web retrieval (when source data is not enough):
  - direct fetch from URLs present in course payload (`url`, `resources`)
  - Brave Search API: `https://api.search.brave.com/res/v1/web/search` for additional public context

## Submit APIs
- External submit APIs:
  - `POST /api/external/courses/:course_code/plan-submit` (validated plan submission; writes target tables)
  - optional `POST /api/external/courses/:course_code/sync` for full deterministic regeneration

## Run
```bash
npx tsx -r dotenv/config scripts/skill-sync-course.ts \
  --course-code <COURSE_CODE> \
  --api-key <API_KEY> \
  --source-mode auto
```

## Bulk Run (Exclude CAU)
```bash
npx tsx -r dotenv/config scripts/skill-sync-courses-bulk.ts \
  --api-key <API_KEY> \
  --base-url https://course.oili.dev
```

## Notes
- Use bulk mode to retrieve `/api/external/courses`, exclude universities containing `CAU`, then run deterministic sync per course.
- Bulk mode submits `sourceMode: "fresh"` to force internet retrieval + new scraping before regeneration.
- Prints progress stage-by-stage and final write summary.
