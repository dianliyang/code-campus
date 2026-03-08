DO $$
DECLARE
  source_plan RECORD;
  weekday_value INTEGER;
  replacement_plan_id INTEGER;
BEGIN
  FOR source_plan IN
    SELECT *
    FROM public.study_plans
    WHERE cardinality(days_of_week) > 1
    ORDER BY id
  LOOP
    FOR weekday_value IN
      SELECT unnest(source_plan.days_of_week)
    LOOP
      INSERT INTO public.study_plans (
        user_id,
        course_id,
        start_date,
        end_date,
        days_of_week,
        start_time,
        end_time,
        location,
        kind,
        timezone,
        created_at,
        updated_at
      )
      VALUES (
        source_plan.user_id,
        source_plan.course_id,
        source_plan.start_date,
        source_plan.end_date,
        ARRAY[weekday_value],
        source_plan.start_time,
        source_plan.end_time,
        source_plan.location,
        source_plan.kind,
        COALESCE(source_plan.timezone, 'UTC'),
        source_plan.created_at,
        source_plan.updated_at
      )
      RETURNING id INTO replacement_plan_id;

      UPDATE public.study_logs
      SET
        plan_id = replacement_plan_id,
        updated_at = NOW()
      WHERE plan_id = source_plan.id
        AND EXTRACT(DOW FROM log_date)::INTEGER = weekday_value;
    END LOOP;

    DELETE FROM public.study_plans
    WHERE id = source_plan.id;
  END LOOP;
END $$;

ALTER TABLE public.study_plans
  DROP CONSTRAINT IF EXISTS study_plans_single_day_check;

ALTER TABLE public.study_plans
  ADD CONSTRAINT study_plans_single_day_check
  CHECK (cardinality(days_of_week) = 1);
