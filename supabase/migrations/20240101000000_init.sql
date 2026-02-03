-- Initial schema migration for CodeCampus

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fields table (for course categorization)
CREATE TABLE IF NOT EXISTS fields (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Semesters table
CREATE TABLE IF NOT EXISTS semesters (
  id SERIAL PRIMARY KEY,
  term TEXT NOT NULL,
  year INTEGER NOT NULL,
  UNIQUE(term, year)
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  university TEXT NOT NULL,
  course_code TEXT NOT NULL,
  title TEXT NOT NULL,
  units TEXT,
  credit INTEGER,
  description TEXT,
  url TEXT,
  details JSONB,
  department TEXT,
  corequisites TEXT,
  level TEXT,
  difficulty INTEGER DEFAULT 0,
  popularity INTEGER DEFAULT 0,
  workload TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(course_code, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(department, '')), 'C')
  ) STORED,
  UNIQUE(university, course_code)
);

-- Index for full-text search
CREATE INDEX IF NOT EXISTS courses_search_idx ON courses USING GIN (search_vector);

-- Course-Field junction table
CREATE TABLE IF NOT EXISTS course_fields (
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, field_id)
);

-- Course-Semester junction table
CREATE TABLE IF NOT EXISTS course_semesters (
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, semester_id)
);

-- User courses (enrollment/tracking)
CREATE TABLE IF NOT EXISTS user_courses (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  priority INTEGER,
  notes TEXT,
  gpa NUMERIC(3,2),
  score INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

-- Study plans
CREATE TABLE IF NOT EXISTS study_plans (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  start_time TIME DEFAULT '09:00',
  end_time TIME DEFAULT '10:00',
  location TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study logs (track attendance/completion)
CREATE TABLE IF NOT EXISTS study_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, log_date)
);

-- Scraper jobs (for tracking course scraping)
CREATE TABLE IF NOT EXISTS scraper_jobs (
  id SERIAL PRIMARY KEY,
  university TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  course_count INTEGER,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to increment popularity
CREATE OR REPLACE FUNCTION increment_popularity(row_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE courses SET popularity = popularity + 1 WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement popularity (safely, not below 0)
CREATE OR REPLACE FUNCTION decrement_popularity(row_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE courses SET popularity = GREATEST(0, popularity - 1) WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies

-- Enable RLS on user-specific tables
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_logs ENABLE ROW LEVEL SECURITY;

-- User courses policies
CREATE POLICY "Users can view own courses" ON user_courses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own courses" ON user_courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses" ON user_courses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own courses" ON user_courses
  FOR DELETE USING (auth.uid() = user_id);

-- Study plans policies
CREATE POLICY "Users can view own study plans" ON study_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans" ON study_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans" ON study_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans" ON study_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Study logs policies
CREATE POLICY "Users can view own study logs" ON study_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study logs" ON study_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study logs" ON study_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study logs" ON study_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Public tables (courses, fields, semesters) - allow public read
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Anyone can view fields" ON fields FOR SELECT USING (true);
CREATE POLICY "Anyone can view semesters" ON semesters FOR SELECT USING (true);
CREATE POLICY "Anyone can view course_fields" ON course_fields FOR SELECT USING (true);
CREATE POLICY "Anyone can view course_semesters" ON course_semesters FOR SELECT USING (true);
