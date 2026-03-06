-- Allow nullable plan_id and add course_schedule_id to study_logs to track completion of specific tasks
ALTER TABLE public.study_logs
ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE public.study_logs
ADD COLUMN IF NOT EXISTS course_schedule_id BIGINT REFERENCES public.course_schedules(id) ON DELETE CASCADE;

-- Update unique constraint to handle both recurring plans and one-off tasks
-- But wait, UNIQUE constraint can't easily handle both if one is null.
-- Actually, UNIQUE(user_id, plan_id, log_date) where plan_id is null might work if we have another constraint.

ALTER TABLE public.study_logs DROP CONSTRAINT IF EXISTS study_logs_plan_id_log_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_logs_plan_instance
ON public.study_logs (user_id, plan_id, log_date)
WHERE plan_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_logs_task_instance
ON public.study_logs (user_id, course_schedule_id)
WHERE course_schedule_id IS NOT NULL;

-- Also add course_assignment_id while we are at it, for full "mark complete" support
ALTER TABLE public.study_logs
ADD COLUMN IF NOT EXISTS course_assignment_id BIGINT REFERENCES public.course_assignments(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_logs_assignment_instance
ON public.study_logs (user_id, course_assignment_id)
WHERE course_assignment_id IS NOT NULL;
