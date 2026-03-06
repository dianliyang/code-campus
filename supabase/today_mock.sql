-- Intensive mock data for TODAY

DO $$
DECLARE
  v_user_id uuid;
  v_course_id_1 bigint;
  v_course_id_2 bigint;
  v_course_id_3 bigint;
  v_course_id_4 bigint;
  v_plan_id_1 bigint;
  v_plan_id_2 bigint;
  v_workout_id_1 bigint;
  v_workout_id_2 bigint;
  v_today date := CURRENT_DATE;
BEGIN
  -- 1. Ensure a user exists
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Insert Courses if not exist
  INSERT INTO courses (university, course_code, title, units, credit, department, level)
  VALUES 
    ('MIT', '6.1010', 'Software Performance Engineering', '4-0-8', 12, 'EECS', 'Undergraduate'),
    ('Stanford', 'CS107', 'Computer Systems', '5', 5, 'CS', 'Undergraduate'),
    ('UC Berkeley', 'CS162', 'Operating Systems', '4', 4, 'EECS', 'Undergraduate'),
    ('CMU', '15-445', 'Database Systems', '12', 12, 'CS', 'Undergraduate')
  ON CONFLICT (university, course_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_course_id_1;
  
  SELECT id INTO v_course_id_2 FROM courses WHERE course_code = 'CS107';
  SELECT id INTO v_course_id_3 FROM courses WHERE course_code = 'CS162';
  SELECT id INTO v_course_id_4 FROM courses WHERE course_code = '15-445';

  -- 3. Enroll user
  INSERT INTO user_courses (user_id, course_id, status, progress)
  VALUES 
    (v_user_id, v_course_id_1, 'in_progress', 10),
    (v_user_id, v_course_id_2, 'in_progress', 25),
    (v_user_id, v_course_id_3, 'in_progress', 40),
    (v_user_id, v_course_id_4, 'in_progress', 5)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  -- 4. Create Study Plans (Recurring for Today)
  -- Assuming today is Friday (5) or similar, we force it to include today's day of week
  INSERT INTO study_plans (user_id, course_id, start_date, end_date, days_of_week, start_time, end_time, kind, location)
  VALUES 
    (v_user_id, v_course_id_1, v_today - 7, v_today + 30, ARRAY[EXTRACT(DOW FROM v_today)::int], '19:00', '21:00', 'Lecture', 'Room 32-123'),
    (v_user_id, v_course_id_2, v_today - 7, v_today + 30, ARRAY[EXTRACT(DOW FROM v_today)::int], '14:00', '15:30', 'Seminar', 'Gates B01')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_plan_id_1;

  -- 5. Create specific Tasks (course_schedules) for Today
  -- These will take priority over recurring plans
  INSERT INTO course_schedules (course_id, schedule_date, task_title, task_kind, duration_minutes, source)
  VALUES
    (v_course_id_3, v_today, 'Read Chapter 5: Virtual Memory', 'reading', 90, 'manual'),
    (v_course_id_3, v_today, 'Implement Page Table Walker', 'project', 120, 'manual'),
    (v_course_id_4, v_today, 'Buffer Pool Manager Lab', 'assignment', 180, 'manual')
  ON CONFLICT DO NOTHING;

  -- 6. Create Assignments due Today
  INSERT INTO course_assignments (course_id, label, kind, due_on, description)
  VALUES
    (v_course_id_1, 'Problem Set 3', 'assignment', v_today, 'Late submissions not accepted.'),
    (v_course_id_2, 'Midterm Project Draft', 'project', v_today, 'Submit PDF to portal.')
  ON CONFLICT DO NOTHING;

  -- 7. Workouts
  INSERT INTO workouts (source, course_code, category, title, day_of_week, start_time, end_time, location, start_date, end_date, booking_status)
  VALUES
    ('CAU Kiel Sportzentrum', 'W-101', 'Fitness', 'High Intensity Training', 
     CASE EXTRACT(DOW FROM v_today)
       WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue' WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
     END, '17:00', '18:30', 'Halle I', v_today - 30, v_today + 30, 'available'),
    ('CAU Kiel Sportzentrum', 'W-102', 'Yoga', 'Vinyasa Flow',
     CASE EXTRACT(DOW FROM v_today)
       WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue' WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
     END, '08:30', '09:45', 'Halle II', v_today - 30, v_today + 30, 'available')
  RETURNING id INTO v_workout_id_1;

  SELECT id INTO v_workout_id_2 FROM workouts WHERE course_code = 'W-102';

  -- Enroll user in workouts
  INSERT INTO user_workouts (user_id, workout_id)
  VALUES (v_user_id, v_workout_id_1), (v_user_id, v_workout_id_2)
  ON CONFLICT DO NOTHING;

  -- 8. Recent scraper jobs
  INSERT INTO scraper_jobs (university, semester, status, job_type, triggered_by, course_count, duration_ms)
  VALUES
    ('MIT', 'Fall 2025', 'success', 'courses', 'manual', 450, 12400),
    ('Stanford', 'Fall 2025', 'failed', 'courses', 'manual', 0, 5600),
    ('UC Berkeley', 'Fall 2025', 'in_progress', 'courses', 'manual', 120, 8900)
  ON CONFLICT DO NOTHING;

  -- 9. AI Responses
  INSERT INTO ai_responses (user_id, feature, response, cost_usd, tokens_input, tokens_output)
  VALUES
    (v_user_id, 'course-intel', '{"status": "ok"}'::jsonb, 0.0045, 1200, 450),
    (v_user_id, 'planner', '{"status": "ok"}'::jsonb, 0.0120, 3500, 1200),
    (v_user_id, 'syllabus-retrieve', '{"status": "ok"}'::jsonb, 0.0008, 500, 150)
  ON CONFLICT DO NOTHING;

END $$;
