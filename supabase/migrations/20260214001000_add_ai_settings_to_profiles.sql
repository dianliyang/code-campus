-- Add per-user AI preferences for model selection and web search behavior.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_default_model TEXT NOT NULL DEFAULT 'sonar',
  ADD COLUMN IF NOT EXISTS ai_web_search_enabled BOOLEAN NOT NULL DEFAULT FALSE;
