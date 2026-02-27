-- Add new fields to courses table
ALTER TABLE courses ADD COLUMN subdomain TEXT;
ALTER TABLE courses ADD COLUMN resources TEXT[] DEFAULT '{}'::text[];
ALTER TABLE courses ADD COLUMN category TEXT;

-- Add indexes for better filtering
CREATE INDEX idx_courses_subdomain ON courses(subdomain);
CREATE INDEX idx_courses_category ON courses(category);
