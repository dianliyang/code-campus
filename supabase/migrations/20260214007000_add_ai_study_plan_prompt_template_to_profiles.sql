ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_study_plan_prompt_template TEXT;
