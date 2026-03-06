create table if not exists public.user_workouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id bigint not null references public.workouts(id) on delete cascade,
  status text not null default 'enrolled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, workout_id)
);

alter table public.user_workouts enable row level security;

create policy if not exists "Users can read own workout enrollments"
on public.user_workouts
for select
to authenticated
using (auth.uid() = user_id);

create policy if not exists "Users can insert own workout enrollments"
on public.user_workouts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy if not exists "Users can update own workout enrollments"
on public.user_workouts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "Users can delete own workout enrollments"
on public.user_workouts
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists user_workouts_user_id_idx on public.user_workouts(user_id);
create index if not exists user_workouts_workout_id_idx on public.user_workouts(workout_id);
