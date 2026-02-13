-- Move course metadata out of details JSON into dedicated columns.

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS prerequisites TEXT,
ADD COLUMN IF NOT EXISTS related_urls TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS cross_listed_courses TEXT;

-- Backfill prerequisites from details JSON.
UPDATE courses
SET prerequisites = NULLIF(TRIM(COALESCE(details->>'prerequisites', '')), '')
WHERE details ? 'prerequisites';

-- Backfill related URLs from details JSON.
UPDATE courses
SET related_urls = COALESCE(
  (
    SELECT array_agg(value)
    FROM jsonb_array_elements_text(COALESCE(details->'relatedUrls', '[]'::jsonb)) AS t(value)
  ),
  '{}'::text[]
)
WHERE details ? 'relatedUrls';

-- Backfill cross listed courses from details JSON.
UPDATE courses
SET cross_listed_courses = NULLIF(TRIM(COALESCE(details->>'crossListedCourses', '')), '')
WHERE details ? 'crossListedCourses';

-- Remove legacy keys from details JSON.
UPDATE courses
SET details = details - 'prerequisites' - 'relatedUrls' - 'crossListedCourses'
WHERE details ? 'prerequisites'
   OR details ? 'relatedUrls'
   OR details ? 'crossListedCourses';
