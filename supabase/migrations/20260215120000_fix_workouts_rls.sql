-- Fix RLS policies for workouts table to allow anonymous access for local development scraping
-- In production, this should be restricted to service_role or specific authenticated accounts.

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on workouts" ON workouts;
CREATE POLICY "Allow public read access on workouts" ON workouts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous full access on workouts" ON workouts;
CREATE POLICY "Allow anonymous full access on workouts" ON workouts 
  FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);
