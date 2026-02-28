ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ai_provider_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ai_provider_check
  CHECK (ai_provider IN ('perplexity', 'gemini', 'openai', 'vertex'));

INSERT INTO public.ai_model_pricing (provider, model, input_per_token, output_per_token, is_active) VALUES
  ('vertex', 'gemini-2.5-pro',   0.00000125, 0.00001000, true),
  ('vertex', 'gemini-2.5-flash', 0.00000050, 0.00000300, true)
ON CONFLICT (provider, model)
DO UPDATE SET
  input_per_token = EXCLUDED.input_per_token,
  output_per_token = EXCLUDED.output_per_token,
  is_active = EXCLUDED.is_active,
  updated_at = now();
