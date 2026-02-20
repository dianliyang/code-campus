-- Move project/seminar metadata out of details JSON into dedicated columns.

ALTER TABLE projects_seminars
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS prerequisites TEXT,
  ADD COLUMN IF NOT EXISTS contents TEXT,
  ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}'::jsonb;

-- Backfill from existing details JSON.
UPDATE projects_seminars
SET
  department = COALESCE(
    NULLIF(TRIM(department), ''),
    NULLIF(TRIM(COALESCE(details->>'department', '')), '')
  ),
  prerequisites = COALESCE(
    NULLIF(TRIM(prerequisites), ''),
    NULLIF(TRIM(COALESCE(details->>'prerequisites', '')), ''),
    NULLIF(TRIM(COALESCE(details->>'prerequisites_organisational_information', '')), '')
  ),
  contents = COALESCE(
    NULLIF(TRIM(contents), ''),
    NULLIF(TRIM(COALESCE(details->>'contents', '')), '')
  ),
  schedule = CASE
    WHEN schedule IS NOT NULL AND schedule <> '{}'::jsonb THEN schedule
    WHEN jsonb_typeof(details->'schedule') = 'object' THEN details->'schedule'
    ELSE COALESCE(schedule, '{}'::jsonb)
  END;

-- Remove migrated keys from details payload.
UPDATE projects_seminars
SET details = COALESCE(details, '{}'::jsonb)
  - 'department'
  - 'prerequisites'
  - 'prerequisites_organisational_information'
  - 'contents'
  - 'schedule'
WHERE COALESCE(details, '{}'::jsonb) ?| ARRAY[
  'department',
  'prerequisites',
  'prerequisites_organisational_information',
  'contents',
  'schedule'
];
