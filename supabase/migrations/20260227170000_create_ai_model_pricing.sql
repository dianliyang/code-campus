CREATE TABLE IF NOT EXISTS public.ai_model_pricing (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider    TEXT NOT NULL,
  model       TEXT NOT NULL,
  input_per_token  NUMERIC(20, 10) NOT NULL DEFAULT 0,
  output_per_token NUMERIC(20, 10) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, model)
);

INSERT INTO public.ai_model_pricing (provider, model, input_per_token, output_per_token, is_active) VALUES
  ('perplexity', 'sonar',               0.000000001,  0.000000001,  true),
  ('perplexity', 'sonar-pro',           0.000000003,  0.000000015,  true),
  ('perplexity', 'sonar-reasoning',     0.000000001,  0.000000005,  true),
  ('gemini',     'gemini-2.5-flash',    0.0000000001, 0.0000000004, true),
  ('gemini',     'gemini-2.0-flash',    0.0000000001, 0.0000000004, true)
ON CONFLICT (provider, model) DO NOTHING;
