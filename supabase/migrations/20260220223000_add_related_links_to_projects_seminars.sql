ALTER TABLE public.projects_seminars
  ADD COLUMN IF NOT EXISTS related_links TEXT[] DEFAULT '{}'::text[];
