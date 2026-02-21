-- Hide all NCU courses from normal course/achievement surfaces.
-- Transcript export intentionally keeps access to completed rows regardless of is_hidden.
UPDATE courses
SET is_hidden = TRUE
WHERE university = 'NCU';
