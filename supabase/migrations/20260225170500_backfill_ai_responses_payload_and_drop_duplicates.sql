-- 1) Backfill response_payload from legacy columns when missing
UPDATE public.ai_responses
SET response_payload = COALESCE(
  response_payload,
  CASE
    WHEN response IS NOT NULL THEN response
    WHEN response_text IS NOT NULL AND btrim(response_text) <> '' THEN jsonb_build_object('text', response_text)
    ELSE '{}'::jsonb
  END
)
WHERE response_payload IS NULL
   OR response_payload = '{}'::jsonb;

-- 2) Optional cleanup: drop duplicate legacy columns after code no longer reads them.
ALTER TABLE public.ai_responses
  DROP COLUMN IF EXISTS response,
  DROP COLUMN IF EXISTS response_text;
