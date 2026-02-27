INSERT INTO public.ai_model_pricing (provider, model, input_per_token, output_per_token, is_active) VALUES
  ('openai', 'gpt-5.1-chat-latest',      0.0000000000, 0.0000000000, true),
  ('openai', 'gpt-5-mini',               0.0000000000, 0.0000000000, true),
  ('gemini', 'gemini-2.5-pro',           0.0000000000, 0.0000000000, true),
  ('gemini', 'gemini-3-flash-preview',   0.0000000000, 0.0000000000, true),
  ('gemini', 'gemini-3.1-pro-preview',   0.0000000000, 0.0000000000, true)
ON CONFLICT (provider, model)
DO UPDATE SET
  is_active = EXCLUDED.is_active,
  updated_at = now();
