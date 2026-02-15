-- Grant anonymous/authenticated roles full access to academic tables for local scraping operations

DROP POLICY IF EXISTS "Allow service_role full access on courses" ON courses;
CREATE POLICY "Allow all full access on courses" ON courses FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access on fields" ON fields;
CREATE POLICY "Allow all full access on fields" ON fields FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access on course_fields" ON course_fields;
CREATE POLICY "Allow all full access on course_fields" ON course_fields FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access on semesters" ON semesters;
CREATE POLICY "Allow all full access on semesters" ON semesters FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access on course_semesters" ON course_semesters;
CREATE POLICY "Allow all full access on course_semesters" ON course_semesters FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
