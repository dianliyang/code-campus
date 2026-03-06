-- Create a function to get a unified, expanded, and deduplicated user schedule
CREATE OR REPLACE FUNCTION get_user_schedule(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  event_date DATE,
  course_id BIGINT,
  title TEXT,
  course_code TEXT,
  university TEXT,
  kind TEXT,
  start_time TIME,
  end_time TIME,
  location TEXT,
  is_completed BOOLEAN,
  plan_id BIGINT,
  schedule_id BIGINT,
  assignment_id BIGINT,
  workout_id BIGINT,
  source_type TEXT -- 'study_plan' or 'workout'
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH enrolled_courses AS (
    SELECT uc.course_id, c.course_code, c.university, c.title as course_title, c.credit
    FROM user_courses uc
    JOIN courses c ON c.id = uc.course_id
    WHERE uc.user_id = p_user_id AND uc.status != 'hidden'
  ),
  user_enrolled_workouts AS (
    SELECT uw.workout_id, w.title, w.title_en, w.category, w.category_en, w.source, w.day_of_week, w.start_date, w.end_date, w.start_time, w.end_time, w.location, w.location_en
    FROM user_workouts uw
    JOIN workouts w ON w.id = uw.workout_id
    WHERE uw.user_id = p_user_id
  ),
  -- 1. Expand recurring study plans
  expanded_plans AS (
    SELECT 
      d.date::DATE as event_date,
      sp.course_id,
      ec.course_title as title,
      ec.course_code,
      ec.university,
      sp.kind,
      sp.start_time,
      sp.end_time,
      sp.location,
      sp.id as plan_id,
      NULL::BIGINT as schedule_id,
      NULL::BIGINT as assignment_id,
      NULL::BIGINT as workout_id,
      'study_plan' as source_type
    FROM study_plans sp
    JOIN enrolled_courses ec ON ec.course_id = sp.course_id
    CROSS JOIN LATERAL generate_series(
      GREATEST(sp.start_date, p_start_date),
      LEAST(sp.end_date, p_end_date),
      '1 day'::interval
    ) d(date)
    WHERE sp.user_id = p_user_id
    AND extract(dow from d.date) = ANY(sp.days_of_week)
  ),
  -- 2. Specific course schedules (Tasks)
  tasks AS (
    SELECT 
      cs.schedule_date as event_date,
      cs.course_id,
      cs.task_title as title,
      ec.course_code,
      ec.university,
      COALESCE(cs.task_kind, 'task') as kind,
      '10:00:00'::TIME as start_time,
      ('10:00:00'::TIME + (COALESCE(cs.duration_minutes, 60) || ' minutes')::interval)::TIME as end_time,
      cs.focus as location,
      NULL::BIGINT as plan_id,
      cs.id as schedule_id,
      NULL::BIGINT as assignment_id,
      NULL::BIGINT as workout_id,
      'study_plan' as source_type
    FROM course_schedules cs
    JOIN enrolled_courses ec ON ec.course_id = cs.course_id
    WHERE cs.schedule_date >= p_start_date AND cs.schedule_date <= p_end_date
  ),
  -- 3. Assignments (Deadlines)
  deadlines AS (
    SELECT 
      ca.due_on as event_date,
      ca.course_id,
      ca.label as title,
      ec.course_code,
      ec.university,
      ca.kind,
      '23:59:59'::TIME as start_time,
      '23:59:59'::TIME as end_time,
      NULL as location,
      NULL::BIGINT as plan_id,
      NULL::BIGINT as schedule_id,
      ca.id as assignment_id,
      NULL::BIGINT as workout_id,
      'study_plan' as source_type
    FROM course_assignments ca
    JOIN enrolled_courses ec ON ec.course_id = ca.course_id
    WHERE ca.due_on >= p_start_date AND ca.due_on <= p_end_date
  ),
  -- 4. Workouts
  expanded_workouts AS (
    SELECT 
      d.date::DATE as event_date,
      NULL::BIGINT as course_id,
      COALESCE(w.title_en, w.title) as title,
      COALESCE(w.category_en, w.category, 'Workout') as course_code,
      COALESCE(w.source, 'Workout') as university,
      'workout' as kind,
      w.start_time,
      w.end_time,
      COALESCE(w.location_en, w.location) as location,
      NULL::BIGINT as plan_id,
      NULL::BIGINT as schedule_id,
      NULL::BIGINT as assignment_id,
      w.workout_id as workout_id,
      'workout' as source_type
    FROM user_enrolled_workouts w
    CROSS JOIN LATERAL generate_series(
      GREATEST(COALESCE(w.start_date, p_start_date), p_start_date),
      LEAST(COALESCE(w.end_date, p_end_date), p_end_date),
      '1 day'::interval
    ) d(date)
    WHERE (
      CASE lower(w.day_of_week)
        WHEN 'sunday' THEN 0 WHEN 'sun' THEN 0
        WHEN 'monday' THEN 1 WHEN 'mon' THEN 1
        WHEN 'tuesday' THEN 2 WHEN 'tue' THEN 2
        WHEN 'wednesday' THEN 3 WHEN 'wed' THEN 3
        WHEN 'thursday' THEN 4 WHEN 'thu' THEN 4
        WHEN 'friday' THEN 5 WHEN 'fri' THEN 5
        WHEN 'saturday' THEN 6 WHEN 'sat' THEN 6
        ELSE -1
      END
    ) = extract(dow from d.date)
  ),
  -- Union all sources
  all_events AS (
    SELECT * FROM expanded_plans
    UNION ALL
    SELECT * FROM tasks
    UNION ALL
    SELECT * FROM deadlines
    UNION ALL
    SELECT * FROM expanded_workouts
  )
  -- Deduplicate and join with logs
  SELECT 
    ae.event_date,
    ae.course_id,
    ae.title,
    ae.course_code,
    ae.university,
    MAX(ae.kind) as kind,
    ae.start_time,
    MAX(ae.end_time) as end_time,
    MAX(ae.location) as location,
    COALESCE(
      bool_or(sl.is_completed) OR bool_or(uwl.is_attended), 
      false
    ) as is_completed,
    MAX(ae.plan_id) as plan_id,
    MAX(ae.schedule_id) as schedule_id,
    MAX(ae.assignment_id) as assignment_id,
    MAX(ae.workout_id) as workout_id,
    ae.source_type
  FROM all_events ae
  LEFT JOIN study_logs sl ON sl.user_id = p_user_id 
    AND (
      (sl.plan_id = ae.plan_id AND sl.log_date = ae.event_date) OR
      (sl.course_schedule_id = ae.schedule_id) OR
      (sl.course_assignment_id = ae.assignment_id)
    )
  LEFT JOIN user_workout_logs uwl ON uwl.user_id = p_user_id
    AND uwl.workout_id = ae.workout_id
    AND uwl.log_date = ae.event_date
  GROUP BY ae.event_date, ae.course_id, ae.title, ae.course_code, ae.university, ae.source_type, ae.start_time
  ORDER BY ae.event_date, ae.start_time;
END;
$$;
