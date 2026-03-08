-- Mock data for Calendar and Dashboard development
-- Run this AFTER seed.sql and AFTER logging in to get your user_id.
-- Replace 'USER_ID_HERE' with your actual user UUID.

DO $$
DECLARE
    target_user_id UUID := 'USER_ID_HERE'; -- <--- REPLACE THIS
    course_id_1 INT;
    course_id_2 INT;
    course_id_3 INT;
BEGIN
    -- Only proceed if user_id is replaced
    IF target_user_id = 'USER_ID_HERE'::UUID THEN
        RAISE NOTICE 'Please replace USER_ID_HERE with your actual UUID from auth.users';
        RETURN;
    END IF;

    -- Get some existing course IDs
    SELECT id INTO course_id_1 FROM courses WHERE course_code = '6.006' LIMIT 1;
    SELECT id INTO course_id_2 FROM courses WHERE course_code = 'CS106B' LIMIT 1;
    SELECT id INTO course_id_3 FROM courses WHERE course_code = 'CS229' LIMIT 1;

    -- 1. Enroll user in these courses if not already
    INSERT INTO user_courses (user_id, course_id, status, progress) VALUES
    (target_user_id, course_id_1, 'in_progress', 30),
    (target_user_id, course_id_2, 'in_progress', 50),
    (target_user_id, course_id_3, 'in_progress', 10)
    ON CONFLICT DO NOTHING;

    -- 2. Create Study Plans (Recurring)
    INSERT INTO study_plans (user_id, course_id, start_date, end_date, days_of_week, start_time, end_time, location, kind, timezone) VALUES
    (target_user_id, course_id_1, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '60 days', ARRAY[1], '09:00:00', '10:30:00', 'Stata Center', 'Lecture', 'UTC'),
    (target_user_id, course_id_1, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '60 days', ARRAY[3], '09:00:00', '10:30:00', 'Stata Center', 'Lecture', 'UTC'),
    (target_user_id, course_id_1, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '60 days', ARRAY[5], '09:00:00', '10:30:00', 'Stata Center', 'Lecture', 'UTC'),
    (target_user_id, course_id_2, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '60 days', ARRAY[2], '14:00:00', '15:30:00', 'Gates B01', 'Lecture', 'UTC'),
    (target_user_id, course_id_2, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '60 days', ARRAY[4], '14:00:00', '15:30:00', 'Gates B01', 'Lecture', 'UTC'),
    (target_user_id, course_id_3, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '90 days', ARRAY[5], '11:00:00', '12:30:00', 'Nvidia Aud', 'Lecture', 'UTC')
    ON CONFLICT DO NOTHING;

    -- 3. Create Course Schedules (Specific Tasks from AI Scraper)
    INSERT INTO course_schedules (course_id, schedule_date, task_title, task_kind, focus, duration_minutes, source) VALUES
    (course_id_1, CURRENT_DATE, 'Lecture 12: Dynamic Programming', 'lecture', 'Memoization and Subproblems', 90, 'ai_course_intel'),
    (course_id_1, CURRENT_DATE + INTERVAL '2 days', 'Lecture 13: Dijkstra Algorithm', 'lecture', 'Shortest Paths', 90, 'ai_course_intel'),
    (course_id_2, CURRENT_DATE + INTERVAL '1 day', 'Lecture 8: Recursion', 'lecture', 'Base cases', 75, 'ai_course_intel'),
    (course_id_2, CURRENT_DATE - INTERVAL '1 day', 'Midterm Review Session', 'other', 'Practice Exams', 120, 'ai_course_intel')
    ON CONFLICT DO NOTHING;

    -- 4. Create Course Assignments (Deadlines)
    INSERT INTO course_assignments (course_id, label, kind, due_on, description) VALUES
    (course_id_1, 'PSet 4: Graphs', 'assignment', CURRENT_DATE + INTERVAL '3 days', 'Implement DFS and BFS'),
    (course_id_2, 'HW 2: ADTs', 'assignment', CURRENT_DATE + INTERVAL '5 days', 'Working with Stacks and Queues'),
    (course_id_3, 'Project Proposal', 'project', CURRENT_DATE + INTERVAL '10 days', 'Submit your ML project idea')
    ON CONFLICT DO NOTHING;

    -- 5. Mark some items as completed in study_logs
    -- For recurring plan from 6.006 (Monday)
    INSERT INTO study_logs (user_id, plan_id, log_date, is_completed)
    SELECT target_user_id, id, CURRENT_DATE - INTERVAL '4 days', true
    FROM study_plans WHERE user_id = target_user_id AND course_id = course_id_1 LIMIT 1;

    -- For a specific schedule task
    INSERT INTO study_logs (user_id, course_schedule_id, log_date, is_completed)
    SELECT target_user_id, id, schedule_date, true
    FROM course_schedules WHERE course_id = course_id_2 AND schedule_date < CURRENT_DATE LIMIT 1;

END $$;
