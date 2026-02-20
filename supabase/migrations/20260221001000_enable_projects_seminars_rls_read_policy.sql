ALTER TABLE public.projects_seminars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view projects_seminars" ON public.projects_seminars;

CREATE POLICY "Anyone can view projects_seminars"
ON public.projects_seminars
FOR SELECT
USING (true);
