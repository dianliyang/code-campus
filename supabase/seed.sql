-- Seed data for local development

-- Insert sample fields
INSERT INTO fields (name) VALUES
  ('Computer Science'),
  ('Mathematics'),
  ('Physics'),
  ('Engineering'),
  ('Data Science'),
  ('Artificial Intelligence')
ON CONFLICT (name) DO NOTHING;

-- Insert sample semesters
INSERT INTO semesters (term, year) VALUES
  ('Fall', 2024),
  ('Spring', 2025),
  ('Summer', 2025),
  ('Fall', 2025)
ON CONFLICT (term, year) DO NOTHING;

-- Insert sample courses
INSERT INTO courses (university, course_code, title, units, credit, description, department, level, difficulty, popularity) VALUES
  ('MIT', '6.001', 'Structure and Interpretation of Computer Programs', '4-0-8', 12, 'Introduction to programming and computational thinking using Scheme.', 'EECS', 'Undergraduate', 3, 100),
  ('MIT', '6.006', 'Introduction to Algorithms', '4-0-8', 12, 'Introduction to mathematical modeling of computational problems, as well as common algorithms, algorithmic paradigms, and data structures.', 'EECS', 'Undergraduate', 4, 150),
  ('MIT', '6.042', 'Mathematics for Computer Science', '4-0-8', 12, 'Elementary discrete mathematics for computer science and engineering.', 'EECS', 'Undergraduate', 3, 120),
  ('Stanford', 'CS106A', 'Programming Methodology', '5', 5, 'Introduction to the engineering of computer applications.', 'Computer Science', 'Undergraduate', 2, 200),
  ('Stanford', 'CS106B', 'Programming Abstractions', '5', 5, 'Abstraction and its relation to programming. Software engineering principles.', 'Computer Science', 'Undergraduate', 3, 180),
  ('Stanford', 'CS229', 'Machine Learning', '3-4', 4, 'Topics include supervised learning, unsupervised learning, reinforcement learning.', 'Computer Science', 'Graduate', 5, 250),
  ('UC Berkeley', 'CS61A', 'Structure and Interpretation of Computer Programs', '4', 4, 'Introduction to programming and computer science.', 'EECS', 'Undergraduate', 3, 175),
  ('UC Berkeley', 'CS61B', 'Data Structures', '4', 4, 'Fundamental dynamic data structures, including linear lists, queues, trees, and other linked structures.', 'EECS', 'Undergraduate', 4, 160),
  ('CMU', '15-112', 'Fundamentals of Programming and Computer Science', '12', 12, 'A rigorous introduction to programming in Python.', 'Computer Science', 'Undergraduate', 3, 140),
  ('CMU', '15-213', 'Introduction to Computer Systems', '12', 12, 'Provides a programmers view of how computer systems execute programs.', 'Computer Science', 'Undergraduate', 5, 130)
ON CONFLICT (university, course_code) DO NOTHING;

-- Link courses to fields
INSERT INTO course_fields (course_id, field_id)
SELECT c.id, f.id FROM courses c, fields f
WHERE c.course_code = '6.001' AND f.name = 'Computer Science'
ON CONFLICT DO NOTHING;

INSERT INTO course_fields (course_id, field_id)
SELECT c.id, f.id FROM courses c, fields f
WHERE c.course_code = '6.006' AND f.name = 'Computer Science'
ON CONFLICT DO NOTHING;

INSERT INTO course_fields (course_id, field_id)
SELECT c.id, f.id FROM courses c, fields f
WHERE c.course_code = '6.042' AND f.name = 'Mathematics'
ON CONFLICT DO NOTHING;

INSERT INTO course_fields (course_id, field_id)
SELECT c.id, f.id FROM courses c, fields f
WHERE c.course_code = 'CS229' AND f.name = 'Artificial Intelligence'
ON CONFLICT DO NOTHING;

-- Link courses to semesters
INSERT INTO course_semesters (course_id, semester_id)
SELECT c.id, s.id FROM courses c, semesters s
WHERE c.university = 'MIT' AND s.term = 'Fall' AND s.year = 2024
ON CONFLICT DO NOTHING;

INSERT INTO course_semesters (course_id, semester_id)
SELECT c.id, s.id FROM courses c, semesters s
WHERE c.university = 'Stanford' AND s.term = 'Fall' AND s.year = 2024
ON CONFLICT DO NOTHING;

-- ============================================
-- User-specific seed data
-- ============================================
-- Run this AFTER logging in via magic link.
-- Replace the user_id with your actual user ID from auth.users
-- You can find your user ID in Supabase Studio: http://127.0.0.1:54323
-- Or run: SELECT id FROM auth.users WHERE email = 'your@email.com';

-- Function to seed data for current user (call after login)
CREATE OR REPLACE FUNCTION seed_user_data(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Enroll user in courses
  INSERT INTO user_courses (user_id, course_id, status, progress)
  SELECT p_user_id, c.id, 'in_progress', 30
  FROM courses c WHERE c.course_code = '6.006'
  ON CONFLICT DO NOTHING;

  INSERT INTO user_courses (user_id, course_id, status, progress)
  SELECT p_user_id, c.id, 'in_progress', 50
  FROM courses c WHERE c.course_code = 'CS106B'
  ON CONFLICT DO NOTHING;

  INSERT INTO user_courses (user_id, course_id, status, progress)
  SELECT p_user_id, c.id, 'completed', 100
  FROM courses c WHERE c.course_code = '6.001'
  ON CONFLICT DO NOTHING;

  -- Create study plans
  INSERT INTO study_plans (user_id, course_id, start_date, end_date, days_of_week, start_time, end_time, location, type)
  SELECT p_user_id, c.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days',
    ARRAY[1, 3, 5], '09:00', '10:30', 'Room 32-123', 'Lecture'
  FROM courses c WHERE c.course_code = '6.006';

  INSERT INTO study_plans (user_id, course_id, start_date, end_date, days_of_week, start_time, end_time, location, type)
  SELECT p_user_id, c.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days',
    ARRAY[2, 4], '14:00', '15:30', 'Gates B01', 'Lecture'
  FROM courses c WHERE c.course_code = 'CS106B';

  INSERT INTO study_plans (user_id, course_id, start_date, end_date, days_of_week, start_time, end_time, location, type)
  SELECT p_user_id, c.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days',
    ARRAY[5], '16:00', '18:00', 'Lab 4-231', 'Lab'
  FROM courses c WHERE c.course_code = '6.006';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
