-- Update model catalog to latest OpenAI/Gemini pricing.
-- Prices stored as USD per token (USD per 1M tokens / 1,000,000).
-- Notes:
-- - OpenAI prices from https://openai.com/api/pricing and model docs.
-- - Gemini prices use standard paid-tier <=200k prompt token rates from https://ai.google.dev/pricing.
-- - This schema has one input/output price per model; it cannot represent long-context/audio/batch variants.

INSERT INTO public.ai_model_pricing (provider, model, input_per_token, output_per_token, is_active) VALUES
  -- OpenAI (latest)
  ('openai', 'gpt-5.2',               0.00000175, 0.00001400, true),
  ('openai', 'gpt-5.2-chat-latest',   0.00000175, 0.00001400, true),
  ('openai', 'gpt-5-mini',            0.00000025, 0.00000200, true),
  ('openai', 'gpt-5-nano',            0.00000005, 0.00000040, true),

  -- Gemini (standard paid tier, <=200k prompt size)
  ('gemini', 'gemini-2.5-pro',        0.00000125, 0.00001000, true),
  ('gemini', 'gemini-3-flash-preview',0.00000050, 0.00000300, true),
  ('gemini', 'gemini-3-pro-preview',  0.00000200, 0.00001200, true),
  -- Keep compatibility for existing configured model ids.
  ('gemini', 'gemini-3.1-pro-preview',0.00000200, 0.00001200, true)
ON CONFLICT (provider, model)
DO UPDATE SET
  input_per_token = EXCLUDED.input_per_token,
  output_per_token = EXCLUDED.output_per_token,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Deactivate older OpenAI catalog rows so settings only show the latest set.
UPDATE public.ai_model_pricing
SET is_active = false,
    updated_at = now()
WHERE provider = 'openai'
  AND model NOT IN ('gpt-5.2', 'gpt-5.2-chat-latest', 'gpt-5-mini', 'gpt-5-nano');
