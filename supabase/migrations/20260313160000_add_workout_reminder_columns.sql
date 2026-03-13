alter table public.user_workouts
  add column if not exists reminder_message_id text,
  add column if not exists reminder_scheduled_for timestamptz,
  add column if not exists reminder_sent_at timestamptz;

create index if not exists user_workouts_reminder_message_id_idx
on public.user_workouts(reminder_message_id)
where reminder_message_id is not null;

create index if not exists user_workouts_reminder_scheduled_for_idx
on public.user_workouts(reminder_scheduled_for)
where reminder_scheduled_for is not null;
