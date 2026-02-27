ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_syllabus_prompt_template TEXT;
