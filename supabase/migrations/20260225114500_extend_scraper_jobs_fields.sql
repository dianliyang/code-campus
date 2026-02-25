ALTER TABLE public.scraper_jobs
  ADD COLUMN IF NOT EXISTS semester TEXT,
  ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'courses',
  ADD COLUMN IF NOT EXISTS triggered_by TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS triggered_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS force_update BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scraper_jobs_job_type_check'
  ) THEN
    ALTER TABLE public.scraper_jobs
      ADD CONSTRAINT scraper_jobs_job_type_check
      CHECK (job_type IN ('courses', 'workouts'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scraper_jobs_triggered_by_check'
  ) THEN
    ALTER TABLE public.scraper_jobs
      ADD CONSTRAINT scraper_jobs_triggered_by_check
      CHECK (triggered_by IN ('manual', 'script', 'cron', 'api'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scraper_jobs_university_created
  ON public.scraper_jobs (university, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scraper_jobs_triggered_by_created
  ON public.scraper_jobs (triggered_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scraper_jobs_job_type_created
  ON public.scraper_jobs (job_type, created_at DESC);

