-- Enable postgres_changes Realtime on scraper_jobs for AI sync activity streams.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scraper_jobs'
  ) then
    alter publication supabase_realtime add table public.scraper_jobs;
  end if;
end
$$;

