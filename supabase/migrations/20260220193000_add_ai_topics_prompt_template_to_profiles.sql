ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_topics_prompt_template TEXT;

