-- Forcefully disable RLS for local development to ensure scrapers can always write
-- This resolves any "new row violates row-level security policy" errors

ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE semesters DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_semesters DISABLE ROW LEVEL SECURITY;

-- Also ensure permissions are granted to the relevant roles just in case
GRANT ALL ON TABLE courses TO anon, authenticated, service_role;
GRANT ALL ON TABLE workouts TO anon, authenticated, service_role;
GRANT ALL ON TABLE fields TO anon, authenticated, service_role;
GRANT ALL ON TABLE course_fields TO anon, authenticated, service_role;
GRANT ALL ON TABLE semesters TO anon, authenticated, service_role;
GRANT ALL ON TABLE course_semesters TO anon, authenticated, service_role;
