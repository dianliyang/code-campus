-- Add latest_semester column to courses table
-- This stores the term and year of the last time this course was fully scraped.
-- Format: { "term": "Fall", "year": 2025 }

ALTER TABLE courses ADD COLUMN IF NOT EXISTS latest_semester JSONB;
