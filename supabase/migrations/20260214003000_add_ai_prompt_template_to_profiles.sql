-- Add per-user custom prompt template for course description generation.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_prompt_template TEXT;
