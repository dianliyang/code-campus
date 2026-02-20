CREATE TABLE IF NOT EXISTS public.user_projects_seminars (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_seminar_id BIGINT NOT NULL REFERENCES public.projects_seminars(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'in_progress',
  progress INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, project_seminar_id)
);

ALTER TABLE public.user_projects_seminars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project seminars" ON public.user_projects_seminars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project seminars" ON public.user_projects_seminars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project seminars" ON public.user_projects_seminars
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project seminars" ON public.user_projects_seminars
  FOR DELETE USING (auth.uid() = user_id);
