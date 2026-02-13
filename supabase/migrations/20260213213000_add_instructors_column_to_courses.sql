-- Move instructors from courses.details JSON to dedicated courses.instructors column.

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS instructors TEXT[] DEFAULT '{}'::text[];

-- Backfill from details JSON where available.
UPDATE courses
SET instructors = COALESCE(
  (
    SELECT array_agg(value)
    FROM jsonb_array_elements_text(COALESCE(details->'instructors', '[]'::jsonb)) AS t(value)
  ),
  '{}'::text[]
)
WHERE details ? 'instructors';

-- Remove legacy key from details after migration.
UPDATE courses
SET details = details - 'instructors'
WHERE details ? 'instructors';
