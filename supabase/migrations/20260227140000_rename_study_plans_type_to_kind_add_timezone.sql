-- Rename study_plans.type → kind
ALTER TABLE study_plans RENAME COLUMN type TO kind;

-- Add timezone column (IANA timezone ID, e.g. 'Europe/Berlin', 'America/New_York')
ALTER TABLE study_plans ADD COLUMN timezone TEXT DEFAULT 'UTC';
