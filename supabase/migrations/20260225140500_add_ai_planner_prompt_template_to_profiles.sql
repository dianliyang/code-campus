ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_planner_prompt_template text;
