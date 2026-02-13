-- Add per-user AI provider selection.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'perplexity';
