ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ai_provider_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ai_provider_check
  CHECK (ai_provider IN ('perplexity', 'gemini', 'openai'));
